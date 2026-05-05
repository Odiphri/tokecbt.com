import { pgTable, text, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const PRESET_STAFF_ROLES = ["teacher", "hod", "librarian", "cbt_personnel", "bursary_manager"] as const;
export type PresetStaffRole = typeof PRESET_STAFF_ROLES[number];

export interface StaffPermissions {
  manage_exams: boolean;
  view_all_exams: boolean;
  view_all_results: boolean;
  manage_students: boolean;
  reset_student_exam: boolean;
  manage_student_roles: boolean;
  manage_bursary: boolean;
  mark_attendance: boolean;
  override_exam_access: boolean;
}

export const DEFAULT_PERMISSIONS_BY_ROLE: Record<PresetStaffRole, StaffPermissions> = {
  teacher: {
    manage_exams: true,
    view_all_exams: false,
    view_all_results: false,
    manage_students: false,
    reset_student_exam: false,
    manage_student_roles: false,
    manage_bursary: false,
    mark_attendance: true,
    override_exam_access: false,
  },
  hod: {
    manage_exams: true,
    view_all_exams: true,
    view_all_results: true,
    manage_students: true,
    reset_student_exam: true,
    manage_student_roles: true,
    manage_bursary: false,
    mark_attendance: true,
    override_exam_access: true,
  },
  librarian: {
    manage_exams: false,
    view_all_exams: false,
    view_all_results: false,
    manage_students: false,
    reset_student_exam: false,
    manage_student_roles: false,
    manage_bursary: false,
    mark_attendance: false,
    override_exam_access: false,
  },
  cbt_personnel: {
    manage_exams: true,
    view_all_exams: true,
    view_all_results: true,
    manage_students: false,
    reset_student_exam: true,
    manage_student_roles: false,
    manage_bursary: false,
    mark_attendance: false,
    override_exam_access: false,
  },
  bursary_manager: {
    manage_exams: false,
    view_all_exams: false,
    view_all_results: false,
    manage_students: false,
    reset_student_exam: false,
    manage_student_roles: false,
    manage_bursary: true,
    mark_attendance: false,
    override_exam_access: false,
  },
};

export const DEFAULT_EMPTY_PERMISSIONS: StaffPermissions = {
  manage_exams: false,
  view_all_exams: false,
  view_all_results: false,
  manage_students: false,
  reset_student_exam: false,
  manage_student_roles: false,
  manage_bursary: false,
  mark_attendance: false,
  override_exam_access: false,
};

export const teachersTable = pgTable("teachers", {
  teacherId: text("teacher_id").primaryKey(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  passwordHash: text("password_hash").notNull(),
  staffRole: text("staff_role").default("teacher").notNull(),
  permissions: jsonb("permissions").$type<StaffPermissions>().default({
    manage_exams: true,
    view_all_exams: false,
    view_all_results: false,
    manage_students: false,
    reset_student_exam: false,
    manage_student_roles: false,
    manage_bursary: false,
    mark_attendance: true,
    override_exam_access: false,
  }).notNull(),
  profilePicture: text("profile_picture"),
  assignedClass: text("assigned_class"),
});

export const insertTeacherSchema = createInsertSchema(teachersTable);
export type InsertTeacher = z.infer<typeof insertTeacherSchema>;
export type Teacher = typeof teachersTable.$inferSelect;
