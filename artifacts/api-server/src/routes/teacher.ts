import { Router, type IRouter } from "express";
import { db, examsTable, questionsTable, resultsTable, studentsTable } from "@workspace/db";
import { eq, and, sql, avg, desc } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import {
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
