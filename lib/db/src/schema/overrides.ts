import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const overridesTable = pgTable("exam_overrides", {
  id: serial("id").primaryKey(),
  studentReg: text("student_reg").notNull(),
  examId: text("exam_id"),
  overriddenBy: text("overridden_by").notNull(),
  overriderRole: text("overrider_role").notNull(),
  reason: text("reason").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Override = typeof overridesTable.$inferSelect;
