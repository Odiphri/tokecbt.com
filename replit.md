# Toke Schools CBT Portal

## Overview

A full-stack Computer Based Testing (CBT) web application for Toke Schools. Students can take timed exams and view results. Teachers can manage exams, add questions, and view student performance. Admins can manage student and teacher accounts.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + Tailwind CSS (artifacts/cbt-portal) — dark navy (#0B1E3D) + dark green (#0A4522) school colors
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM (lib/db)
- **Auth**: JWT (jsonwebtoken) + bcrypt password hashing
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Database Tables

- `students` — reg_number (PK), name, class, password_hash, is_default_password
- `teachers` — teacher_id (PK), name, subject, password_hash
- `exams` — id, subject, class, duration_minutes, start_time, end_time, created_by, created_at
- `questions` — id, exam_id (FK), question_text, option_a/b/c/d, correct_option
- `results` — id, student_reg, exam_id (FK), score, total, submitted_at
- `admins` — username (PK), name, password_hash

## Seed Credentials (for testing)

- Student 1: reg=10466, password=12345 (default, must change on first login)
- Student 2: reg=10201, password=12345 (default, must change on first login)
- Teacher: ID=TCH001, password=teacher123
- Admin: username=admin, password=admin123
- Sample exam: Mathematics, JSS 3A, 30 minutes, 5 MCQ questions

## Grading Scale

- A: 75%+ | B: 60%+ | C: 50%+ | D: 45%+ | F: below 45%

## Auth Rules

- JWT stored in localStorage as `cbt_token`
- Auto-logout after 30 minutes of inactivity
- Students forced to change default password before accessing dashboard
- Students only see exams for their class
- Students cannot retake submitted exams
- Teachers can only edit their own exams
- Admins (username/password login) can create, edit, delete students and teachers; password reset available for students
