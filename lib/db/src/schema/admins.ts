import { pgTable, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const adminsTable = pgTable("admins", {
  username: text("username").primaryKey(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
});

export const insertAdminSchema = createInsertSchema(adminsTable);
export type InsertAdmin = z.infer<typeof insertAdminSchema>;
export type Admin = typeof adminsTable.$inferSelect;
