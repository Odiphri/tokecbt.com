import { Router, type IRouter } from "express";
import { db, paymentsTable, overridesTable, studentsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { z } from "zod";

const router: IRouter = Router();

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

router.get("/admin/bursary", requireAuth, requireRole("admin"), async (_req, res): Promise<void> => {
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

router.put("/admin/bursary/:studentReg", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
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

router.get("/admin/bursary/overrides", requireAuth, requireRole("admin"), async (_req, res): Promise<void> => {
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

router.delete("/admin/bursary/overrides/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid override ID" });
    return;
  }
  await db.delete(overridesTable).where(eq(overridesTable.id, id));
  res.json({ success: true });
});

export default router;
