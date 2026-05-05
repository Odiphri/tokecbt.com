import { pool } from "@workspace/db";
import { logger } from "./logger";
import bcrypt from "bcryptjs";

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      -- Core tables
      CREATE TABLE IF NOT EXISTS admins (
        username TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        profile_picture TEXT
      );

      CREATE TABLE IF NOT EXISTS students (
        reg_number TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        class TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        is_default_password BOOLEAN NOT NULL DEFAULT TRUE,
        student_role TEXT DEFAULT 'Student',
        profile_picture TEXT
      );

      CREATE TABLE IF NOT EXISTS teachers (
        teacher_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        subject TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        staff_role TEXT NOT NULL DEFAULT 'teacher',
        permissions JSONB NOT NULL DEFAULT '{"manage_exams":true,"view_all_exams":false,"view_all_results":false,"manage_students":false,"reset_student_exam":false,"manage_student_roles":false,"manage_bursary":false,"mark_attendance":true,"override_exam_access":false}',
        profile_picture TEXT,
        assigned_class TEXT
      );

      CREATE TABLE IF NOT EXISTS exams (
        id SERIAL PRIMARY KEY,
        subject TEXT NOT NULL,
        class TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL,
        start_time TIMESTAMPTZ,
        end_time TIMESTAMPTZ,
        created_by TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        results_enabled BOOLEAN NOT NULL DEFAULT TRUE
      );

      CREATE TABLE IF NOT EXISTS questions (
        id SERIAL PRIMARY KEY,
        exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
        question_text TEXT NOT NULL,
        option_a TEXT NOT NULL,
        option_b TEXT NOT NULL,
        option_c TEXT NOT NULL,
        option_d TEXT NOT NULL,
        correct_option TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS results (
        id SERIAL PRIMARY KEY,
        student_reg TEXT NOT NULL,
        exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
        score INTEGER NOT NULL,
        total INTEGER NOT NULL,
        submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS requests (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        user_class TEXT,
        type TEXT NOT NULL,
        current_value TEXT NOT NULL,
        requested_value TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        reviewed_by TEXT,
        review_note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Feature tables
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

      -- Fee management tables
      CREATE TABLE IF NOT EXISTS fee_types (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        amount INTEGER NOT NULL DEFAULT 0,
        is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
        academic_year TEXT NOT NULL DEFAULT '',
        created_by TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS student_fee_records (
        id SERIAL PRIMARY KEY,
        student_reg TEXT NOT NULL,
        fee_type_id INTEGER NOT NULL REFERENCES fee_types(id) ON DELETE CASCADE,
        amount_due INTEGER NOT NULL DEFAULT 0,
        amount_paid INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'unpaid',
        due_date TEXT,
        notes TEXT,
        updated_by TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Teacher subject management tables
      CREATE TABLE IF NOT EXISTS teacher_subjects (
        id SERIAL PRIMARY KEY,
        teacher_id TEXT NOT NULL,
        subject TEXT NOT NULL,
        section TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS subject_change_requests (
        id SERIAL PRIMARY KEY,
        teacher_id TEXT NOT NULL,
        teacher_name TEXT NOT NULL,
        action TEXT NOT NULL,
        subject TEXT NOT NULL,
        section TEXT NOT NULL,
        reason TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending',
        reviewed_by TEXT,
        review_note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      INSERT INTO school_settings (key, value)
      VALUES
        ('school_name', 'Toke Schools'),
        ('portal_tagline', 'Computer Based Testing Portal'),
        ('school_logo', '')
      ON CONFLICT (key) DO NOTHING;
    `);

    // Seed default admin if none exists
    const { rows } = await client.query(`SELECT username FROM admins LIMIT 1`);
    if (rows.length === 0) {
      const hash = await bcrypt.hash("Admin@1234", 10);
      await client.query(
        `INSERT INTO admins (username, name, password_hash) VALUES ($1, $2, $3)`,
        ["admin", "Super Admin", hash]
      );
      logger.info("Default admin user created (username: admin, password: Admin@1234)");
    }

    logger.info("Migrations completed successfully");
  } catch (err) {
    logger.error({ err }, "Migration failed");
    throw err;
  } finally {
    client.release();
  }
}
