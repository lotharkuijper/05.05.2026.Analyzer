import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { z } from "zod";

const router: IRouter = Router();

const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

const client = baseURL && apiKey ? new OpenAI({ apiKey, baseURL }) : null;

const REQUESTED_TO_SUPPORTED_MODEL: Record<string, string> = {
  "llama-3.3-70b-versatile": "gpt-4o-mini",
  "llama-3.1-8b-instant": "gpt-4o-mini",
  "mixtral-8x7b-32768": "gpt-4o-mini",
  "gpt-4o-mini": "gpt-4o-mini",
  "gpt-3.5-turbo": "gpt-4o-mini",
  "gemini-1.5-flash": "gpt-4o-mini",
  "gemini-1.5-pro": "gpt-4o-mini",
};

const chatBodySchema = z.object({
  system: z.string().default(""),
  prompt: z.string().min(1),
  model: z.string().optional(),
  max_tokens: z.number().int().positive().max(8192).optional(),
});

router.post("/ai/chat", async (req, res) => {
  if (!client) {
    return res.status(503).json({
      error:
        "AI integration is not provisioned. Set AI_INTEGRATIONS_OPENAI_BASE_URL and AI_INTEGRATIONS_OPENAI_API_KEY.",
    });
  }
  const parsed = chatBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "validation failed", details: parsed.error.flatten() });
  }
  const { system, prompt, model, max_tokens } = parsed.data;
  const resolvedModel = (model && REQUESTED_TO_SUPPORTED_MODEL[model]) || "gpt-4o-mini";

  try {
    const completion = await client.chat.completions.create({
      model: resolvedModel,
      max_tokens: max_tokens ?? 2048,
      temperature: 0.7,
      messages: [
        ...(system ? [{ role: "system" as const, content: system }] : []),
        { role: "user" as const, content: prompt },
      ],
    });
    const content = completion.choices[0]?.message?.content ?? "";
    res.json({ content });
  } catch (err) {
    req.log.error({ err }, "ai.chat failed");
    const msg = err instanceof Error ? err.message : "AI request failed";
    res.status(502).json({ error: msg });
  }
});

export default router;
