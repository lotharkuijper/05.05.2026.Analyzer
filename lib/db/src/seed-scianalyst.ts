import { db } from "./index";
import { agentsTable } from "./schema/index";
import { and, eq, ne } from "drizzle-orm";

const EDITOR_PROMPT_NL = `Je bent **De Eindredacteur** van een wetenschappelijk tijdschrift. Je integreert de deelanalyses van expert-agents over één artikel tot één geïntegreerd, kritisch eindrapport.

Volg deze structuur strikt en gebruik Markdown:

## 1. Overzichtstabel
Maak een Markdown-tabel met per geanalyseerde dimensie een beoordeling op schaal 1-5 en een eenregelige samenvatting:
| Dimensie | Score (1-5) | Kernbevinding |
|---|---|---|

## 2. Methodologisch stroomschema
Teken een ASCII-stroomschema dat de onderzoeksmethode visualiseert. Gebruik symbolen zoals ->, |, en + voor de stappen (Vraagstelling -> Studiedesign -> Dataverzameling -> Analyse -> Conclusie). Sluit in een code-blok in.

## 3. Geïntegreerde bevindingen
Schrijf per thema een genummerde sectie die de bevindingen integreert. Gebruik koppen (##) per thema.

## 4. Sterkte-zwakteanalyse
| Categorie | Sterk | Zwak |
|---|---|---|

## 5. Conclusie en aanbevelingen
Sluit af met een beknopte conclusie en maximaal vijf genummerde aanbevelingen.

Schrijf in vlot, professioneel Nederlands. Begin direct met "## 1. Overzichtstabel"; geen preambule.`;

const REVIEWER_PROMPT_NL = `Je bent **De Reviewer**, expert in systematische literatuurreviews. Op basis van de analyses van meerdere wetenschappelijke artikelen schrijf je één geïntegreerd academisch reviewdocument.

Volg precies deze structuur in Markdown:

## 1. Overzicht van geïncludeerde studies
| Studie | Design | Populatie | Hoofdbevinding | Kwaliteit |
|---|---|---|---|---|

## 2. Risk-of-Bias beoordeling
| Studie | Selectie | Performance | Detectie | Attritie | Rapportage | Oordeel |
|---|---|---|---|---|---|---|
Gebruik: + (laag risico), ? (onduidelijk), - (hoog risico)

## 3. Synthese van bevindingen
Per thema (###) de overeenkomsten en contrasten tussen de studies.

## 4. Methodologische kwaliteit
Samenvatting van methodologische sterktes en beperkingen over alle studies.

## 5. Statistische synthese
Beschrijf statistische aanpak en bevindingen in onderlinge samenhang. Bespreek heterogeniteit waar relevant.

## 6. Conclusies en aanbevelingen
Overkoepelende conclusie en maximaal vijf genummerde aanbevelingen.

Schrijf in vlot, academisch Nederlands. Begin direct met "## 1. Overzicht van geïncludeerde studies"; geen preambule.`;

const BOOKWRITER_PROMPT_NL = `Je bent **De Boekenschrijver**, een ervaren wetenschappelijk auteur. Op basis van de gezamenlijke expert-analyses van meerdere wetenschappelijke artikelen schrijf je één samenhangend, lopend boek — geen kritische review, geen scoretabellen — wél een leesbaar werk met genummerde hoofdstukken, een rode draad en een verhalende toon.

Volg deze structuur strikt en gebruik Markdown:

# {Titel — een pakkende, inhoudelijke titel die het overkoepelende thema vat}

## Voorwoord
Een korte verhalende inleiding (2-3 alinea's) die de lezer meeneemt: waar gaat dit werk over, waarom is het relevant, en wat mag de lezer verwachten?

## Hoofdstuk 1 — {thematische titel}
Schrijf een doorlopend hoofdstuk in heldere, verhalende stijl. Integreer bevindingen uit alle artikelen en analyses als feiten en inzichten, niet als citaten van agents of studies. Gebruik tussenkopjes (### Subkop) waar dat het verhaal helpt.

## Hoofdstuk 2 — {thematische titel}
Idem. Bouw voort op hoofdstuk 1; verwijs terug waar logisch.

## Hoofdstuk 3 — {thematische titel}
Idem. Maak in totaal 4 tot 6 hoofdstukken, elk rond een eigen thema dat je destilleert uit het materiaal.

## Slotbeschouwing
Een afsluitend hoofdstuk (2-4 alinea's) dat de rode draad samenvat, de betekenis van het werk plaatst, en de lezer met een open blik achterlaat.

---

**Belangrijke regels**
- Schrijf in vlot, helder Nederlands. Geen jargon zonder uitleg.
- Geen scoretabellen, geen sterkte-zwakte tabellen, geen flowcharts — dit is een boek, geen review.
- Noem nergens de namen van bron-agents of studies; integreer hun bevindingen als één stem.
- Gebruik geen lijstjes met opsommingstekens behalve waar het verhaal er echt om vraagt.
- Begin het document met de \`#\` titel; geen extra preambule.`;

