import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const REQUEST_TYPES = ["name_change", "role_change"] as const;
export type RequestType = typeof REQUEST_TYPES[number];

export const REQUEST_STATUSES = ["pending", "approved", "rejected"] as const;
export type RequestStatus = typeof REQUEST_STATUSES[number];

export const requestsTable = pgTable("requests", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  userName: text("user_name").notNull(),
  userClass: text("user_class"),
  type: text("type").$type<RequestType>().notNull(),
  currentValue: text("current_value").notNull(),
  requestedValue: text("requested_value").notNull(),
  status: text("status").$type<RequestStatus>().notNull().default("pending"),
  reviewedBy: text("reviewed_by"),
  reviewNote: text("review_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRequestSchema = createInsertSchema(requestsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRequest = z.infer<typeof insertRequestSchema>;
export type Request = typeof requestsTable.$inferSelect;
