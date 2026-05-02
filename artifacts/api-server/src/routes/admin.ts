import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, studentsTable, teachersTable, examsTable, resultsTable, DEFAULT_PERMISSIONS_BY_ROLE } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import {
  CreateAdminStudentBody,
  UpdateAdminStudentBody,
  GetAdminStudentParams,
  UpdateAdminStudentParams,
  DeleteAdminStudentParams,
  CreateAdminStaffBody,
  UpdateAdminStaffMemberBody,
  GetAdminStaffMemberParams,
  UpdateAdminStaffMemberParams,
  DeleteAdminStaffMemberParams,
  DeleteAdminExamParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.use("/admin", requireAuth, requireRole("admin"));

// ─── Stats ───────────────────────────────────────────────────────────────────

router.get("/admin/stats", async (_req, res): Promise<void> => {
  const [{ totalStudents }] = await db.select({ totalStudents: sql<number>`cast(count(*) as int)` }).from(studentsTable);
  const [{ totalStaff }] = await db.select({ totalStaff: sql<number>`cast(count(*) as int)` }).from(teachersTable);
  const [{ totalExams }] = await db.select({ totalExams: sql<number>`cast(count(*) as int)` }).from(examsTable);
  const [{ totalResults }] = await db.select({ totalResults: sql<number>`cast(count(*) as int)` }).from(resultsTable);

  res.json({
    totalStudents: totalStudents ?? 0,
    totalStaff: totalStaff ?? 0,
    totalExams: totalExams ?? 0,
    totalResults: totalResults ?? 0,
  });
});

// ─── Students ────────────────────────────────────────────────────────────────

router.get("/admin/students", async (_req, res): Promise<void> => {
  const students = await db.select().from(studentsTable).orderBy(studentsTable.name);
  res.json(students.map(s => ({
    regNumber: s.regNumber,
    name: s.name,
    class: s.class,
    isDefaultPassword: s.isDefaultPassword,
  })));
});

router.post("/admin/students", async (req, res): Promise<void> => {
  const parsed = CreateAdminStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(studentsTable).where(eq(studentsTable.regNumber, parsed.data.regNumber));
  if (existing) {
    res.status(409).json({ error: "A student with this ID already exists" });
    return;
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const [student] = await db.insert(studentsTable).values({
    regNumber: parsed.data.regNumber,
    name: parsed.data.name,
    class: parsed.data.class,
    passwordHash,
    isDefaultPassword: true,
  }).returning();

  res.status(201).json({
    regNumber: student.regNumber,
    name: student.name,
    class: student.class,
    isDefaultPassword: student.isDefaultPassword,
  });
});

router.get("/admin/students/:regNumber", async (req, res): Promise<void> => {
  const params = GetAdminStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.regNumber, params.data.regNumber));
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  res.json({
    regNumber: student.regNumber,
    name: student.name,
    class: student.class,
    isDefaultPassword: student.isDefaultPassword,
  });
});

router.put("/admin/students/:regNumber", async (req, res): Promise<void> => {
  const params = UpdateAdminStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateAdminStudentBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [existing] = await db.select().from(studentsTable).where(eq(studentsTable.regNumber, params.data.regNumber));
  if (!existing) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  const updateValues: Record<string, unknown> = {
    name: body.data.name,
    class: body.data.class,
  };

  if (body.data.resetPassword) {
    const newPass = body.data.password || "12345";
    updateValues.passwordHash = await bcrypt.hash(newPass, 10);
    updateValues.isDefaultPassword = true;
  } else if (body.data.password) {
    updateValues.passwordHash = await bcrypt.hash(body.data.password, 10);
  }

  const [student] = await db
    .update(studentsTable)
    .set(updateValues)
    .where(eq(studentsTable.regNumber, params.data.regNumber))
    .returning();

  res.json({
    regNumber: student.regNumber,
    name: student.name,
    class: student.class,
    isDefaultPassword: student.isDefaultPassword,
  });
});

router.delete("/admin/students/:regNumber", async (req, res): Promise<void> => {
  const params = DeleteAdminStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db.select().from(studentsTable).where(eq(studentsTable.regNumber, params.data.regNumber));
  if (!existing) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  await db.delete(studentsTable).where(eq(studentsTable.regNumber, params.data.regNumber));
  res.json({ success: true, message: "Student deleted" });
});

// ─── Staff ───────────────────────────────────────────────────────────────────

router.get("/admin/staff", async (_req, res): Promise<void> => {
  const staff = await db.select().from(teachersTable).orderBy(teachersTable.name);
  res.json(staff.map(t => ({
    staffId: t.teacherId,
    name: t.name,
    subject: t.subject,
    staffRole: t.staffRole,
    permissions: t.permissions,
  })));
});

