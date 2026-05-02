import { Router, type IRouter } from "express";
import { db, studentsTable, examsTable, questionsTable, resultsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { SubmitExamBody, GetStudentExamParams, SubmitExamParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.use("/student", requireAuth, requireRole("student"));

router.get("/student/exams", async (req, res): Promise<void> => {
  const user = req.user!;

  const [student] = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.regNumber, user.id));

  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  const exams = await db
    .select({
      id: examsTable.id,
      subject: examsTable.subject,
      class: examsTable.class,
      durationMinutes: examsTable.durationMinutes,
      startTime: examsTable.startTime,
      endTime: examsTable.endTime,
      createdBy: examsTable.createdBy,
      questionCount: sql<number>`cast(count(${questionsTable.id}) as int)`,
    })
    .from(examsTable)
    .leftJoin(questionsTable, eq(questionsTable.examId, examsTable.id))
    .where(eq(examsTable.class, student.class))
    .groupBy(examsTable.id);

  const submittedExamIds = new Set(
    (await db.select({ examId: resultsTable.examId })
      .from(resultsTable)
      .where(eq(resultsTable.studentReg, user.id)))
      .map(r => r.examId)
  );

  const examsWithStatus = exams.map(e => ({
    ...e,
    startTime: e.startTime?.toISOString() ?? null,
    endTime: e.endTime?.toISOString() ?? null,
    alreadySubmitted: submittedExamIds.has(e.id),
  }));

  res.json(examsWithStatus);
});

router.get("/student/exams/:examId", async (req, res): Promise<void> => {
  const user = req.user!;
  const params = GetStudentExamParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [student] = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.regNumber, user.id));

  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  const [exam] = await db
    .select()
    .from(examsTable)
    .where(and(eq(examsTable.id, params.data.examId), eq(examsTable.class, student.class)));

  if (!exam) {
    res.status(404).json({ error: "Exam not found" });
    return;
  }

  const [existingResult] = await db
    .select()
    .from(resultsTable)
    .where(and(
      eq(resultsTable.studentReg, user.id),
      eq(resultsTable.examId, exam.id)
    ));

  if (existingResult) {
    res.status(403).json({ error: "You have already submitted this exam" });
    return;
  }

  const questions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.examId, exam.id));

  const safeQuestions = questions.map(q => ({
    id: q.id,
    examId: q.examId,
    questionText: q.questionText,
    optionA: q.optionA,
    optionB: q.optionB,
    optionC: q.optionC,
    optionD: q.optionD,
    correctOption: q.correctOption,
  }));

  res.json({
    id: exam.id,
    subject: exam.subject,
    class: exam.class,
    durationMinutes: exam.durationMinutes,
    startTime: exam.startTime?.toISOString() ?? null,
    endTime: exam.endTime?.toISOString() ?? null,
    createdBy: exam.createdBy,
    questions: safeQuestions,
  });
});

router.post("/student/exams/:examId/submit", async (req, res): Promise<void> => {
  const user = req.user!;
  const params = SubmitExamParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = SubmitExamBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [student] = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.regNumber, user.id));

  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  const [exam] = await db
    .select()
    .from(examsTable)
    .where(and(eq(examsTable.id, params.data.examId), eq(examsTable.class, student.class)));

  if (!exam) {
    res.status(404).json({ error: "Exam not found" });
    return;
  }

  const [existingResult] = await db
    .select()
    .from(resultsTable)
    .where(and(
      eq(resultsTable.studentReg, user.id),
      eq(resultsTable.examId, exam.id)
    ));

  if (existingResult) {
    res.status(403).json({ error: "You have already submitted this exam" });
    return;
  }

  const questions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.examId, exam.id));

  let score = 0;
  const answers = body.data.answers;
  for (const q of questions) {
    if (answers[String(q.id)] === q.correctOption) {
      score++;
    }
  }

  const total = questions.length;
  const [result] = await db
    .insert(resultsTable)
    .values({
      studentReg: user.id,
      examId: exam.id,
      score,
      total,
    })
    .returning();

  const percentage = total > 0 ? (score / total) * 100 : 0;
  const grade =
    percentage >= 75 ? "A" :
    percentage >= 60 ? "B" :
    percentage >= 50 ? "C" :
    percentage >= 45 ? "D" : "F";

  res.json({
    id: result.id,
    score: result.score,
    total: result.total,
    percentage: Math.round(percentage * 100) / 100,
    grade,
    submittedAt: result.submittedAt.toISOString(),
  });
});

router.get("/student/results", async (req, res): Promise<void> => {
  const user = req.user!;

  const results = await db
    .select({
      id: resultsTable.id,
      examId: resultsTable.examId,
      subject: examsTable.subject,
      class: examsTable.class,
      score: resultsTable.score,
      total: resultsTable.total,
      submittedAt: resultsTable.submittedAt,
      resultsEnabled: examsTable.resultsEnabled,
    })
    .from(resultsTable)
    .innerJoin(examsTable, eq(examsTable.id, resultsTable.examId))
    .where(eq(resultsTable.studentReg, user.id))
    .orderBy(resultsTable.submittedAt);

  const mapped = results.map(r => {
    const percentage = r.total > 0 ? (r.score / r.total) * 100 : 0;
    const grade =
      percentage >= 75 ? "A" :
      percentage >= 60 ? "B" :
      percentage >= 50 ? "C" :
      percentage >= 45 ? "D" : "F";

    return {
      id: r.id,
      examId: r.examId,
      subject: r.subject,
      class: r.class,
      score: r.score,
      total: r.total,
      percentage: Math.round(percentage * 100) / 100,
      grade,
      submittedAt: r.submittedAt.toISOString(),
      resultsReleased: r.resultsEnabled,
    };
  });

  res.json(mapped);
});

export default router;
