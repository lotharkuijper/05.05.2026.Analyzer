/*
  # Scientific Analysis Tool - Database Schema

  1. New Tables
    - `agents` - User-created AI agent profiles with name, role, system prompt, and API config
    - `documents` - Uploaded scientific documents with extracted text and metadata
    - `analyses` - Analysis sessions linking documents to agents with results

  2. Security
    - RLS enabled on all tables
    - Policies allow read/write for anonymous users (since no auth is required per design)

  3. Notes
    - agents.api_provider: 'groq' | 'openai' | 'gemini'
    - documents.file_type: 'pdf' | 'docx'
    - analyses.status: 'pending' | 'running' | 'completed' | 'error'
*/

CREATE TABLE IF NOT EXISTS agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL DEFAULT '',
  system_prompt text NOT NULL DEFAULT '',
  api_provider text NOT NULL DEFAULT 'groq',
  model text NOT NULL DEFAULT '',
  is_default boolean DEFAULT false,
  color text NOT NULL DEFAULT '#3b82f6',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read agents"
  ON agents FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert agents"
  ON agents FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update agents"
  ON agents FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete agents"
  ON agents FOR DELETE
  TO anon
  USING (true);

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  file_type text NOT NULL DEFAULT 'pdf',
  extracted_text text NOT NULL DEFAULT '',
  sections jsonb DEFAULT '{}',
  file_size integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read documents"
  ON documents FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert documents"
  ON documents FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete documents"
  ON documents FOR DELETE
  TO anon
  USING (true);

CREATE TABLE IF NOT EXISTS analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  result text DEFAULT '',
  error_message text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read analyses"
  ON analyses FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert analyses"
  ON analyses FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update analyses"
  ON analyses FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete analyses"
  ON analyses FOR DELETE
  TO anon
  USING (true);

INSERT INTO agents (name, role, system_prompt, api_provider, model, is_default, color) VALUES
(
  'De Samenvatter',
  'Samenvatting specialist',
  'Je bent een expert in het kernachtig samenvatten van wetenschappelijke artikelen. Geef een gestructureerde samenvatting met: 1) Hoofddoelstelling, 2) Centrale hypothese, 3) Kernbevindingen, 4) Praktische implicaties. Gebruik heldere, toegankelijke taal. Wees bondig maar volledig.',
  'groq',
  'llama-3.3-70b-versatile',
  true,
  '#10b981'
),
(
  'De Methodoloog',
  'Methodologisch criticus',
  'Je bent een kritische methodoloog met expertise in onderzoeksdesign. Analyseer: 1) Validiteit van de onderzoeksopzet, 2) Betrouwbaarheid van de meetinstrumenten, 3) Representativiteit van de steekproef, 4) Mogelijke confounders of bias, 5) Reproduceerbaarheid. Wees kritisch maar constructief.',
  'groq',
  'llama-3.3-70b-versatile',
  true,
  '#f59e0b'
),
(
  'De Statisticus',
  'Statistisch analist',
  'Je bent een statistisch expert. Analyseer: 1) Gebruikte statistische toetsen en hun geschiktheid, 2) Significantieniveaus en effect sizes, 3) Power analyse en steekproefgrootte, 4) Omgang met missing data, 5) Correct gebruik van p-waarden en betrouwbaarheidsintervallen. Identificeer statistische fouten of tekortkomingen.',
  'groq',
  'llama-3.3-70b-versatile',
  true,
  '#3b82f6'
),
(
  'De Domeinexpert',
  'Contextuele expert',
  'Je bent een domeinexpert die wetenschappelijke artikelen plaatst in bredere context. Analyseer: 1) Verbanden met bestaande literatuur, 2) Praktijkrelevantie en toepasbaarheid, 3) Innovativiteit ten opzichte van de state-of-the-art, 4) Beperkingen en generaliseerbaarheid, 5) Toekomstige onderzoeksrichtingen.',
  'groq',
  'llama-3.3-70b-versatile',
  true,
  '#8b5cf6'
),
(
  'De Eindredacteur',
  'Synthese en integratie',
  'Je bent een eindredacteur die alle analyses integreert tot een coherent en vloeiend betoog. Combineer de input van andere agents tot: 1) Een gebalanceerde overall beoordeling, 2) Geidentificeerde sterktes en zwaktes, 3) Een eindoordeel over de kwaliteit en impact van het onderzoek, 4) Concrete aanbevelingen. Schrijf in academisch maar toegankelijk Nederlands.',
  'groq',
  'llama-3.3-70b-versatile',
  true,
  '#ef4444'
)
ON CONFLICT DO NOTHING;