router.post("/admin/staff", async (req, res): Promise<void> => {
  const parsed = CreateAdminStaffBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(teachersTable).where(eq(teachersTable.teacherId, parsed.data.staffId));
  if (existing) {
    res.status(409).json({ error: "A staff member with this ID already exists" });
    return;
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const permissions = parsed.data.permissions ?? DEFAULT_PERMISSIONS_BY_ROLE[parsed.data.staffRole as keyof typeof DEFAULT_PERMISSIONS_BY_ROLE] ?? DEFAULT_PERMISSIONS_BY_ROLE.teacher;

  const [staff] = await db.insert(teachersTable).values({
    teacherId: parsed.data.staffId,
    name: parsed.data.name,
    subject: parsed.data.subject,
    passwordHash,
    staffRole: parsed.data.staffRole,
    permissions,
  }).returning();

  res.status(201).json({
    staffId: staff.teacherId,
    name: staff.name,
    subject: staff.subject,
    staffRole: staff.staffRole,
    permissions: staff.permissions,
  });
});

router.get("/admin/staff/:staffId", async (req, res): Promise<void> => {
  const params = GetAdminStaffMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [staff] = await db.select().from(teachersTable).where(eq(teachersTable.teacherId, params.data.staffId));
  if (!staff) {
    res.status(404).json({ error: "Staff not found" });
    return;
  }

  res.json({
    staffId: staff.teacherId,
    name: staff.name,
    subject: staff.subject,
    staffRole: staff.staffRole,
    permissions: staff.permissions,
  });
});

router.put("/admin/staff/:staffId", async (req, res): Promise<void> => {
  const params = UpdateAdminStaffMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateAdminStaffMemberBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [existing] = await db.select().from(teachersTable).where(eq(teachersTable.teacherId, params.data.staffId));
  if (!existing) {
    res.status(404).json({ error: "Staff not found" });
    return;
  }

  const updateValues: Record<string, unknown> = {
    name: body.data.name,
    subject: body.data.subject,
    staffRole: body.data.staffRole,
    permissions: body.data.permissions,
  };

  if (body.data.password) {
    updateValues.passwordHash = await bcrypt.hash(body.data.password, 10);
  }

  const [staff] = await db
    .update(teachersTable)
    .set(updateValues)
    .where(eq(teachersTable.teacherId, params.data.staffId))
    .returning();

  res.json({
    staffId: staff.teacherId,
    name: staff.name,
    subject: staff.subject,
    staffRole: staff.staffRole,
    permissions: staff.permissions,
  });
});

router.delete("/admin/staff/:staffId", async (req, res): Promise<void> => {
  const params = DeleteAdminStaffMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db.select().from(teachersTable).where(eq(teachersTable.teacherId, params.data.staffId));
  if (!existing) {
    res.status(404).json({ error: "Staff not found" });
    return;
  }

  await db.delete(teachersTable).where(eq(teachersTable.teacherId, params.data.staffId));
  res.json({ success: true, message: "Staff member deleted" });
});

// ─── Admin Exams (view all exams across all staff) ────────────────────────

router.get("/admin/exams", async (_req, res): Promise<void> => {
  const exams = await db
    .select({
      id: examsTable.id,
      subject: examsTable.subject,
      class: examsTable.class,
      durationMinutes: examsTable.durationMinutes,
      startTime: examsTable.startTime,
      endTime: examsTable.endTime,
      createdBy: examsTable.createdBy,
      questionCount: sql<number>`cast(count(distinct ${resultsTable.id}) as int)`,
      attemptCount: sql<number>`cast(count(distinct ${resultsTable.id}) as int)`,
      averageScore: sql<number | null>`avg(cast(${resultsTable.score} as float) / nullif(${resultsTable.total}, 0) * 100)`,
    })
    .from(examsTable)
    .leftJoin(resultsTable, eq(resultsTable.examId, examsTable.id))
    .groupBy(examsTable.id)
    .orderBy(desc(examsTable.createdAt));

  res.json(exams.map(e => ({
    ...e,
    startTime: e.startTime?.toISOString() ?? null,
    endTime: e.endTime?.toISOString() ?? null,
    averageScore: e.averageScore != null ? Math.round(Number(e.averageScore) * 100) / 100 : null,
  })));
});

router.delete("/admin/exams/:examId", async (req, res): Promise<void> => {
  const params = DeleteAdminExamParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db.select().from(examsTable).where(eq(examsTable.id, params.data.examId));
  if (!existing) {
    res.status(404).json({ error: "Exam not found" });
    return;
  }

  await db.delete(examsTable).where(eq(examsTable.id, params.data.examId));
  res.json({ success: true, message: "Exam deleted" });
});

export default router;
