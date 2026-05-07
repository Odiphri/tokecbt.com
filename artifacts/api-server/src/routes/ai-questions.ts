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

function buildPrompt(subject: string, topics: string, count: number, difficulty: string): string {
  return `You are an expert ${subject} teacher creating a multiple-choice exam for secondary school students.

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
}

function parseQuestions(content: string, count: number) {
  const parsed = JSON.parse(content);
  const questions: any[] = Array.isArray(parsed)
    ? parsed
    : (parsed.questions ?? (Object.values(parsed)[0] as any[]));
  if (!Array.isArray(questions)) throw new Error("Not an array");
  return questions
    .slice(0, count)
    .map((q: any) => ({
      questionText: String(q.questionText ?? ""),
      optionA: String(q.optionA ?? ""),
      optionB: String(q.optionB ?? ""),
      optionC: String(q.optionC ?? ""),
      optionD: String(q.optionD ?? ""),
      correctOption: ["A", "B", "C", "D"].includes(q.correctOption) ? q.correctOption : "A",
    }))
    .filter((q: any) => q.questionText && q.optionA && q.optionB && q.optionC && q.optionD);
}

async function callOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  prompt: string,
  providerName: string
): Promise<string> {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`${providerName} error ${response.status}: ${err}`);
  }

  const data = (await response.json()) as any;
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error(`${providerName} returned empty response`);
  return content;
}

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini error ${response.status}: ${err}`);
  }

  const data = (await response.json()) as any;
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error("Gemini returned empty response");
  return content;
}

router.post(
  "/teacher/ai-questions",
  requireAuth,
  requireRole("staff", "admin"),
  async (req, res): Promise<void> => {
    if (!canManageExams(req.user)) {
      res.status(403).json({ error: "You do not have permission to generate questions" });
      return;
    }

    const parsed = GenerateQuestionsBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const { subject, topics, count, difficulty = "medium" } = parsed.data;
    const prompt = buildPrompt(subject, topics, count, difficulty);

    const replitBaseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
    const replitApiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
    const userOpenaiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    let content: string | null = null;
    let usedProvider = "";

    // 1. Replit-managed proxy (no user key needed)
    if (replitBaseUrl && replitApiKey) {
      try {
        content = await callOpenAICompatible(replitBaseUrl, replitApiKey, prompt, "Replit AI proxy");
        usedProvider = "replit-proxy";
      } catch (err) {
        logger.warn({ err }, "Replit AI proxy failed, trying next provider");
      }
    }

    // 2. User's own OpenAI key
    if (!content && userOpenaiKey) {
      try {
        content = await callOpenAICompatible(
          "https://api.openai.com/v1",
          userOpenaiKey,
          prompt,
          "OpenAI"
        );
        usedProvider = "openai";
      } catch (err) {
        logger.warn({ err }, "OpenAI failed, trying Gemini");
      }
    }

    // 3. Gemini fallback
    if (!content && geminiKey) {
      try {
        content = await callGemini(geminiKey, prompt);
        usedProvider = "gemini";
      } catch (err) {
        logger.error({ err }, "Gemini also failed");
      }
    }

    if (!content) {
      res.status(502).json({ error: "Failed to generate questions. Please try again shortly." });
      return;
    }

    try {
      const questions = parseQuestions(content, count);
      logger.info({ usedProvider, count: questions.length }, "AI questions generated");
      res.json({ questions });
    } catch (err) {
      logger.error({ err, usedProvider }, "Failed to parse AI response");
      res.status(502).json({ error: "AI returned malformed data. Please try again." });
    }
  }
);

export default router;
