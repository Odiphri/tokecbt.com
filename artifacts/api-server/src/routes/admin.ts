import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, studentsTable, teachersTable, examsTable, resultsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import {
  CreateAdminStudentBody,
  UpdateAdminStudentBody,
  GetAdminStudentParams,
  UpdateAdminStudentParams,
  DeleteAdminStudentParams,
  CreateAdminTeacherBody,
  UpdateAdminTeacherBody,
  GetAdminTeacherParams,
  UpdateAdminTeacherParams,
  DeleteAdminTeacherParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.use(requireAuth, requireRole("admin"));

router.get("/admin/stats", async (_req, res): Promise<void> => {
  const [{ totalStudents }] = await db.select({ totalStudents: sql<number>`cast(count(*) as int)` }).from(studentsTable);
  const [{ totalTeachers }] = await db.select({ totalTeachers: sql<number>`cast(count(*) as int)` }).from(teachersTable);
  const [{ totalExams }] = await db.select({ totalExams: sql<number>`cast(count(*) as int)` }).from(examsTable);
  const [{ totalResults }] = await db.select({ totalResults: sql<number>`cast(count(*) as int)` }).from(resultsTable);

  res.json({
    totalStudents: totalStudents ?? 0,
    totalTeachers: totalTeachers ?? 0,
    totalExams: totalExams ?? 0,
    totalResults: totalResults ?? 0,
  });
});

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

  const updateValues: Partial<typeof existing> = {
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

router.get("/admin/teachers", async (_req, res): Promise<void> => {
  const teachers = await db.select().from(teachersTable).orderBy(teachersTable.name);
  res.json(teachers.map(t => ({
    teacherId: t.teacherId,
    name: t.name,
    subject: t.subject,
  })));
});

router.post("/admin/teachers", async (req, res): Promise<void> => {
  const parsed = CreateAdminTeacherBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(teachersTable).where(eq(teachersTable.teacherId, parsed.data.teacherId));
  if (existing) {
    res.status(409).json({ error: "A teacher with this ID already exists" });
    return;
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const [teacher] = await db.insert(teachersTable).values({
    teacherId: parsed.data.teacherId,
    name: parsed.data.name,
    subject: parsed.data.subject,
    passwordHash,
  }).returning();

  res.status(201).json({
    teacherId: teacher.teacherId,
    name: teacher.name,
    subject: teacher.subject,
  });
});

router.get("/admin/teachers/:teacherId", async (req, res): Promise<void> => {
  const params = GetAdminTeacherParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [teacher] = await db.select().from(teachersTable).where(eq(teachersTable.teacherId, params.data.teacherId));
  if (!teacher) {
    res.status(404).json({ error: "Teacher not found" });
    return;
  }

  res.json({
    teacherId: teacher.teacherId,
    name: teacher.name,
    subject: teacher.subject,
  });
});

router.put("/admin/teachers/:teacherId", async (req, res): Promise<void> => {
  const params = UpdateAdminTeacherParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateAdminTeacherBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [existing] = await db.select().from(teachersTable).where(eq(teachersTable.teacherId, params.data.teacherId));
  if (!existing) {
    res.status(404).json({ error: "Teacher not found" });
    return;
  }

  const updateValues: Partial<typeof existing> = {
    name: body.data.name,
    subject: body.data.subject,
  };

  if (body.data.password) {
    updateValues.passwordHash = await bcrypt.hash(body.data.password, 10);
  }

  const [teacher] = await db
    .update(teachersTable)
    .set(updateValues)
    .where(eq(teachersTable.teacherId, params.data.teacherId))
    .returning();

  res.json({
    teacherId: teacher.teacherId,
    name: teacher.name,
    subject: teacher.subject,
  });
});

router.delete("/admin/teachers/:teacherId", async (req, res): Promise<void> => {
  const params = DeleteAdminTeacherParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db.select().from(teachersTable).where(eq(teachersTable.teacherId, params.data.teacherId));
  if (!existing) {
    res.status(404).json({ error: "Teacher not found" });
    return;
  }

  await db.delete(teachersTable).where(eq(teachersTable.teacherId, params.data.teacherId));
  res.json({ success: true, message: "Teacher deleted" });
});

export default router;
