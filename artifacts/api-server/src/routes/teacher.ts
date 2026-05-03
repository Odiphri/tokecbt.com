import { Router, type IRouter } from "express";
import { db, examsTable, questionsTable, resultsTable, studentsTable, teachersTable } from "@workspace/db";
import { eq, and, sql, avg, desc } from "drizzle-orm";

const CLASS_LEVELS = ["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"] as const;

function parseClass(cls: string): { level: string; section: string } | null {
  const m = cls.match(/^(JSS[123]|SS[123])([ABC])$/);
  if (!m) return null;
  return { level: m[1], section: m[2] };
}

function promoteClass(cls: string): string | null {
  const parts = parseClass(cls);
  if (!parts) return null;
  const idx = CLASS_LEVELS.indexOf(parts.level as typeof CLASS_LEVELS[number]);
  if (idx === -1 || idx === CLASS_LEVELS.length - 1) return null;
  return `${CLASS_LEVELS[idx + 1]}${parts.section}`;
}

function demoteClass(cls: string): string | null {
  const parts = parseClass(cls);
  if (!parts) return null;
  const idx = CLASS_LEVELS.indexOf(parts.level as typeof CLASS_LEVELS[number]);
  if (idx <= 0) return null;
  return `${CLASS_LEVELS[idx - 1]}${parts.section}`;
}

