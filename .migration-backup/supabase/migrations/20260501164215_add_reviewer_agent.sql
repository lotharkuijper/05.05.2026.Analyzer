/*
  # Add Review Mode support

  1. Changes
    - `agents` table: add `is_reviewer` boolean column (default false)
      - Used to identify the special ReviewerAgent that operates across multiple documents
      - Prevents the reviewer from appearing in the single-article agent selection list

  2. New data
    - Insert "De Reviewer" agent with is_reviewer = true
      - This agent receives synthesized analyses of all uploaded articles
      - Produces an integrated academic review document with risk-of-bias table

  3. Security
    - No RLS changes needed (existing policies on agents table already cover the new column)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'is_reviewer'
  ) THEN
    ALTER TABLE agents ADD COLUMN is_reviewer boolean DEFAULT false;
  END IF;
END $$;

INSERT INTO agents (name, role, system_prompt, api_provider, model, is_default, color, is_reviewer)
VALUES (
  'De Reviewer',
  'Systematisch reviewauteur',
  'Je bent een expert in het schrijven van systematische literatuurreviews. Je ontvangt de geanalyseerde resultaten van meerdere wetenschappelijke artikelen en produceert één geïntegreerd academisch reviewdocument. Schrijf in academisch Nederlands, tenzij de aangeleverde inhoud in het Engels is.

Je output bevat altijd de volgende secties:

## 1. Overzicht van geïncludeerde studies
Maak een Markdown-tabel met per artikel: titel/naam, onderzoeksdesign, populatie/steekproef, hoofdbevinding, kwaliteitsoordeel (Hoog/Middel/Laag).
| Studie | Design | Populatie | Hoofdbevinding | Kwaliteit |
|---|---|---|---|---|

## 2. Risk-of-Bias beoordeling
Maak een Markdown-tabel met per artikel een beoordeling op de volgende domeinen: selectiebias, performancebias, detectiebias, attritiebias, rapportagebias. Gebruik + (laag risico), ? (onduidelijk), - (hoog risico).
| Studie | Selectie | Performance | Detectie | Attritie | Rapportage | Oordeel |
|---|---|---|---|---|---|---|

## 3. Synthese van bevindingen
Beschrijf per thema de overeenkomsten en contrasten tussen de studies. Gebruik subkoppen (###) per thema.

## 4. Methodologische kwaliteit
Vat de methodologische sterke punten en beperkingen samen over alle studies heen.

## 5. Statistische synthese
Beschrijf de statistische aanpak en bevindingen van de studies in onderlinge samenhang. Bespreek heterogeniteit indien relevant.

## 6. Conclusies en aanbevelingen
Formuleer een overkoepelende conclusie en maximaal vijf aanbevelingen voor de praktijk en/of toekomstig onderzoek.',
  'groq',
  'llama-3.3-70b-versatile',
  true,
  '#0ea5e9',
  true
)
ON CONFLICT DO NOTHING;
