# Toke Schools CBT Portal — School Management System

## Overview

A full-stack school management system built on a CBT (Computer Based Testing) foundation. Students can take timed exams, view results, and check their fee balances. Teachers manage exams, questions, and subjects. Admins manage all accounts, fees, bursary records, and staff roles. The system has role-based access with granular per-staff permissions.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + Tailwind CSS (`artifacts/cbt-portal`) — dark navy (#0B1E3D) + dark green (#0A4522) school colors
- **API framework**: Express 5 (`artifacts/api-server`)
- **Database**: PostgreSQL + Drizzle ORM (`lib/db`)
- **Auth**: JWT (jsonwebtoken) + bcrypt password hashing
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec in `lib/api-zod/openapi.yaml`)
- **Rich text**: Tiptap v3 (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-image`, `@tiptap/extension-underline`)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run typecheck:libs` — build composite libs (`lib/db`, `lib/api-zod`)
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Database Tables

### Core
- `students` — reg_number (PK), name, class, password_hash, is_default_password
- `teachers` — teacher_id (PK), name, subject, password_hash, staff_role, permissions (JSONB), assigned_class
- `exams` — id, subject, class, duration_minutes, start_time, end_time, created_by
- `questions` — id, exam_id (FK), question_text (HTML), option_a/b/c/d, correct_option
- `results` — id, student_reg, exam_id (FK), score, total, submitted_at
- `admins` — username (PK), name, password_hash

### Bursary / Fees
- `fee_types` — id, name, description, amount (integer, kobo/minor unit), is_mandatory, academic_year, created_by
- `student_fee_records` — id, fee_type_id (FK), student_reg (FK), amount_due, amount_paid, status (paid/unpaid/partial/waived), due_date, notes, updated_by
- `bursary_records` — student_reg (PK), payment_status (paid/unpaid/partial), amount_paid, notes, updated_by
- `bursary_overrides` — id, student_reg, exam_id, overridden_by, overrider_role, reason, expires_at

### Subjects
- `teacher_subjects` — id, teacher_id (FK), subject, section (junior/senior)
- `subject_change_requests` — id, teacher_id, teacher_name, action (add/remove), subject, section, reason, status (pending/approved/rejected), reviewed_by, review_note

## Staff Permissions

Per-staff JSONB flags on the `teachers` table:
- `manage_exams` — create/edit/delete own exams
- `view_all_exams` — access and modify all school exams
- `view_all_results` — view all student results
- `manage_students` — add/edit/delete student accounts
- `reset_student_exam` — delete a student result to allow retake
- `manage_student_roles` — manage class roles
- `manage_bursary` — create fee types, record payments (bursary manager)
- `mark_attendance` — record attendance for assigned class
- `override_exam_access` — grant exam access despite outstanding fees

## Role Presets (Frontend)

Teacher / HOD / Librarian / CBT Officer / Bursary Manager

## Login Credentials (Testing)

- **Admin**: username=`admin`, password=`Admin@1234` (Staff tab on login)
- **Teacher**: ID=`TCH001`, password=`staff123` (default)
- **Student**: reg=`10466`, password=`12345` (first login forces password change)

## Auth Rules

- JWT stored in localStorage as `cbt_token`
- Auto-logout after 30 minutes of inactivity
- Students forced to change default password before accessing dashboard
- Students only see exams for their class; cannot retake submitted exams
- Teachers can only edit their own exams (unless `view_all_exams` is granted)
- Bursary routes accessible to admin OR staff with `manage_bursary: true`
- Override routes accessible to admin OR staff with `override_exam_access: true`
- Students with unpaid **mandatory** fees cannot start exams (unless they have a valid override)

## Key Routes

### API (Express, base path `/api`)
- `POST /auth/login` — student/staff/admin login
- `GET /admin/students`, `POST`, `PUT /:reg`, `DELETE /:reg` — student CRUD
- `GET /admin/staff`, `POST`, `PUT /:id`, `DELETE /:id` — staff CRUD
- `GET/PUT /admin/staff/:staffId/subjects` — admin assign subjects
- `GET/PUT /admin/bursary`, `GET /admin/bursary/overrides`, `DELETE /admin/bursary/overrides/:id`
- `GET/POST /admin/bursary/fees`, `PUT/DELETE /admin/bursary/fees/:id`, `POST /admin/bursary/fees/:id/apply`
- `GET /admin/bursary/student-fees`, `PUT /admin/bursary/student-fees/:id`
- `POST /teacher/bursary/override` — create override (staff with override_exam_access)
- `GET /teacher/my-subjects`, `POST /teacher/my-subjects/request` — teacher subject management
- `GET /admin/subject-requests`, `PUT /admin/subject-requests/:id` — HOD/admin review requests
- `GET /student/exams`, `GET /student/exams/:id/start`, `POST /student/exams/:id/submit`
- `GET /student/bursary` — student fee view

### Frontend Pages
- `/` — login
- `/student/dashboard`, `/student/exam/:id`, `/student/results`, `/student/bursary`, `/student/profile`
- `/teacher/dashboard`, `/teacher/exams`, `/teacher/exam-form`, `/teacher/exam/:id`
- `/admin/dashboard`, `/admin/students`, `/admin/staff`, `/admin/bursary`, `/admin/settings`

## Components

- `components/rich-text-editor.tsx` — Tiptap WYSIWYG with Bold/Italic/Underline/BulletList/Image toolbar
- `components/rich-text-editor.tsx#RichTextDisplay` — read-only HTML renderer (used in student exam view)
- `pages/teacher/question-form.tsx` — uses RichTextEditor for question authoring
- `pages/student/exam.tsx` — renders question HTML via dangerouslySetInnerHTML + prose classes

## Grading Scale

A: 75%+ | B: 60%+ | C: 50%+ | D: 45%+ | F: below 45%

## Notes

- Fee amounts are stored as integers (naira, not kobo — displayed with ₦ + toLocaleString)
- `@tailwindcss/typography` is NOT installed — prose/prose-lg classes are from a CDN or inline styles
- Questions can contain HTML (bold, italic, underline, images up to 2MB as base64) authored via the Tiptap editor
