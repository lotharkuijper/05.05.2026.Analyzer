import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  agentsTable,
  documentsTable,
  analysesTable,
} from "@workspace/db/schema";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

const agentInsertSchema = z.object({
  name: z.string().min(1),
  role: z.string().default(""),
  system_prompt: z.string().default(""),
  api_provider: z.string().default("groq"),
  model: z.string().default(""),
  is_default: z.boolean().optional(),
  is_reviewer: z.boolean().optional(),
  is_synthesizer: z.boolean().optional(),
  color: z.string().default("#3b82f6"),
});

const agentUpdateSchema = agentInsertSchema.partial();

const documentInsertSchema = z.object({
  name: z.string().min(1),
  file_type: z.string().default("pdf"),
  extracted_text: z.string().default(""),
  sections: z.unknown().optional(),
  file_size: z.number().int().nonnegative().optional(),
});

const documentUpdateSchema = documentInsertSchema.partial();

const analysisInsertSchema = z.object({
  document_id: z.string().uuid(),
  agent_id: z.string().uuid(),
  status: z.string().default("pending"),
  result: z.string().optional(),
  error_message: z.string().optional(),
  completed_at: z.string().datetime().optional().nullable(),
});

const analysisUpdateSchema = z.object({
  status: z.string().optional(),
  result: z.string().optional(),
  error_message: z.string().optional(),
  completed_at: z.union([z.string().datetime(), z.null()]).optional(),
});

function handleError(req: Request, res: Response, err: unknown, label: string) {
  req.log.error({ err }, label);
  const msg = err instanceof Error ? err.message : label;
  res.status(500).json({ error: msg });
}

function parseOrZodError(
  res: Response,
  schema: z.ZodTypeAny,
  body: unknown,
): { ok: true; data: unknown } | { ok: false } {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation failed", details: parsed.error.flatten() });
    return { ok: false };
  }
  return { ok: true, data: parsed.data };
}

const uuidParam = z.string().uuid();

// ---------- agents ----------

router.get("/agents", async (req, res) => {
  try {
    const orderCol = typeof req.query.order === "string" ? req.query.order : null;
    const base = db.select().from(agentsTable);
    const rows = orderCol === "created_at"
      ? await base.orderBy(asc(agentsTable.created_at))
      : orderCol === "name"
      ? await base.orderBy(asc(agentsTable.name))
      : await base;
    res.json(rows);
  } catch (err) {
    handleError(req, res, err, "agents.list failed");
  }
});

router.post("/agents", async (req, res) => {
  const parsed = parseOrZodError(res, agentInsertSchema, req.body?.row ?? req.body);
  if (!parsed.ok) return;
  try {
    const [row] = await db
      .insert(agentsTable)
      .values(parsed.data as typeof agentsTable.$inferInsert)
      .returning();
    res.json({ row, rows: [row] });
  } catch (err) {
    handleError(req, res, err, "agents.insert failed");
  }
});

router.patch("/agents/:id", async (req, res) => {
  const id = uuidParam.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: "invalid id" });
  const parsed = parseOrZodError(res, agentUpdateSchema, req.body?.row ?? req.body);
  if (!parsed.ok) return;
  try {
    const [row] = await db
      .update(agentsTable)
      .set({
        ...(parsed.data as Partial<typeof agentsTable.$inferInsert>),
        updated_at: new Date(),
      })
      .where(eq(agentsTable.id, id.data))
      .returning();
    res.json({ row, rows: row ? [row] : [] });
  } catch (err) {
    handleError(req, res, err, "agents.update failed");
  }
});

router.delete("/agents/:id", async (req, res) => {
  const id = uuidParam.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: "invalid id" });
  try {
    await db.delete(agentsTable).where(eq(agentsTable.id, id.data));
    res.json({ ok: true });
  } catch (err) {
    handleError(req, res, err, "agents.delete failed");
  }
});

// ---------- documents ----------

router.get("/documents", async (req, res) => {
  try {
    const orderCol = typeof req.query.order === "string" ? req.query.order : null;
    const base = db.select().from(documentsTable);
    const rows = orderCol === "created_at"
      ? await base.orderBy(asc(documentsTable.created_at))
      : await base;
    res.json(rows);
  } catch (err) {
    handleError(req, res, err, "documents.list failed");
  }
});

