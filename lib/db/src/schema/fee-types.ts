import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const feeTypesTable = pgTable("fee_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  amount: integer("amount").notNull().default(0),
  isMandatory: boolean("is_mandatory").notNull().default(true),
  academicYear: text("academic_year").notNull().default(""),
  targetClass: text("target_class"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type FeeType = typeof feeTypesTable.$inferSelect;