import { requireAuth, requireRole } from "../middlewares/auth";
import {
  CreateAdminStudentBody,
  UpdateAdminStudentBody,
  CreateExamBody,
  GetTeacherExamParams,
  UpdateExamParams,
  UpdateExamBody,
  DeleteExamParams,
  GetExamQuestionsParams,
  CreateQuestionBody,
  CreateQuestionParams,
  UpdateQuestionParams,
  UpdateQuestionBody,
  DeleteQuestionParams,
  GetExamResultsParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.use("/teacher", requireAuth, requireRole("staff", "admin"));

function canViewAll(user: Express.Request["user"]): boolean {
  return user?.role === "admin" || !!user?.permissions?.view_all_exams;
}

function canManageExams(user: Express.Request["user"]): boolean {
  return user?.role === "admin" || !!user?.permissions?.manage_exams;
}

function canManageStudents(user: Express.Request["user"]): boolean {
  return user?.role === "admin" || !!user?.permissions?.manage_students;
}

function canResetStudentExam(user: Express.Request["user"]): boolean {
  return user?.role === "admin" || !!user?.permissions?.reset_student_exam || !!user?.permissions?.manage_exams;
}

// ─── Student management routes ────────────────────────────────────────────────

router.get("/teacher/students", async (req, res): Promise<void> => {
  if (!canManageStudents(req.user)) {
    res.status(403).json({ error: "manage_students permission required" });
    return;
  }
  const students = await db.select().from(studentsTable);
  res.json(
    students.map(s => ({
      regNumber: s.regNumber,
      name: s.name,
      class: s.class,
      isDefaultPassword: s.isDefaultPassword,
      studentRole: s.studentRole ?? "Student",
      profilePicture: s.profilePicture ?? null,
    }))
  );
});

router.post("/teacher/students", async (req, res): Promise<void> => {
  if (!canManageStudents(req.user)) {
    res.status(403).json({ error: "manage_students permission required" });
    return;
  }
  const parsed = CreateAdminStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const bcrypt = await import("bcryptjs");
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

router.put("/teacher/students/:regNumber", async (req, res): Promise<void> => {
  if (!canManageStudents(req.user)) {
    res.status(403).json({ error: "manage_students permission required" });
    return;
  }
  const parsed = UpdateAdminStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { regNumber } = req.params;
  const [existing] = await db.select().from(studentsTable).where(eq(studentsTable.regNumber, regNumber));
  const updates: Record<string, unknown> = {
    name: parsed.data.name,
    class: parsed.data.class,
    studentRole: parsed.data.studentRole ?? existing?.studentRole ?? "Student",
  };
  if (parsed.data.resetPassword) {
    const bcrypt = await import("bcryptjs");
    updates.passwordHash = await bcrypt.hash("12345", 10);
    updates.isDefaultPassword = true;
  } else if (parsed.data.password) {
    const bcrypt = await import("bcryptjs");
    updates.passwordHash = await bcrypt.hash(parsed.data.password, 10);
    updates.isDefaultPassword = false;
  }
  const [student] = await db.update(studentsTable).set(updates).where(eq(studentsTable.regNumber, regNumber)).returning();
  if (!student) { res.status(404).json({ error: "Student not found" }); return; }
  res.json({
    regNumber: student.regNumber,
    name: student.name,
    class: student.class,
    isDefaultPassword: student.isDefaultPassword,
    studentRole: student.studentRole ?? "Student",
    profilePicture: student.profilePicture ?? null,
  });
});

router.delete("/teacher/students/:regNumber", async (req, res): Promise<void> => {
  if (!canManageStudents(req.user)) {
    res.status(403).json({ error: "manage_students permission required" });
    return;
  }
  const { regNumber } = req.params;
  await db.delete(resultsTable).where(eq(resultsTable.studentReg, regNumber));
  await db.delete(studentsTable).where(eq(studentsTable.regNumber, regNumber));
  res.json({ success: true });
});

// ─── Class Teacher routes ─────────────────────────────────────────────────────

function isClassTeacher(user: Express.Request["user"]): boolean {
  return user?.role === "admin" || !!(user?.assignedClass);
}

router.get("/teacher/class-students", async (req, res): Promise<void> => {
  const user = req.user!;
  if (!isClassTeacher(user)) {
    res.status(403).json({ error: "You are not assigned as a class teacher" });
    return;
  }
  const assignedClass = user.role === "admin" ? null : user.assignedClass;
  if (!assignedClass) {
    res.json([]);
    return;
  }
  const students = await db.select().from(studentsTable).where(eq(studentsTable.class, assignedClass));
  res.json(students.map(s => ({
    regNumber: s.regNumber,
    name: s.name,
    class: s.class,
    isDefaultPassword: s.isDefaultPassword,
    studentRole: s.studentRole ?? "Student",
    profilePicture: s.profilePicture ?? null,
  })));
});

router.post("/teacher/students/:regNumber/promote", async (req, res): Promise<void> => {
  const user = req.user!;
  if (!isClassTeacher(user) && !canManageStudents(user)) {
    res.status(403).json({ error: "Class teacher or manage_students permission required" });
    return;
  }
  const { regNumber } = req.params;
  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.regNumber, regNumber));
  if (!student) { res.status(404).json({ error: "Student not found" }); return; }

  const newClass = promoteClass(student.class);
  if (!newClass) {
    res.status(400).json({ error: `Student is already in the highest class (${student.class})` });
    return;
  }

  const [updated] = await db.update(studentsTable).set({ class: newClass }).where(eq(studentsTable.regNumber, regNumber)).returning();
  res.json({
    regNumber: updated.regNumber,
    name: updated.name,
    class: updated.class,
    isDefaultPassword: updated.isDefaultPassword,
    studentRole: updated.studentRole ?? "Student",
    profilePicture: updated.profilePicture ?? null,
  });
});

router.post("/teacher/students/:regNumber/demote", async (req, res): Promise<void> => {
  const user = req.user!;
  if (!isClassTeacher(user) && !canManageStudents(user)) {
    res.status(403).json({ error: "Class teacher or manage_students permission required" });
    return;
  }
  const { regNumber } = req.params;
  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.regNumber, regNumber));
  if (!student) { res.status(404).json({ error: "Student not found" }); return; }

  const newClass = demoteClass(student.class);
  if (!newClass) {
    res.status(400).json({ error: `Student is already in the lowest class (${student.class})` });
    return;
  }

  const [updated] = await db.update(studentsTable).set({ class: newClass }).where(eq(studentsTable.regNumber, regNumber)).returning();
  res.json({
    regNumber: updated.regNumber,
    name: updated.name,
    class: updated.class,
    isDefaultPassword: updated.isDefaultPassword,
    studentRole: updated.studentRole ?? "Student",
    profilePicture: updated.profilePicture ?? null,
  });
});

// ─── Dashboard ────────────────────────────────────────────────────────────────

