import { Router, type IRouter } from "express";
import { db, studentsTable, teachersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/directory/teachers", requireAuth, async (_req, res): Promise<void> => {
  const teachers = await db.select({
    name: teachersTable.name,
    subject: teachersTable.subject,
    staffRole: teachersTable.staffRole,
    profilePicture: teachersTable.profilePicture,
    assignedClass: teachersTable.assignedClass,
  }).from(teachersTable);

  res.json(teachers.map(t => ({
    name: t.name,
    subject: t.subject,
    staffRole: t.staffRole,
    profilePicture: t.profilePicture ?? null,
    assignedClass: t.assignedClass ?? null,
  })));
});

router.get("/directory/students", requireAuth, async (_req, res): Promise<void> => {
  const students = await db.select({
    name: studentsTable.name,
    class: studentsTable.class,
    studentRole: studentsTable.studentRole,
    profilePicture: studentsTable.profilePicture,
  }).from(studentsTable).orderBy(studentsTable.name);

  res.json(students.map(s => ({
    name: s.name,
    class: s.class,
    studentRole: s.studentRole ?? "Student",
    profilePicture: s.profilePicture ?? null,
  })));
});

export default router;
