import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const ATTENDANCE_STATUSES = ["present", "absent", "late"] as const;
export type AttendanceStatus = typeof ATTENDANCE_STATUSES[number];

export const attendanceTable = pgTable("attendances", {
  id: serial("id").primaryKey(),
  studentReg: text("student_reg").notNull(),
  studentName: text("student_name").notNull(),
  class: text("class").notNull(),
  date: text("date").notNull(),
  status: text("status").$type<AttendanceStatus>().notNull().default("present"),
  markedBy: text("marked_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Attendance = typeof attendanceTable.$inferSelect;
