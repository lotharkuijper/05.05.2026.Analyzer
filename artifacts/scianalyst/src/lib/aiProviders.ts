import type { Agent, ApiKeys } from '../types';
import type { Language } from './i18n';
import { t, getSynthesisPrompt } from './i18n';

const GROQ_MODELS = [
  { id: 'llama-3.3-70b-versatile', label: 'LLaMA 3.3 70B' },
  { id: 'llama-3.1-8b-instant', label: 'LLaMA 3.1 8B' },
  { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
];

const OPENAI_MODELS = [
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
];

const GEMINI_MODELS = [
  { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
];

export function getModelsForProvider(provider: string) {
  if (provider === 'groq') return GROQ_MODELS;
  if (provider === 'openai') return OPENAI_MODELS;
  if (provider === 'gemini') return GEMINI_MODELS;
  return GROQ_MODELS;
}

export function getDefaultModelForProvider(provider: string): string {
  return getModelsForProvider(provider)[0].id;
}

const API_BASE = `${import.meta.env.BASE_URL}api`;

async function callServerAi(
  agent: Agent,
  prompt: string,
  lang: Language,
): Promise<string> {
  const response = await fetch(`${API_BASE}/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system: agent.system_prompt,
      prompt,
      model: agent.model,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({} as { error?: string }));
    throw new Error(err?.error || `${t(lang, 'apiErrorOpenAI')}: ${response.status}`);
  }

  const data = (await response.json()) as { content?: string };
  return data.content || '';
}

export async function runAgentAnalysis(
  agent: Agent,
  documentText: string,
  documentName: string,
  _apiKeys: ApiKeys,
  lang: Language = 'nl'
): Promise<string> {
  const maxChars = 7000;
  const truncatedText =
    documentText.length > maxChars
      ? documentText.substring(0, maxChars) + `\n\n${t(lang, 'textTruncated')}`
      : documentText;

  const prompt = lang === 'en'
    ? `Analyze the following scientific paper:\n\nTITLE: ${documentName}\n\nCONTENT:\n${truncatedText}`
    : `Analyseer het volgende wetenschappelijke artikel:\n\nTITEL: ${documentName}\n\nINHOUD:\n${truncatedText}`;

  return callServerAi(agent, prompt, lang);
}

export async function runReviewerAgent(
  agent: Agent,
  articleResults: Array<{ documentName: string; agentResults: Array<{ agentName: string; result: string }> }>,
  _apiKeys: ApiKeys,
  lang: Language = 'nl'
): Promise<string> {
  const MAX_PER_AGENT = 1000;

  const articleSummaries = articleResults
    .map((article, idx) => {
      const agentParts = article.agentResults
        .map((r) => {
          const truncated = r.result.length > MAX_PER_AGENT ? r.result.slice(0, MAX_PER_AGENT) + '\n[...]' : r.result;
          return `### ${r.agentName}\n${truncated}`;
        })
        .join('\n\n');

      return `# ${lang === 'en' ? 'Article' : 'Artikel'} ${idx + 1}: ${article.documentName}\n\n${agentParts}`;
    })
    .join('\n\n---\n\n');

  const prompt = lang === 'en'
    ? `Below are the per-agent analyses across ${articleResults.length} scientific paper(s). Produce your final integrated output in the form your role prescribes (your system instructions describe the structure, tone and constraints — follow them precisely).\n\n---\n\n${articleSummaries}`
    : `Hieronder staan de analyses per agent over ${articleResults.length} wetenschappelijk(e) artikel(en). Lever jouw geïntegreerde eindresultaat op in de vorm die jouw rol voorschrijft (jouw systeem-instructies beschrijven de structuur, toon en regels — volg die strikt).\n\n---\n\n${articleSummaries}`;

  return callServerAi(agent, prompt, lang);
}

export async function runSynthesisAgent(
  agent: Agent,
  agentResults: Array<{ agentName: string; result: string }>,
  documentName: string,
  _apiKeys: ApiKeys,
  lang: Language = 'nl'
): Promise<string> {
  const MAX_PER_AGENT = 1500;
  const combinedResults = agentResults
    .map((r) => {
      const truncated = r.result.length > MAX_PER_AGENT
        ? r.result.slice(0, MAX_PER_AGENT) + '\n[...]'
        : r.result;
      return `## ${r.agentName}\n\n${truncated}`;
    })
    .join('\n\n---\n\n');

  const prompt = getSynthesisPrompt(lang, documentName, combinedResults);
  return callServerAi(agent, prompt, lang);
}
