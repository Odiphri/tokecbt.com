import { pgTable, text, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const STUDENT_POSITIONS = [
  "Head Boy",
  "Head Girl",
  "Assistant Head Boy",
  "Assistant Head Girl",
  "Prefect",
  "Class Captain",
  "Assistant Class Captain",
  "Library Prefect",
  "Sports Prefect",
  "Social Prefect",
  "Student",
] as const;

export type StudentPosition = typeof STUDENT_POSITIONS[number];

export const studentsTable = pgTable("students", {
  regNumber: text("reg_number").primaryKey(),
  name: text("name").notNull(),
  class: text("class").notNull(),
  passwordHash: text("password_hash").notNull(),
  isDefaultPassword: boolean("is_default_password").notNull().default(true),
  studentRole: text("student_role").default("Student"),
  profilePicture: text("profile_picture"),
});

export const insertStudentSchema = createInsertSchema(studentsTable);
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof studentsTable.$inferSelect;
