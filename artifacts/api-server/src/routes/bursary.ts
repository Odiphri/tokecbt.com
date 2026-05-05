import { Router, type IRouter } from "express";
import { db, paymentsTable, overridesTable, studentsTable, feeTypesTable, studentFeeRecordsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { z } from "zod";

const router: IRouter = Router();

// ─── Permission helper ─────────────────────────────────────────────────────────
function canManageBursary(req: Express.Request): boolean {
  return req.user?.role === "admin" || !!req.user?.permissions?.manage_bursary;
}

// ─── Zod schemas ──────────────────────────────────────────────────────────────
const UpdatePaymentBody = z.object({
  status: z.enum(["paid", "unpaid", "partial"]),
  amountPaid: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

const CreateOverrideBody = z.object({
  studentReg: z.string().min(1),
  examId: z.string().optional(),
  reason: z.string().min(1),
  expiresAt: z.string().optional(),
});

const CreateFeeTypeBody = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  amount: z.number().int().min(0),
  isMandatory: z.boolean().default(true),
  academicYear: z.string().default(""),
});

const UpdateFeeRecordBody = z.object({
  amountPaid: z.number().int().min(0),
  status: z.enum(["paid", "unpaid", "partial", "waived"]),
  notes: z.string().optional(),
  dueDate: z.string().optional(),
});

// ─── Legacy single-payment status (kept for backward compat) ──────────────────
router.get("/admin/bursary", requireAuth, requireRole("admin", "staff"), async (req, res): Promise<void> => {
  if (!canManageBursary(req)) {
    res.status(403).json({ error: "Access denied — bursary management permission required" });
    return;
  }
  const students = await db.select().from(studentsTable).orderBy(studentsTable.name);
  const payments = await db.select().from(paymentsTable);
  const paymentMap = new Map(payments.map(p => [p.studentReg, p]));

  res.json(students.map(s => {
    const payment = paymentMap.get(s.regNumber);
    return {
      regNumber: s.regNumber,
      name: s.name,
      class: s.class,
      paymentStatus: payment?.status ?? "unpaid",
      amountPaid: payment?.amountPaid ?? 0,
      notes: payment?.notes ?? null,
      updatedBy: payment?.updatedBy ?? null,
      updatedAt: payment?.updatedAt?.toISOString() ?? null,
    };
  }));
});

router.put("/admin/bursary/:studentReg", requireAuth, requireRole("admin", "staff"), async (req, res): Promise<void> => {
  if (!canManageBursary(req)) {
    res.status(403).json({ error: "Access denied — bursary management permission required" });
    return;
  }
  const studentReg = req.params.studentReg as string;
  const body = UpdatePaymentBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.regNumber, studentReg));
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  const [existing] = await db.select().from(paymentsTable).where(eq(paymentsTable.studentReg, studentReg));

  if (existing) {
    await db.update(paymentsTable).set({
      status: body.data.status,
      amountPaid: body.data.amountPaid ?? existing.amountPaid,
      notes: body.data.notes ?? existing.notes,
      updatedBy: req.user!.name ?? req.user!.id,
      updatedAt: new Date(),
    }).where(eq(paymentsTable.studentReg, studentReg));
  } else {
    await db.insert(paymentsTable).values({
      studentReg,
      status: body.data.status,
      amountPaid: body.data.amountPaid ?? 0,
      notes: body.data.notes ?? null,
      updatedBy: req.user!.name ?? req.user!.id,
    });
  }

  res.json({ success: true, message: "Payment status updated" });
});

