import { Router, type IRouter } from "express";
import { db, teacherSubjectsTable, subjectChangeRequestsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { z } from "zod";

const router: IRouter = Router();

const RequestSubjectBody = z.object({
  action: z.enum(["add", "remove"]),
  subject: z.string().min(1),
  section: z.enum(["junior", "senior"]),
  reason: z.string().default(""),
});

const ReviewRequestBody = z.object({
  status: z.enum(["approved", "rejected"]),
  reviewNote: z.string().optional(),
});

// Teacher: view own subjects
router.get("/teacher/my-subjects", requireAuth, requireRole("staff"), async (req, res): Promise<void> => {
  const subjects = await db
    .select()
    .from(teacherSubjectsTable)
    .where(eq(teacherSubjectsTable.teacherId, req.user!.id))
    .orderBy(teacherSubjectsTable.section, teacherSubjectsTable.subject);
  res.json(subjects);
});

// Teacher: submit a subject change request
router.post("/teacher/my-subjects/request", requireAuth, requireRole("staff"), async (req, res): Promise<void> => {
  const body = RequestSubjectBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const user = req.user!;

  // If removing, check the subject actually exists on this teacher
  if (body.data.action === "remove") {
    const [existing] = await db
      .select()
      .from(teacherSubjectsTable)
      .where(
        and(
          eq(teacherSubjectsTable.teacherId, user.id),
          eq(teacherSubjectsTable.subject, body.data.subject),
          eq(teacherSubjectsTable.section, body.data.section),
        )
      );
    if (!existing) {
      res.status(404).json({ error: "Subject not found in your teaching list" });
      return;
    }
  }

  const [request] = await db
    .insert(subjectChangeRequestsTable)
    .values({
      teacherId: user.id,
      teacherName: user.name ?? user.id,
      action: body.data.action,
      subject: body.data.subject,
      section: body.data.section,
      reason: body.data.reason,
    })
    .returning();

  res.status(201).json(request);
});

// Teacher: view own subject change requests
router.get("/teacher/my-subjects/requests", requireAuth, requireRole("staff"), async (req, res): Promise<void> => {
  const requests = await db
    .select()
    .from(subjectChangeRequestsTable)
    .where(eq(subjectChangeRequestsTable.teacherId, req.user!.id))
    .orderBy(desc(subjectChangeRequestsTable.createdAt));
  res.json(requests);
});

// Admin/HOD: list all pending subject change requests
router.get("/admin/subject-requests", requireAuth, requireRole("admin", "staff"), async (req, res): Promise<void> => {
  const user = req.user!;
  if (user.role !== "admin" && !user.permissions?.view_all_exams) {
    res.status(403).json({ error: "Only HOD or admin can view subject change requests" });
    return;
  }
  const requests = await db
    .select()
    .from(subjectChangeRequestsTable)
    .orderBy(desc(subjectChangeRequestsTable.createdAt));
  res.json(requests);
});

// Admin/HOD: approve or reject a subject change request
router.put("/admin/subject-requests/:id", requireAuth, requireRole("admin", "staff"), async (req, res): Promise<void> => {
  const user = req.user!;
  if (user.role !== "admin" && !user.permissions?.view_all_exams) {
    res.status(403).json({ error: "Only HOD or admin can review subject change requests" });
    return;
  }

  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid request ID" });
    return;
  }

  const body = ReviewRequestBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [request] = await db
    .select()
    .from(subjectChangeRequestsTable)
    .where(eq(subjectChangeRequestsTable.id, id));

  if (!request) {
    res.status(404).json({ error: "Request not found" });
    return;
  }

  if (request.status !== "pending") {
    res.status(409).json({ error: "This request has already been reviewed" });
    return;
  }

  // Apply the change if approved
  if (body.data.status === "approved") {
    if (request.action === "add") {
      // Only add if it doesn't already exist
      const [existing] = await db
        .select()
        .from(teacherSubjectsTable)
        .where(
          and(
            eq(teacherSubjectsTable.teacherId, request.teacherId),
            eq(teacherSubjectsTable.subject, request.subject),
            eq(teacherSubjectsTable.section, request.section as "junior" | "senior"),
          )
        );
      if (!existing) {
        await db.insert(teacherSubjectsTable).values({
          teacherId: request.teacherId,
          subject: request.subject,
          section: request.section as "junior" | "senior",
        });
      }
    } else if (request.action === "remove") {
      await db
        .delete(teacherSubjectsTable)
        .where(
          and(
            eq(teacherSubjectsTable.teacherId, request.teacherId),
            eq(teacherSubjectsTable.subject, request.subject),
            eq(teacherSubjectsTable.section, request.section as "junior" | "senior"),
          )
        );
    }
  }

  await db
    .update(subjectChangeRequestsTable)
    .set({
      status: body.data.status,
      reviewedBy: user.name ?? user.id,
      reviewNote: body.data.reviewNote ?? null,
      updatedAt: new Date(),
    })
    .where(eq(subjectChangeRequestsTable.id, id));

  res.json({ success: true, message: `Request ${body.data.status}` });
});

// Admin: directly assign subjects to a teacher (initial assignment, no request needed)
router.post("/admin/staff/:staffId/subjects", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const { staffId } = req.params as { staffId: string };
  const body = z.object({
    subjects: z.array(z.object({
      subject: z.string().min(1),
      section: z.enum(["junior", "senior"]),
    })),
  }).safeParse(req.body);

  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  // Replace all subjects for this teacher
  await db.delete(teacherSubjectsTable).where(eq(teacherSubjectsTable.teacherId, staffId));
  if (body.data.subjects.length > 0) {
    await db.insert(teacherSubjectsTable).values(
      body.data.subjects.map(s => ({
        teacherId: staffId,
        subject: s.subject,
        section: s.section,
      }))
    );
  }
  res.json({ success: true });
});

// Admin: get a teacher's subjects
router.get("/admin/staff/:staffId/subjects", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const subjects = await db
    .select()
    .from(teacherSubjectsTable)
    .where(eq(teacherSubjectsTable.teacherId, req.params.staffId as string))
    .orderBy(teacherSubjectsTable.section, teacherSubjectsTable.subject);
  res.json(subjects);
});

export default router;
