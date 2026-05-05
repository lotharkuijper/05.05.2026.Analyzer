import {
  pgTable,
  text,
  uuid,
  boolean,
  jsonb,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

export const agentsTable = pgTable("agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  role: text("role").notNull().default(""),
  system_prompt: text("system_prompt").notNull().default(""),
  api_provider: text("api_provider").notNull().default("groq"),
  model: text("model").notNull().default(""),
  is_default: boolean("is_default").default(false),
  is_reviewer: boolean("is_reviewer").default(false),
  is_synthesizer: boolean("is_synthesizer").default(false),
  color: text("color").notNull().default("#3b82f6"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const documentsTable = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  file_type: text("file_type").notNull().default("pdf"),
  extracted_text: text("extracted_text").notNull().default(""),
  sections: jsonb("sections").default({}),
  file_size: integer("file_size").default(0),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const analysesTable = pgTable("analyses", {
  id: uuid("id").primaryKey().defaultRandom(),
  document_id: uuid("document_id").notNull(),
  agent_id: uuid("agent_id").notNull(),
  status: text("status").notNull().default("pending"),
  result: text("result").default(""),
  error_message: text("error_message").default(""),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completed_at: timestamp("completed_at", { withTimezone: true }),
});
