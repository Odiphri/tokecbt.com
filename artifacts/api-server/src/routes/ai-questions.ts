import { Router, type IRouter } from "express";
import { requireAuth, requireRole } from "../middlewares/auth";
import { z } from "zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const GenerateQuestionsBody = z.object({
  subject: z.string().min(1),
  topics: z.string().min(1),
  count: z.number().int().min(1).max(50),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
});

function canManageExams(user: Express.Request["user"]): boolean {
  return user?.role === "admin" || !!user?.permissions?.manage_exams;
}

router.post("/teacher/ai-questions", requireAuth, requireRole("staff", "admin"), async (req, res): Promise<void> => {
  if (!canManageExams(req.user)) {
    res.status(403).json({ error: "You do not have permission to generate questions" });
    return;
  }

  const parsed = GenerateQuestionsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "AI question generation is not configured. Please set OPENAI_API_KEY in your environment." });
    return;
  }

  const { subject, topics, count, difficulty = "medium" } = parsed.data;

  const prompt = `You are an expert ${subject} teacher creating a multiple-choice exam for secondary school students.

Generate exactly ${count} multiple-choice questions on the following topics: ${topics}.
Difficulty level: ${difficulty}.

Rules:
- Each question must have exactly 4 options (A, B, C, D)
- Only one option is correct
- Questions must be clear and unambiguous
- Vary the correct answer position (don't always use A)

Return ONLY a valid JSON array in this exact format, no other text:
[
  {
    "questionText": "Question here?",
    "optionA": "First option",
    "optionB": "Second option",
    "optionC": "Third option",
    "optionD": "Fourth option",
    "correctOption": "A"
  }
]`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      logger.error({ status: response.status, err }, "OpenAI API error");
      res.status(502).json({ error: "AI service returned an error. Please try again." });
      return;
    }

    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      res.status(502).json({ error: "AI returned an empty response" });
      return;
    }

    let questions: any[];
    try {
      const parsed = JSON.parse(content);
      questions = Array.isArray(parsed) ? parsed : (parsed.questions ?? Object.values(parsed)[0]);
      if (!Array.isArray(questions)) throw new Error("Not an array");
    } catch {
      res.status(502).json({ error: "AI returned malformed data. Please try again." });
      return;
    }

    const validated = questions.slice(0, count).map((q: any) => ({
      questionText: String(q.questionText ?? ""),
      optionA: String(q.optionA ?? ""),
      optionB: String(q.optionB ?? ""),
      optionC: String(q.optionC ?? ""),
      optionD: String(q.optionD ?? ""),
      correctOption: ["A", "B", "C", "D"].includes(q.correctOption) ? q.correctOption : "A",
    })).filter(q => q.questionText && q.optionA && q.optionB && q.optionC && q.optionD);

    res.json({ questions: validated });
  } catch (err) {
    logger.error({ err }, "AI question generation failed");
    res.status(500).json({ error: "Failed to generate questions. Please try again." });
  }
});

export default router;
