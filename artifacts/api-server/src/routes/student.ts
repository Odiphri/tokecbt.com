import { Router, type IRouter } from "express";
import { db, studentsTable, examsTable, questionsTable, resultsTable, requestsTable, paymentsTable, overridesTable, studentFeeRecordsTable, feeTypesTable } from "@workspace/db";
import { eq, and, sql, or, isNull } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { SubmitExamBody, GetStudentExamParams, SubmitExamParams } from "@workspace/api-zod";
import { z } from "zod";
import { STUDENT_POSITIONS } from "@workspace/db";

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
      isLive: examsTable.isLive,
      createdBy: examsTable.createdBy,
      questionCount: sql<number>`cast(count(${questionsTable.id}) as int)`,
      resultsEnabled: examsTable.resultsEnabled,
    })
    .from(examsTable)
    .leftJoin(questionsTable, eq(questionsTable.examId, examsTable.id))
    .where(and(eq(examsTable.class, student.class), eq(examsTable.isLive, true)))
    .groupBy(examsTable.id);

  const submittedExamIds = new Set(
    (await db.select({ examId: resultsTable.examId })
      .from(resultsTable)
      .where(eq(resultsTable.studentReg, user.id)))
      .map(r => r.examId)
  );

  // Payment blocking: check both legacy table and new fee records
  const now = new Date();
  const [legacyPayment] = await db.select().from(paymentsTable).where(eq(paymentsTable.studentReg, user.id));
  const legacyPaid = legacyPayment?.status === "paid";

  // Check mandatory fees in new fee records system
  const mandatoryFeeTypes = await db.select().from(feeTypesTable).where(eq(feeTypesTable.isMandatory, true));
  const mandatoryFeeIds = new Set(mandatoryFeeTypes.map(f => f.id));
  let newSystemBlocked = false;
  if (mandatoryFeeIds.size > 0) {
    const mandatoryRecords = await db.select().from(studentFeeRecordsTable)
      .where(eq(studentFeeRecordsTable.studentReg, user.id));
    const mandatoryStudentRecords = mandatoryRecords.filter(r => mandatoryFeeIds.has(r.feeTypeId));
    if (mandatoryStudentRecords.length > 0) {
      newSystemBlocked = mandatoryStudentRecords.some(r => r.status !== "paid" && r.status !== "waived");
    }
  }

  // Student is blocked only if both legacy AND new system say unpaid
  const isPaid = legacyPaid || !newSystemBlocked;

  // Check for any active override
  let hasGlobalOverride = false;
  if (!isPaid) {
    const overrides = await db.select().from(overridesTable).where(eq(overridesTable.studentReg, user.id));
    hasGlobalOverride = overrides.some(o => {
      const notExpired = !o.expiresAt || o.expiresAt > now;
      const isGlobal = !o.examId;
      return notExpired && isGlobal;
    });
  }

  const examsWithStatus = exams.map(e => ({
    ...e,
    startTime: e.startTime?.toISOString() ?? null,
    endTime: e.endTime?.toISOString() ?? null,
    alreadySubmitted: submittedExamIds.has(e.id),
    resultsEnabled: e.resultsEnabled,
    paymentBlocked: !isPaid && !hasGlobalOverride,
    paymentStatus: legacyPayment?.status ?? "unpaid",
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

  // Enforce startTime - student cannot access exam before it goes live
  if (exam.startTime && new Date() < exam.startTime) {
    res.status(403).json({ error: "This exam has not started yet. Please wait until the scheduled start time." });
    return;
  }

  // Enforce endTime - student cannot access exam after it has expired
  if (exam.endTime && new Date() > exam.endTime) {
    res.status(403).json({ error: "This exam has expired and is no longer available." });
    return;
  }

  // ── Payment gate ──────────────────────────────────────────────────────────
  const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.studentReg, user.id));
  const isPaid = payment?.status === "paid";

  if (!isPaid) {
    const now = new Date();
    const overrides = await db.select().from(overridesTable).where(eq(overridesTable.studentReg, user.id));
    const hasValidOverride = overrides.some(o => {
      const notExpired = !o.expiresAt || o.expiresAt > now;
      const matchesExam = !o.examId || o.examId === String(exam.id);
      return notExpired && matchesExam;
    });

    if (!hasValidOverride) {
      res.status(403).json({
        error: "Exam access restricted. Your fees are outstanding. Please visit the bursary office or contact an administrator for assistance.",
        code: "PAYMENT_REQUIRED",
      });
      return;
    }
  }
  // ──────────────────────────────────────────────────────────────────────────

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

  // Shuffle questions only if the exam has shuffle enabled
  const shuffled = exam.shuffleQuestions
    ? [...questions].sort(() => Math.random() - 0.5)
    : questions;

  const safeQuestions = shuffled.map(q => ({
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

router.get("/student/requests", async (req, res): Promise<void> => {
  const user = req.user!;
  const { desc: descFn } = await import("drizzle-orm");
  const requests = await db.select().from(requestsTable)
    .where(eq(requestsTable.userId, user.id))
    .orderBy(descFn(requestsTable.createdAt));
  res.json(requests.map(r => ({
    id: r.id,
    userId: r.userId,
    userName: r.userName,
    userClass: r.userClass ?? null,
    type: r.type,
    currentValue: r.currentValue,
    requestedValue: r.requestedValue,
    status: r.status,
    reviewedBy: r.reviewedBy ?? null,
    reviewNote: r.reviewNote ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  })));
});

const CreateRequestBodySchema = z.object({
  type: z.enum(["name_change", "role_change"]),
  requestedValue: z.string().min(1),
});

router.post("/student/requests", async (req, res): Promise<void> => {
  const user = req.user!;
  const body = CreateRequestBodySchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.regNumber, user.id));
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  if (body.data.type === "role_change") {
    if (!STUDENT_POSITIONS.includes(body.data.requestedValue as typeof STUDENT_POSITIONS[number])) {
      res.status(400).json({ error: "Invalid student role" });
      return;
    }
  }

  const currentValue = body.data.type === "name_change" ? student.name : (student.studentRole ?? "Student");

  const [request] = await db.insert(requestsTable).values({
    userId: student.regNumber,
    userName: student.name,
    userClass: student.class,
    type: body.data.type,
    currentValue,
    requestedValue: body.data.requestedValue,
    status: "pending",
  }).returning();

  res.status(201).json({
    id: request.id,
    userId: request.userId,
    userName: request.userName,
    userClass: request.userClass ?? null,
    type: request.type,
    currentValue: request.currentValue,
    requestedValue: request.requestedValue,
    status: request.status,
    reviewedBy: request.reviewedBy ?? null,
    reviewNote: request.reviewNote ?? null,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
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
