import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const PAYMENT_STATUSES = ["paid", "unpaid", "partial"] as const;
export type PaymentStatus = typeof PAYMENT_STATUSES[number];

export const paymentsTable = pgTable("student_payments", {
  id: serial("id").primaryKey(),
  studentReg: text("student_reg").notNull().unique(),
  status: text("status").$type<PaymentStatus>().notNull().default("unpaid"),
  amountPaid: integer("amount_paid").notNull().default(0),
  notes: text("notes"),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Payment = typeof paymentsTable.$inferSelect;
