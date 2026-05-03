import { pgTable, serial, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ROLE_TYPES = ["prefect", "normal", "custom"] as const;
export type RoleType = typeof ROLE_TYPES[number];

export const rolesTable = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  type: text("type").$type<RoleType>().notNull().default("custom"),
  createdBy: text("created_by"),
});

export const insertRoleSchema = createInsertSchema(rolesTable);
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Role = typeof rolesTable.$inferSelect;