router.post("/documents", async (req, res) => {
  const parsed = parseOrZodError(res, documentInsertSchema, req.body?.row ?? req.body);
  if (!parsed.ok) return;
  try {
    const [row] = await db
      .insert(documentsTable)
      .values(parsed.data as typeof documentsTable.$inferInsert)
      .returning();
    res.json({ row, rows: [row] });
  } catch (err) {
    handleError(req, res, err, "documents.insert failed");
  }
});

router.patch("/documents/:id", async (req, res) => {
  const id = uuidParam.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: "invalid id" });
  const parsed = parseOrZodError(res, documentUpdateSchema, req.body?.row ?? req.body);
  if (!parsed.ok) return;
  try {
    const [row] = await db
      .update(documentsTable)
      .set(parsed.data as Partial<typeof documentsTable.$inferInsert>)
      .where(eq(documentsTable.id, id.data))
      .returning();
    res.json({ row, rows: row ? [row] : [] });
  } catch (err) {
    handleError(req, res, err, "documents.update failed");
  }
});

router.delete("/documents/:id", async (req, res) => {
  const id = uuidParam.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: "invalid id" });
  try {
    await db.delete(documentsTable).where(eq(documentsTable.id, id.data));
    res.json({ ok: true });
  } catch (err) {
    handleError(req, res, err, "documents.delete failed");
  }
});

// ---------- analyses ----------

router.get("/analyses", async (req, res) => {
  try {
    const orderCol = typeof req.query.order === "string" ? req.query.order : null;
    let rows;
    if (typeof req.query.eq_document_id === "string") {
      const did = uuidParam.safeParse(req.query.eq_document_id);
      if (!did.success) return res.status(400).json({ error: "invalid eq_document_id" });
      const q = db.select().from(analysesTable).where(eq(analysesTable.document_id, did.data));
      rows = orderCol === "created_at" ? await q.orderBy(asc(analysesTable.created_at)) : await q;
    } else {
      const q = db.select().from(analysesTable);
      rows = orderCol === "created_at" ? await q.orderBy(asc(analysesTable.created_at)) : await q;
    }
    res.json(rows);
  } catch (err) {
    handleError(req, res, err, "analyses.list failed");
  }
});

router.post("/analyses", async (req, res) => {
  const parsed = parseOrZodError(res, analysisInsertSchema, req.body?.row ?? req.body);
  if (!parsed.ok) return;
  try {
    const data = parsed.data as z.infer<typeof analysisInsertSchema>;
    const [row] = await db
      .insert(analysesTable)
      .values({
        ...data,
        completed_at: data.completed_at ? new Date(data.completed_at) : null,
      })
      .returning();
    res.json({ row, rows: [row] });
  } catch (err) {
    handleError(req, res, err, "analyses.insert failed");
  }
});

router.patch("/analyses/:id", async (req, res) => {
  const id = uuidParam.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: "invalid id" });
  const parsed = parseOrZodError(res, analysisUpdateSchema, req.body?.row ?? req.body);
  if (!parsed.ok) return;
  try {
    const data = parsed.data as z.infer<typeof analysisUpdateSchema>;
    const updateValues: Partial<typeof analysesTable.$inferInsert> = {};
    if (data.status !== undefined) updateValues.status = data.status;
    if (data.result !== undefined) updateValues.result = data.result;
    if (data.error_message !== undefined) updateValues.error_message = data.error_message;
    if (data.completed_at !== undefined) {
      updateValues.completed_at = data.completed_at ? new Date(data.completed_at) : null;
    }
    const [row] = await db
      .update(analysesTable)
      .set(updateValues)
      .where(eq(analysesTable.id, id.data))
      .returning();
    res.json({ row, rows: row ? [row] : [] });
  } catch (err) {
    handleError(req, res, err, "analyses.update failed");
  }
});

router.delete("/analyses/:id", async (req, res) => {
  const id = uuidParam.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: "invalid id" });
  try {
    await db.delete(analysesTable).where(eq(analysesTable.id, id.data));
    res.json({ ok: true });
  } catch (err) {
    handleError(req, res, err, "analyses.delete failed");
  }
});

export default router;
