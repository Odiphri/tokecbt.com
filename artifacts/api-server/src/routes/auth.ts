import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, studentsTable, teachersTable, adminsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken } from "../lib/jwt";
import { requireAuth } from "../middlewares/auth";
import {
  LoginBody,
  ChangePasswordBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, password, role } = parsed.data;

  if (role === "student") {
    const [student] = await db
      .select()
      .from(studentsTable)
      .where(eq(studentsTable.regNumber, username));

    if (!student) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const valid = await bcrypt.compare(password, student.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const token = signToken({ id: student.regNumber, role: "student", name: student.name });
    res.json({
      token,
      role: "student",
      name: student.name,
      isDefaultPassword: student.isDefaultPassword,
      id: student.regNumber,
    });
    return;
  }

  if (role === "staff") {
    // Check teachers first
    const [teacher] = await db
      .select()
      .from(teachersTable)
      .where(eq(teachersTable.teacherId, username));

    if (teacher) {
      const valid = await bcrypt.compare(password, teacher.passwordHash);
      if (!valid) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      const permissions = teacher.permissions ?? { manage_exams: true, view_all_results: false, manage_students: false };
      const token = signToken({
        id: teacher.teacherId,
        role: "staff",
        name: teacher.name,
        staffRole: teacher.staffRole,
        permissions,
      });
      res.json({
        token,
        role: "staff",
        name: teacher.name,
        isDefaultPassword: false,
        id: teacher.teacherId,
        staffRole: teacher.staffRole,
        permissions,
      });
      return;
    }

    // If not found in teachers, check admins
    const [admin] = await db
      .select()
      .from(adminsTable)
      .where(eq(adminsTable.username, username));

    if (admin) {
      const valid = await bcrypt.compare(password, admin.passwordHash);
      if (!valid) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      const token = signToken({ id: admin.username, role: "admin", name: admin.name });
      res.json({
        token,
        role: "admin",
        name: admin.name,
        isDefaultPassword: false,
        id: admin.username,
      });
      return;
    }

    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  res.status(400).json({ error: "Invalid role" });
});

router.post("/auth/change-password", requireAuth, async (req, res): Promise<void> => {
  const parsed = ChangePasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { currentPassword, newPassword } = parsed.data;
  const user = req.user!;

  if (user.role === "student") {
    const [student] = await db
      .select()
      .from(studentsTable)
      .where(eq(studentsTable.regNumber, user.id));

    if (!student) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const valid = await bcrypt.compare(currentPassword, student.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await db
      .update(studentsTable)
      .set({ passwordHash: hash, isDefaultPassword: false })
      .where(eq(studentsTable.regNumber, user.id));

    res.json({ success: true, message: "Password changed successfully" });
    return;
  }

  res.status(403).json({ error: "Only students can change passwords via this endpoint" });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;

  if (user.role === "student") {
    const [student] = await db
      .select()
      .from(studentsTable)
      .where(eq(studentsTable.regNumber, user.id));

    if (!student) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      id: student.regNumber,
      name: student.name,
      role: "student",
      class: student.class,
      isDefaultPassword: student.isDefaultPassword,
    });
    return;
  }

  if (user.role === "staff") {
    const [teacher] = await db
      .select()
      .from(teachersTable)
      .where(eq(teachersTable.teacherId, user.id));

    if (!teacher) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      id: teacher.teacherId,
      name: teacher.name,
      role: "staff",
      class: null,
      isDefaultPassword: false,
      staffRole: teacher.staffRole,
      permissions: teacher.permissions,
    });
    return;
  }

  if (user.role === "admin") {
    const [admin] = await db
      .select()
      .from(adminsTable)
      .where(eq(adminsTable.username, user.id));

    if (!admin) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      id: admin.username,
      name: admin.name,
      role: "admin",
      class: null,
      isDefaultPassword: false,
    });
    return;
  }

  res.status(400).json({ error: "Invalid role" });
});

export default router;