// ─── Overrides ────────────────────────────────────────────────────────────────
router.get("/admin/bursary/overrides", requireAuth, requireRole("admin", "staff"), async (req, res): Promise<void> => {
  if (!canManageBursary(req)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  const overrides = await db.select().from(overridesTable).orderBy(desc(overridesTable.createdAt));
  res.json(overrides.map(o => ({
    id: o.id,
    studentReg: o.studentReg,
    examId: o.examId ?? null,
    overriddenBy: o.overriddenBy,
    overriderRole: o.overriderRole,
    reason: o.reason,
    expiresAt: o.expiresAt?.toISOString() ?? null,
    createdAt: o.createdAt.toISOString(),
  })));
});

function canCreateOverride(user: Express.Request["user"]): boolean {
  return user?.role === "admin" || !!user?.permissions?.override_exam_access;
}

router.post("/teacher/bursary/override", requireAuth, requireRole("staff", "admin"), async (req, res): Promise<void> => {
  if (!canCreateOverride(req.user)) {
    res.status(403).json({ error: "You do not have permission to create exam access overrides" });
    return;
  }

  const body = CreateOverrideBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const user = req.user!;
  const [override] = await db.insert(overridesTable).values({
    studentReg: body.data.studentReg,
    examId: body.data.examId ?? null,
    overriddenBy: String(user.name ?? user.id),
    overriderRole: String(user.staffRole ?? user.role),
    reason: body.data.reason,
    expiresAt: body.data.expiresAt ? new Date(body.data.expiresAt) : null,
  }).returning();

  res.status(201).json({
    id: override.id,
    studentReg: override.studentReg,
    examId: override.examId ?? null,
    overriddenBy: override.overriddenBy,
    overriderRole: override.overriderRole,
    reason: override.reason,
    expiresAt: override.expiresAt?.toISOString() ?? null,
    createdAt: override.createdAt.toISOString(),
  });
});

router.delete("/admin/bursary/overrides/:id", requireAuth, requireRole("admin", "staff"), async (req, res): Promise<void> => {
  if (!canManageBursary(req)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid override ID" });
    return;
  }
  await db.delete(overridesTable).where(eq(overridesTable.id, id));
  res.json({ success: true });
});

// ─── Fee Types (structure) ─────────────────────────────────────────────────────
router.get("/admin/bursary/fees", requireAuth, requireRole("admin", "staff"), async (req, res): Promise<void> => {
  if (!canManageBursary(req)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  const fees = await db.select().from(feeTypesTable).orderBy(feeTypesTable.createdAt);
  res.json(fees);
});

router.post("/admin/bursary/fees", requireAuth, requireRole("admin", "staff"), async (req, res): Promise<void> => {
  if (!canManageBursary(req)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  const body = CreateFeeTypeBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [fee] = await db.insert(feeTypesTable).values({
    name: body.data.name,
    description: body.data.description ?? null,
    amount: body.data.amount,
    isMandatory: body.data.isMandatory,
    academicYear: body.data.academicYear,
    createdBy: req.user!.name ?? req.user!.id,
  }).returning();
  res.status(201).json(fee);
});

router.put("/admin/bursary/fees/:id", requireAuth, requireRole("admin", "staff"), async (req, res): Promise<void> => {
  if (!canManageBursary(req)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid fee ID" }); return; }

  const body = CreateFeeTypeBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  await db.update(feeTypesTable).set({
    name: body.data.name,
    description: body.data.description ?? null,
    amount: body.data.amount,
    isMandatory: body.data.isMandatory,
    academicYear: body.data.academicYear,
  }).where(eq(feeTypesTable.id, id));

  res.json({ success: true });
});

router.delete("/admin/bursary/fees/:id", requireAuth, requireRole("admin", "staff"), async (req, res): Promise<void> => {
  if (!canManageBursary(req)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid fee ID" }); return; }
  await db.delete(feeTypesTable).where(eq(feeTypesTable.id, id));
  res.json({ success: true });
});

// Apply a fee type to ALL students (creates student_fee_records where missing)
router.post("/admin/bursary/fees/:id/apply", requireAuth, requireRole("admin", "staff"), async (req, res): Promise<void> => {
  if (!canManageBursary(req)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid fee ID" }); return; }

  const [feeType] = await db.select().from(feeTypesTable).where(eq(feeTypesTable.id, id));
  if (!feeType) { res.status(404).json({ error: "Fee type not found" }); return; }

  const students = await db.select().from(studentsTable);
  const existingRecords = await db.select().from(studentFeeRecordsTable).where(eq(studentFeeRecordsTable.feeTypeId, id));
  const existingRegs = new Set(existingRecords.map(r => r.studentReg));

  const toInsert = students
    .filter(s => !existingRegs.has(s.regNumber))
    .map(s => ({
      studentReg: s.regNumber,
      feeTypeId: id,
      amountDue: feeType.amount,
      amountPaid: 0,
      status: "unpaid" as const,
    }));

  if (toInsert.length > 0) {
    await db.insert(studentFeeRecordsTable).values(toInsert);
  }

  res.json({ success: true, applied: toInsert.length, alreadyExisted: existingRegs.size });
});

// ─── Student Fee Records (per-student breakdown) ───────────────────────────────
router.get("/admin/bursary/student-fees", requireAuth, requireRole("admin", "staff"), async (req, res): Promise<void> => {
  if (!canManageBursary(req)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  const students = await db.select().from(studentsTable).orderBy(studentsTable.name);
  const feeTypes = await db.select().from(feeTypesTable);
  const records = await db.select().from(studentFeeRecordsTable);

  const feeTypeMap = new Map(feeTypes.map(f => [f.id, f]));

  const result = students.map(s => {
    const studentRecords = records.filter(r => r.studentReg === s.regNumber);
    const totalDue = studentRecords.reduce((sum, r) => sum + r.amountDue, 0);
    const totalPaid = studentRecords.reduce((sum, r) => sum + r.amountPaid, 0);
    return {
      regNumber: s.regNumber,
      name: s.name,
      class: s.class,
      totalDue,
      totalPaid,
      balance: totalDue - totalPaid,
      fees: studentRecords.map(r => ({
        id: r.id,
        feeTypeId: r.feeTypeId,
        feeName: feeTypeMap.get(r.feeTypeId)?.name ?? "Unknown",
        amountDue: r.amountDue,
        amountPaid: r.amountPaid,
        status: r.status,
        dueDate: r.dueDate ?? null,
        notes: r.notes ?? null,
        updatedBy: r.updatedBy ?? null,
        updatedAt: r.updatedAt.toISOString(),
      })),
    };
  });

  res.json(result);
});

router.put("/admin/bursary/student-fees/:id", requireAuth, requireRole("admin", "staff"), async (req, res): Promise<void> => {
  if (!canManageBursary(req)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid record ID" }); return; }

  const body = UpdateFeeRecordBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  await db.update(studentFeeRecordsTable).set({
    amountPaid: body.data.amountPaid,
    status: body.data.status,
    notes: body.data.notes ?? null,
    dueDate: body.data.dueDate ?? null,
    updatedBy: req.user!.name ?? req.user!.id,
    updatedAt: new Date(),
  }).where(eq(studentFeeRecordsTable.id, id));

  res.json({ success: true });
});

// ─── Student: view own fees ────────────────────────────────────────────────────
router.get("/student/bursary", requireAuth, requireRole("student"), async (req, res): Promise<void> => {
  const studentReg = req.user!.id;
  const records = await db.select().from(studentFeeRecordsTable).where(eq(studentFeeRecordsTable.studentReg, studentReg));
  const feeTypes = await db.select().from(feeTypesTable);
  const feeTypeMap = new Map(feeTypes.map(f => [f.id, f]));

  const legacyPayment = await db.select().from(paymentsTable).where(eq(paymentsTable.studentReg, studentReg));

  const fees = records.map(r => ({
    id: r.id,
    feeName: feeTypeMap.get(r.feeTypeId)?.name ?? "Unknown",
    description: feeTypeMap.get(r.feeTypeId)?.description ?? null,
    isMandatory: feeTypeMap.get(r.feeTypeId)?.isMandatory ?? true,
    academicYear: feeTypeMap.get(r.feeTypeId)?.academicYear ?? "",
    amountDue: r.amountDue,
    amountPaid: r.amountPaid,
    balance: r.amountDue - r.amountPaid,
    status: r.status,
    dueDate: r.dueDate ?? null,
    notes: r.notes ?? null,
    updatedAt: r.updatedAt.toISOString(),
  }));

  const totalDue = fees.reduce((s, f) => s + f.amountDue, 0);
  const totalPaid = fees.reduce((s, f) => s + f.amountPaid, 0);
  const legacyStatus = legacyPayment[0]?.status ?? null;

  res.json({ fees, totalDue, totalPaid, balance: totalDue - totalPaid, legacyStatus });
});

export default router;
