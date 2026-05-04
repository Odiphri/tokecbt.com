import { Router, type IRouter } from "express";
import { db, attendanceTable, studentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { z } from "zod";

const router: IRouter = Router();

router.use("/teacher/attendance", requireAuth, requireRole("staff", "admin"));

function canMarkAttendance(user: Express.Request["user"]): boolean {
  return user?.role === "admin" || !!user?.permissions?.mark_attendance || !!user?.permissions?.manage_students;
}

const MarkAttendanceBody = z.object({
  class: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  records: z.array(z.object({
    studentReg: z.string(),
    studentName: z.string(),
    status: z.enum(["present", "absent", "late"]),
  })).min(1),
});

router.post("/teacher/attendance", async (req, res): Promise<void> => {
  const user = req.user!;
  if (!canMarkAttendance(user)) {
    res.status(403).json({ error: "You do not have permission to mark attendance" });
    return;
  }

  const parsed = MarkAttendanceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { class: cls, date, records } = parsed.data;

  if (user.role === "staff" && user.assignedClass && user.assignedClass !== cls && !user.permissions?.manage_students) {
    res.status(403).json({ error: "You can only mark attendance for your assigned class" });
    return;
  }

  await db.delete(attendanceTable).where(
    and(eq(attendanceTable.class, cls), eq(attendanceTable.date, date))
  );

  if (records.length > 0) {
    await db.insert(attendanceTable).values(
      records.map(r => ({
        studentReg: r.studentReg,
        studentName: r.studentName,
        class: cls,
        date,
        status: r.status,
        markedBy: user.id,
      }))
    );
  }

  res.json({ success: true, message: `Attendance marked for ${records.length} students` });
});

router.get("/teacher/attendance", async (req, res): Promise<void> => {
  const user = req.user!;
  const { class: cls, date } = req.query as { class?: string; date?: string };

  if (user.role === "staff" && user.assignedClass && cls && user.assignedClass !== cls && !user.permissions?.manage_students && !user.permissions?.view_all_results) {
    res.status(403).json({ error: "You can only view attendance for your assigned class" });
    return;
  }

  const conditions: ReturnType<typeof eq>[] = [];
  if (cls) conditions.push(eq(attendanceTable.class, cls));
  if (date) conditions.push(eq(attendanceTable.date, date));

  const records = conditions.length > 0
    ? await db.select().from(attendanceTable).where(and(...conditions))
    : await db.select().from(attendanceTable);

  res.json(records.map(r => ({
    id: r.id,
    studentReg: r.studentReg,
    studentName: r.studentName,
    class: r.class,
    date: r.date,
    status: r.status,
    markedBy: r.markedBy,
    createdAt: r.createdAt.toISOString(),
  })));
});

router.get("/teacher/attendance/classes", async (req, res): Promise<void> => {
  const user = req.user!;
  if (user.role === "staff" && user.assignedClass && !user.permissions?.manage_students && !user.permissions?.view_all_results) {
    const students = await db.select().from(studentsTable).where(eq(studentsTable.class, user.assignedClass));
    res.json({ students: students.map(s => ({ regNumber: s.regNumber, name: s.name, class: s.class })), assignedClass: user.assignedClass });
    return;
  }
  const students = await db.select({ regNumber: studentsTable.regNumber, name: studentsTable.name, class: studentsTable.class }).from(studentsTable);
  res.json({ students: students, assignedClass: null });
});

export default router;