router.get("/teacher/dashboard", async (req, res): Promise<void> => {
  const user = req.user!;
  const viewAll = canViewAll(user);

  const teacherExamsQuery = viewAll
    ? db.select({ id: examsTable.id }).from(examsTable)
    : db.select({ id: examsTable.id }).from(examsTable).where(eq(examsTable.createdBy, user.id));

  const teacherExamIds = (await teacherExamsQuery).map(e => e.id);

  const totalExams = teacherExamIds.length;

  const [{ count: totalQuestions }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(questionsTable)
    .where(teacherExamIds.length > 0
      ? sql`${questionsTable.examId} = any(array[${sql.raw(teacherExamIds.join(",") || "NULL")}]::int[])`
      : sql`false`);

  const [{ count: totalAttempts, avgScore }] = await db
    .select({
      count: sql<number>`cast(count(*) as int)`,
      avgScore: sql<number | null>`avg(cast(${resultsTable.score} as float) / nullif(${resultsTable.total}, 0) * 100)`,
    })
    .from(resultsTable)
    .where(teacherExamIds.length > 0
      ? sql`${resultsTable.examId} = any(array[${sql.raw(teacherExamIds.join(",") || "NULL")}]::int[])`
      : sql`false`);

  const recentResults = await db
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
    .where(teacherExamIds.length > 0
      ? sql`${resultsTable.examId} = any(array[${sql.raw(teacherExamIds.join(",") || "NULL")}]::int[])`
      : sql`false`)
    .orderBy(desc(resultsTable.submittedAt))
    .limit(10);

  const mapped = recentResults.map(r => {
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
  });

  res.json({
    totalExams,
    totalQuestions: totalQuestions ?? 0,
    totalAttempts: totalAttempts ?? 0,
    averageScore: avgScore != null ? Math.round(Number(avgScore) * 100) / 100 : null,
    recentResults: mapped,
  });
});

router.get("/teacher/exams", async (req, res): Promise<void> => {
  const user = req.user!;
  const viewAll = canViewAll(user);

  const exams = await db
    .select({
      id: examsTable.id,
      subject: examsTable.subject,
      class: examsTable.class,
      durationMinutes: examsTable.durationMinutes,
      startTime: examsTable.startTime,
      endTime: examsTable.endTime,
      createdBy: examsTable.createdBy,
      questionCount: sql<number>`cast(count(distinct ${questionsTable.id}) as int)`,
      attemptCount: sql<number>`cast(count(distinct ${resultsTable.id}) as int)`,
      averageScore: sql<number | null>`avg(cast(${resultsTable.score} as float) / nullif(${resultsTable.total}, 0) * 100)`,
      resultsEnabled: examsTable.resultsEnabled,
    })
    .from(examsTable)
    .leftJoin(questionsTable, eq(questionsTable.examId, examsTable.id))
    .leftJoin(resultsTable, eq(resultsTable.examId, examsTable.id))
    .where(viewAll ? undefined : eq(examsTable.createdBy, user.id))
    .groupBy(examsTable.id)
    .orderBy(desc(examsTable.createdAt));

  res.json(exams.map(e => ({
    ...e,
    startTime: e.startTime?.toISOString() ?? null,
    endTime: e.endTime?.toISOString() ?? null,
    averageScore: e.averageScore != null ? Math.round(Number(e.averageScore) * 100) / 100 : null,
    resultsEnabled: e.resultsEnabled,
  })));
});

router.post("/teacher/exams", async (req, res): Promise<void> => {
  const user = req.user!;
  if (!canManageExams(user)) {
    res.status(403).json({ error: "You do not have permission to create exams" });
    return;
  }

  const parsed = CreateExamBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [exam] = await db
    .insert(examsTable)
    .values({
      subject: parsed.data.subject,
      class: parsed.data.class,
      durationMinutes: parsed.data.durationMinutes,
      startTime: parsed.data.startTime ? new Date(parsed.data.startTime) : null,
      endTime: parsed.data.endTime ? new Date(parsed.data.endTime) : null,
      createdBy: user.id,
    })
    .returning();

  res.status(201).json({
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

router.get("/teacher/exams/:examId", async (req, res): Promise<void> => {
  const user = req.user!;
  const viewAll = canViewAll(user);
  const params = GetTeacherExamParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const condition = viewAll
    ? eq(examsTable.id, params.data.examId)
    : and(eq(examsTable.id, params.data.examId), eq(examsTable.createdBy, user.id));

  const [exam] = await db
    .select()
    .from(examsTable)
    .where(condition);

  if (!exam) {
    res.status(404).json({ error: "Exam not found" });
    return;
  }

  const questions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.examId, exam.id));

  res.json({
    id: exam.id,
    subject: exam.subject,
    class: exam.class,
    durationMinutes: exam.durationMinutes,
    startTime: exam.startTime?.toISOString() ?? null,
    endTime: exam.endTime?.toISOString() ?? null,
    createdBy: exam.createdBy,
    resultsEnabled: exam.resultsEnabled,
    questions,
  });
});

router.put("/teacher/exams/:examId", async (req, res): Promise<void> => {
  const user = req.user!;
  const viewAll = canViewAll(user);
  const params = UpdateExamParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!canManageExams(user) && !viewAll) {
    res.status(403).json({ error: "You do not have permission to edit exams" });
    return;
  }

  const body = UpdateExamBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const condition = viewAll
    ? eq(examsTable.id, params.data.examId)
    : and(eq(examsTable.id, params.data.examId), eq(examsTable.createdBy, user.id));

  const [existing] = await db
    .select()
    .from(examsTable)
    .where(condition);

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
    .where(eq(examsTable.id, params.data.examId))
    .returning();

  const [{ count: questionCount }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(questionsTable)
    .where(eq(questionsTable.examId, exam.id));

  res.json({
    id: exam.id,
    subject: exam.subject,
    class: exam.class,
    durationMinutes: exam.durationMinutes,
    startTime: exam.startTime?.toISOString() ?? null,
    endTime: exam.endTime?.toISOString() ?? null,
    createdBy: exam.createdBy,
    questionCount: questionCount ?? 0,
    resultsEnabled: exam.resultsEnabled,
  });
});

router.delete("/teacher/exams/:examId", async (req, res): Promise<void> => {
  const user = req.user!;
  const viewAll = canViewAll(user);
  const params = DeleteExamParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!canManageExams(user) && !viewAll) {
    res.status(403).json({ error: "You do not have permission to delete exams" });
    return;
  }

  const condition = viewAll
    ? eq(examsTable.id, params.data.examId)
    : and(eq(examsTable.id, params.data.examId), eq(examsTable.createdBy, user.id));

  const [existing] = await db
    .select()
    .from(examsTable)
    .where(condition);

  if (!existing) {
    res.status(404).json({ error: "Exam not found" });
    return;
  }

  await db.delete(examsTable).where(eq(examsTable.id, params.data.examId));
  res.json({ success: true, message: "Exam deleted" });
});

router.patch("/teacher/exams/:examId/toggle-results", async (req, res): Promise<void> => {
  const user = req.user!;
  const viewAll = canViewAll(user);
  const examId = parseInt(req.params.examId, 10);
  if (isNaN(examId)) { res.status(400).json({ error: "Invalid exam ID" }); return; }

  if (!canManageExams(user) && !viewAll) {
    res.status(403).json({ error: "You do not have permission to modify this exam" });
    return;
  }

  const { enabled } = req.body as { enabled: unknown };
  if (typeof enabled !== "boolean") {
    res.status(400).json({ error: "enabled must be a boolean" });
    return;
  }

  const condition = viewAll
    ? eq(examsTable.id, examId)
    : and(eq(examsTable.id, examId), eq(examsTable.createdBy, user.id));

  const [existing] = await db.select().from(examsTable).where(condition);
  if (!existing) { res.status(404).json({ error: "Exam not found" }); return; }

  await db.update(examsTable).set({ resultsEnabled: enabled }).where(eq(examsTable.id, examId));
  res.json({ success: true, message: enabled ? "Results enabled" : "Results disabled" });
});

router.get("/teacher/exams/:examId/questions", async (req, res): Promise<void> => {
  const user = req.user!;
  const viewAll = canViewAll(user);
  const params = GetExamQuestionsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const condition = viewAll
    ? eq(examsTable.id, params.data.examId)
    : and(eq(examsTable.id, params.data.examId), eq(examsTable.createdBy, user.id));

  const [exam] = await db.select().from(examsTable).where(condition);

  if (!exam) {
    res.status(404).json({ error: "Exam not found" });
    return;
  }

  const questions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.examId, exam.id));

  res.json(questions);
});

