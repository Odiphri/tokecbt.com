import { pool } from "@workspace/db";
import { logger } from "./logger";

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL DEFAULT 'custom',
        created_by TEXT
      );

      CREATE TABLE IF NOT EXISTS attendances (
        id SERIAL PRIMARY KEY,
        student_reg TEXT NOT NULL,
        student_name TEXT NOT NULL,
        class TEXT NOT NULL,
        date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'present',
        marked_by TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS student_payments (
        id SERIAL PRIMARY KEY,
        student_reg TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'unpaid',
        amount_paid INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        updated_by TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS exam_overrides (
        id SERIAL PRIMARY KEY,
        student_reg TEXT NOT NULL,
        exam_id TEXT,
        overridden_by TEXT NOT NULL,
        overrider_role TEXT NOT NULL,
        reason TEXT NOT NULL,
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS school_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      INSERT INTO school_settings (key, value)
      VALUES
        ('school_name', 'Toke Schools'),
        ('portal_tagline', 'Computer Based Testing Portal'),
        ('school_logo', '')
      ON CONFLICT (key) DO NOTHING;
    `);
    logger.info("Migrations completed successfully");
  } catch (err) {
    logger.error({ err }, "Migration failed");
    throw err;
  } finally {
    client.release();
  }
}
