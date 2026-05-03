import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, studentsTable, teachersTable, examsTable, resultsTable, questionsTable, DEFAULT_PERMISSIONS_BY_ROLE, DEFAULT_EMPTY_PERMISSIONS } from "@workspace/db";
import { eq, sql, desc, and } from "drizzle-orm";
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
import { z } from "zod";

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
    studentRole: s.studentRole ?? "Student",
    profilePicture: s.profilePicture ?? null,
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
    studentRole: parsed.data.studentRole ?? "Student",
  }).returning();

  res.status(201).json({
    regNumber: student.regNumber,
    name: student.name,
    class: student.class,
    isDefaultPassword: student.isDefaultPassword,
    studentRole: student.studentRole ?? "Student",
    profilePicture: student.profilePicture ?? null,
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
    studentRole: student.studentRole ?? "Student",
    profilePicture: student.profilePicture ?? null,
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
    studentRole: body.data.studentRole ?? existing.studentRole ?? "Student",
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
    studentRole: student.studentRole ?? "Student",
    profilePicture: student.profilePicture ?? null,
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

  await db.delete(resultsTable).where(eq(resultsTable.studentReg, params.data.regNumber));
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
    profilePicture: t.profilePicture ?? null,
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
  const permissions = parsed.data.permissions ?? DEFAULT_PERMISSIONS_BY_ROLE[parsed.data.staffRole as keyof typeof DEFAULT_PERMISSIONS_BY_ROLE] ?? DEFAULT_EMPTY_PERMISSIONS;

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
    profilePicture: staff.profilePicture ?? null,
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
    profilePicture: staff.profilePicture ?? null,
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
    profilePicture: staff.profilePicture ?? null,
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

// ─── Admin Exams ──────────────────────────────────────────────────────────────

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
      resultsEnabled: examsTable.resultsEnabled,
      questionCount: sql<number>`cast(count(distinct ${questionsTable.id}) as int)`,
      attemptCount: sql<number>`cast(count(distinct ${resultsTable.id}) as int)`,
      averageScore: sql<number | null>`avg(cast(${resultsTable.score} as float) / nullif(${resultsTable.total}, 0) * 100)`,
    })
    .from(examsTable)
    .leftJoin(questionsTable, eq(questionsTable.examId, examsTable.id))
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

const UpdateAdminExamBody = z.object({
  subject: z.string().min(1),
  class: z.string().min(1),
  durationMinutes: z.number().int().min(1),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
});

router.put("/admin/exams/:examId", async (req, res): Promise<void> => {
  const examId = parseInt(req.params.examId, 10);
  if (isNaN(examId)) { res.status(400).json({ error: "Invalid exam ID" }); return; }

  const body = UpdateAdminExamBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [existing] = await db.select().from(examsTable).where(eq(examsTable.id, examId));
  if (!existing) {
    res.status(404).json({ error: "Exam not found" });
    return;
  }

  const [exam] = await db
    .update(examsTable)
    .set({
      subject: body.data.subject,
      class: body.data.class,
      durationMinutes: body.data.durationMinutes,
      startTime: body.data.startTime ? new Date(body.data.startTime) : null,
      endTime: body.data.endTime ? new Date(body.data.endTime) : null,
    })
    .where(eq(examsTable.id, examId))
    .returning();

  res.json({
    id: exam.id,
    subject: exam.subject,
    class: exam.class,
    durationMinutes: exam.durationMinutes,
    startTime: exam.startTime?.toISOString() ?? null,
    endTime: exam.endTime?.toISOString() ?? null,
    createdBy: exam.createdBy,
    questionCount: 0,
    resultsEnabled: exam.resultsEnabled,
  });
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

// ─── Admin Exam Results ───────────────────────────────────────────────────────

router.get("/admin/exams/:examId/results", async (req, res): Promise<void> => {
  const examId = parseInt(req.params.examId, 10);
  if (isNaN(examId)) { res.status(400).json({ error: "Invalid exam ID" }); return; }

  const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, examId));
  if (!exam) { res.status(404).json({ error: "Exam not found" }); return; }

  const results = await db
    .select({
      id: resultsTable.id,
      studentReg: resultsTable.studentReg,
      studentName: studentsTable.name,
      studentClass: studentsTable.class,
      score: resultsTable.score,
      total: resultsTable.total,
      submittedAt: resultsTable.submittedAt,
    })
    .from(resultsTable)
    .innerJoin(studentsTable, eq(studentsTable.regNumber, resultsTable.studentReg))
    .where(eq(resultsTable.examId, examId))
    .orderBy(desc(resultsTable.submittedAt));

  res.json(results.map(r => {
    const percentage = r.total > 0 ? (r.score / r.total) * 100 : 0;
    const grade =
      percentage >= 75 ? "A" :
      percentage >= 60 ? "B" :
      percentage >= 50 ? "C" :
      percentage >= 45 ? "D" : "F";

    return {
      id: r.id,
      studentReg: r.studentReg,
      studentName: r.studentName,
      studentClass: r.studentClass,
      score: r.score,
      total: r.total,
      percentage: Math.round(percentage * 100) / 100,
      grade,
      submittedAt: r.submittedAt.toISOString(),
    };
  }));
});

router.delete("/admin/exams/:examId/results/:resultId", async (req, res): Promise<void> => {
  const examId = parseInt(req.params.examId, 10);
  const resultId = parseInt(req.params.resultId, 10);

  if (isNaN(examId) || isNaN(resultId)) {
    res.status(400).json({ error: "Invalid exam or result ID" });
    return;
  }

  const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, examId));
  if (!exam) { res.status(404).json({ error: "Exam not found" }); return; }

  const [result] = await db.select().from(resultsTable)
    .where(and(eq(resultsTable.id, resultId), eq(resultsTable.examId, examId)));
  if (!result) { res.status(404).json({ error: "Result not found" }); return; }

  await db.delete(resultsTable).where(eq(resultsTable.id, resultId));
  res.json({ success: true, message: "Result removed — student may retake the exam" });
});

export default router;
