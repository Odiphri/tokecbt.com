import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export type FeeRecordStatus = "paid" | "unpaid" | "partial" | "waived";

export const studentFeeRecordsTable = pgTable("student_fee_records", {
  id: serial("id").primaryKey(),
  studentReg: text("student_reg").notNull(),
  feeTypeId: integer("fee_type_id").notNull(),
  amountDue: integer("amount_due").notNull().default(0),
  amountPaid: integer("amount_paid").notNull().default(0),
  status: text("status").$type<FeeRecordStatus>().notNull().default("unpaid"),
  dueDate: text("due_date"),
  notes: text("notes"),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type StudentFeeRecord = typeof studentFeeRecordsTable.$inferSelect;
