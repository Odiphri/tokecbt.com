import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export type SchoolSection = "junior" | "senior";

export const teacherSubjectsTable = pgTable("teacher_subjects", {
  id: serial("id").primaryKey(),
  teacherId: text("teacher_id").notNull(),
  subject: text("subject").notNull(),
  section: text("section").$type<SchoolSection>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SubjectChangeRequestStatus = "pending" | "approved" | "rejected";

export const subjectChangeRequestsTable = pgTable("subject_change_requests", {
  id: serial("id").primaryKey(),
  teacherId: text("teacher_id").notNull(),
  teacherName: text("teacher_name").notNull(),
  action: text("action").$type<"add" | "remove">().notNull(),
  subject: text("subject").notNull(),
  section: text("section").$type<SchoolSection>().notNull(),
  reason: text("reason").notNull().default(""),
  status: text("status").$type<SubjectChangeRequestStatus>().notNull().default("pending"),
  reviewedBy: text("reviewed_by"),
  reviewNote: text("review_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TeacherSubject = typeof teacherSubjectsTable.$inferSelect;
export type SubjectChangeRequest = typeof subjectChangeRequestsTable.$inferSelect;