router.post("/teacher/exams/:examId/questions", async (req, res): Promise<void> => {
  const user = req.user!;
  const viewAll = canViewAll(user);
  const params = CreateQuestionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!canManageExams(user) && !viewAll) {
    res.status(403).json({ error: "You do not have permission to add questions" });
    return;
  }

  const body = CreateQuestionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const condition = viewAll
    ? eq(examsTable.id, params.data.examId)
    : and(eq(examsTable.id, params.data.examId), eq(examsTable.createdBy, user.id));

  const [exam] = await db.select().from(examsTable).where(condition);

  if (!exam) {
    res.status(404).json({ error: "Exam not found" });
    return;
  }

  const [question] = await db
    .insert(questionsTable)
    .values({
      examId: exam.id,
      questionText: body.data.questionText,
      optionA: body.data.optionA,
      optionB: body.data.optionB,
      optionC: body.data.optionC,
      optionD: body.data.optionD,
      correctOption: body.data.correctOption,
    })
    .returning();

  res.status(201).json(question);
});

router.put("/teacher/exams/:examId/questions/:questionId", async (req, res): Promise<void> => {
  const user = req.user!;
  const viewAll = canViewAll(user);
  const params = UpdateQuestionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!canManageExams(user) && !viewAll) {
    res.status(403).json({ error: "You do not have permission to edit questions" });
    return;
  }

  const body = UpdateQuestionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const condition = viewAll
    ? eq(examsTable.id, params.data.examId)
    : and(eq(examsTable.id, params.data.examId), eq(examsTable.createdBy, user.id));

  const [exam] = await db.select().from(examsTable).where(condition);

  if (!exam) {
    res.status(404).json({ error: "Exam not found" });
    return;
  }

  const [question] = await db
    .update(questionsTable)
    .set({
      questionText: body.data.questionText,
      optionA: body.data.optionA,
      optionB: body.data.optionB,
      optionC: body.data.optionC,
      optionD: body.data.optionD,
      correctOption: body.data.correctOption,
    })
    .where(and(eq(questionsTable.id, params.data.questionId), eq(questionsTable.examId, params.data.examId)))
    .returning();

  if (!question) {
    res.status(404).json({ error: "Question not found" });
    return;
  }

  res.json(question);
});

