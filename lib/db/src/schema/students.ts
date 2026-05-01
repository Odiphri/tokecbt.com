import { pgTable, serial, text, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const studentsTable = pgTable("students", {
  regNumber: text("reg_number").primaryKey(),
  name: text("name").notNull(),
  class: text("class").notNull(),
  passwordHash: text("password_hash").notNull(),
  isDefaultPassword: boolean("is_default_password").notNull().default(true),
});

export const insertStudentSchema = createInsertSchema(studentsTable);
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof studentsTable.$inferSelect;