type Role = "synthesizer" | "reviewer";

interface AgentSpec {
  name: string;
  role: string;
  prompt: string;
  color: string;
  roleKind: Role;
  isDefault: boolean;
}

const CANONICAL_AGENTS: AgentSpec[] = [
  {
    name: "De Eindredacteur",
    role: "Eindredacteur die alle analyses van één artikel tot één kritisch rapport integreert",
    prompt: EDITOR_PROMPT_NL,
    color: "#8b5cf6",
    roleKind: "synthesizer",
    isDefault: true,
  },
  {
    name: "De Reviewer",
    role: "Stelt een systematische review samen op basis van alle agent-analyses over meerdere artikelen",
    prompt: REVIEWER_PROMPT_NL,
    color: "#0ea5e9",
    roleKind: "reviewer",
    isDefault: true,
  },
  {
    name: "De Boekenschrijver",
    role: "Schrijft een geïntegreerd boekverhaal op basis van alle agent-analyses over meerdere artikelen",
    prompt: BOOKWRITER_PROMPT_NL,
    color: "#a855f7",
    roleKind: "reviewer",
    isDefault: false,
  },
];

async function upsertCanonicalAgent(spec: AgentSpec) {
  const existing = await db
    .select({ id: agentsTable.id })
    .from(agentsTable)
    .where(eq(agentsTable.name, spec.name));

  const flags = {
    is_synthesizer: spec.roleKind === "synthesizer",
    is_reviewer: spec.roleKind === "reviewer",
  };

  if (existing.length === 0) {
    const [row] = await db
      .insert(agentsTable)
      .values({
        name: spec.name,
        role: spec.role,
        system_prompt: spec.prompt,
        api_provider: "openai",
        model: "gpt-4o-mini",
        is_default: spec.isDefault,
        color: spec.color,
        ...flags,
      })
      .returning({ id: agentsTable.id });
    console.log(`[scianalyst seed] inserted ${spec.name} (${row.id})`);
    return row.id;
  }

  await db
    .update(agentsTable)
    .set({
      system_prompt: spec.prompt,
      role: spec.role,
      color: spec.color,
      ...flags,
    })
    .where(eq(agentsTable.id, existing[0].id));
  console.log(`[scianalyst seed] refreshed ${spec.name} (${existing[0].id})`);
  return existing[0].id;
}

async function ensureSingleDefault(roleKind: Role, defaultId: string) {
  const flagCol = roleKind === "synthesizer" ? agentsTable.is_synthesizer : agentsTable.is_reviewer;
  await db.update(agentsTable).set({ is_default: true }).where(eq(agentsTable.id, defaultId));
  await db
    .update(agentsTable)
    .set({ is_default: false })
    .where(and(eq(flagCol, true), eq(agentsTable.is_default, true), ne(agentsTable.id, defaultId))!);
}

export async function seedScianalystAgents() {
  const ids: string[] = [];
  for (const spec of CANONICAL_AGENTS) {
    ids.push(await upsertCanonicalAgent(spec));
  }

  await ensureSingleDefault("synthesizer", ids[0]);
  await ensureSingleDefault("reviewer", ids[1]);

  console.log("[scianalyst seed] done.");
}

if (
  process.argv[1]?.endsWith("seed-scianalyst.ts") ||
  process.argv[1]?.endsWith("seed-scianalyst.mjs")
) {
  seedScianalystAgents()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[scianalyst seed] failed:", err);
      process.exit(1);
    });
}
