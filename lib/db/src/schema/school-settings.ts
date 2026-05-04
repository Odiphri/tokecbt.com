import { pgTable, text } from "drizzle-orm/pg-core";

export const schoolSettingsTable = pgTable("school_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type SchoolSetting = typeof schoolSettingsTable.$inferSelect;

export const SCHOOL_SETTING_KEYS = {
  SCHOOL_NAME: "school_name",
  SCHOOL_LOGO: "school_logo",
  PORTAL_TAGLINE: "portal_tagline",
} as const;