router.delete("/teacher/exams/:examId/questions/:questionId", async (req, res): Promise<void> => {
  const user = req.user!;
  const viewAll = canViewAll(user);
  const params = DeleteQuestionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!canManageExams(user) && !viewAll) {
    res.status(403).json({ error: "You do not have permission to delete questions" });
    return;
  }

  const condition = viewAll
    ? eq(examsTable.id, params.data.examId)
    : and(eq(examsTable.id, params.data.examId), eq(examsTable.createdBy, user.id));

  const [exam] = await db.select().from(examsTable).where(condition);

  if (!exam) {
    res.status(404).json({ error: "Exam not found" });
    return;
  }

  const [question] = await db
    .delete(questionsTable)
    .where(and(eq(questionsTable.id, params.data.questionId), eq(questionsTable.examId, params.data.examId)))
    .returning();

  if (!question) {
    res.status(404).json({ error: "Question not found" });
    return;
  }

  res.json({ success: true, message: "Question deleted" });
});

router.delete("/teacher/exams/:examId/results/:resultId", async (req, res): Promise<void> => {
  const user = req.user!;
  const viewAll = canViewAll(user);
  const examId = parseInt(req.params.examId, 10);
  const resultId = parseInt(req.params.resultId, 10);

  if (isNaN(examId) || isNaN(resultId)) {
    res.status(400).json({ error: "Invalid exam or result ID" });
    return;
  }

  if (!canResetStudentExam(user)) {
    res.status(403).json({ error: "You do not have permission to reset student exams" });
    return;
  }

  const condition = viewAll
    ? eq(examsTable.id, examId)
    : and(eq(examsTable.id, examId), eq(examsTable.createdBy, user.id));

  const [exam] = await db.select().from(examsTable).where(condition);
  if (!exam) { res.status(404).json({ error: "Exam not found" }); return; }

  const [result] = await db.select().from(resultsTable)
    .where(and(eq(resultsTable.id, resultId), eq(resultsTable.examId, examId)));
  if (!result) { res.status(404).json({ error: "Result not found" }); return; }

  await db.delete(resultsTable).where(eq(resultsTable.id, resultId));
  res.json({ success: true, message: "Result removed — student may retake the exam" });
});

router.get("/teacher/exams/:examId/results", async (req, res): Promise<void> => {
  const user = req.user!;
  const viewAll = canViewAll(user);
  const params = GetExamResultsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const condition = viewAll
    ? eq(examsTable.id, params.data.examId)
    : and(eq(examsTable.id, params.data.examId), eq(examsTable.createdBy, user.id));

  const [exam] = await db.select().from(examsTable).where(condition);

  if (!exam) {
    res.status(404).json({ error: "Exam not found" });
    return;
  }

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
    .where(eq(resultsTable.examId, exam.id))
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

export default router;
