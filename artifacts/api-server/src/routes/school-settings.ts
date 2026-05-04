import { Router, type IRouter } from "express";
import { db, schoolSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { z } from "zod";

const router: IRouter = Router();

router.get("/settings/school", requireAuth, async (_req, res): Promise<void> => {
  const settings = await db.select().from(schoolSettingsTable);
  const map: Record<string, string> = {};
  settings.forEach(s => { map[s.key] = s.value; });
  res.json({
    schoolName: map["school_name"] ?? "Toke Schools",
    portalTagline: map["portal_tagline"] ?? "Computer Based Testing Portal",
    schoolLogo: map["school_logo"] ?? "",
  });
});

router.get("/settings/school/public", async (_req, res): Promise<void> => {
  const settings = await db.select().from(schoolSettingsTable);
  const map: Record<string, string> = {};
  settings.forEach(s => { map[s.key] = s.value; });
  res.json({
    schoolName: map["school_name"] ?? "Toke Schools",
    portalTagline: map["portal_tagline"] ?? "Computer Based Testing Portal",
    schoolLogo: map["school_logo"] ?? "",
  });
});

const UpdateSchoolSettingsBody = z.object({
  schoolName: z.string().min(1).optional(),
  portalTagline: z.string().optional(),
  schoolLogo: z.string().optional(),
});

router.put("/admin/settings/school", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const body = UpdateSchoolSettingsBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const updates: { key: string; value: string }[] = [];
  if (body.data.schoolName !== undefined) updates.push({ key: "school_name", value: body.data.schoolName });
  if (body.data.portalTagline !== undefined) updates.push({ key: "portal_tagline", value: body.data.portalTagline });
  if (body.data.schoolLogo !== undefined) updates.push({ key: "school_logo", value: body.data.schoolLogo });

  for (const { key, value } of updates) {
    const [existing] = await db.select().from(schoolSettingsTable).where(eq(schoolSettingsTable.key, key));
    if (existing) {
      await db.update(schoolSettingsTable).set({ value }).where(eq(schoolSettingsTable.key, key));
    } else {
      await db.insert(schoolSettingsTable).values({ key, value });
    }
  }

  res.json({ success: true });
});

export default router;
