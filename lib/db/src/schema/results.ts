import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { examsTable } from "./exams";

export const resultsTable = pgTable("results", {
  id: serial("id").primaryKey(),
  studentReg: text("student_reg").notNull(),
  examId: integer("exam_id")
    .notNull()
    .references(() => examsTable.id, { onDelete: "cascade" }),
  score: integer("score").notNull(),
  total: integer("total").notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertResultSchema = createInsertSchema(resultsTable).omit({ id: true, submittedAt: true });
export type InsertResult = z.infer<typeof insertResultSchema>;
export type Result = typeof resultsTable.$inferSelect;
