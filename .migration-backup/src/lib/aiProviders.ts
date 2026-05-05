import type { Agent, ApiKeys } from '../types';
import type { Language } from './i18n';
import { t, getSynthesisPrompt, getReviewerPrompt } from './i18n';

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

async function callGroq(agent: Agent, prompt: string, apiKey: string, lang: Language): Promise<string> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: agent.model || 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: agent.system_prompt },
        { role: 'user', content: prompt },
      ],
      max_tokens: 2048,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `${t(lang, 'apiErrorGroq')}: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

async function callOpenAI(agent: Agent, prompt: string, apiKey: string, lang: Language): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: agent.model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: agent.system_prompt },
        { role: 'user', content: prompt },
      ],
      max_tokens: 2048,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `${t(lang, 'apiErrorOpenAI')}: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

async function callGemini(agent: Agent, prompt: string, apiKey: string, lang: Language): Promise<string> {
  const model = agent.model || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${agent.system_prompt}\n\n${prompt}` }] }],
      generationConfig: { maxOutputTokens: 2048, temperature: 0.7 },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `${t(lang, 'apiErrorGemini')}: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export async function runAgentAnalysis(
  agent: Agent,
  documentText: string,
  documentName: string,
  apiKeys: ApiKeys,
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

  // active_provider overrides the per-agent provider setting
  const provider = apiKeys.active_provider || agent.api_provider;
  const key = apiKeys[provider];
  if (!key) {
    throw new Error(t(lang, 'noApiKey', { provider: provider.toUpperCase() }));
  }

  const overridden: Agent = {
    ...agent,
    api_provider: provider,
    model: provider !== agent.api_provider ? getDefaultModelForProvider(provider) : agent.model,
  };
  if (provider === 'groq') return callGroq(overridden, prompt, key, lang);
  if (provider === 'openai') return callOpenAI(overridden, prompt, key, lang);
  if (provider === 'gemini') return callGemini(overridden, prompt, key, lang);

  throw new Error(t(lang, 'unknownProvider'));
}

export async function runReviewerAgent(
  agent: Agent,
  articleResults: Array<{ documentName: string; agentResults: Array<{ agentName: string; result: string }>; synthesisResult: string }>,
  apiKeys: ApiKeys,
  lang: Language = 'nl'
): Promise<string> {
  const MAX_PER_AGENT = 800;
  const MAX_SYNTHESIS = 1200;

  const articleSummaries = articleResults
    .map((article, idx) => {
      const agentParts = article.agentResults
        .map((r) => {
          const truncated = r.result.length > MAX_PER_AGENT ? r.result.slice(0, MAX_PER_AGENT) + '\n[...]' : r.result;
          return `### ${r.agentName}\n${truncated}`;
        })
        .join('\n\n');

      const synthPart = article.synthesisResult
        ? `### Eindsynthese\n${article.synthesisResult.length > MAX_SYNTHESIS ? article.synthesisResult.slice(0, MAX_SYNTHESIS) + '\n[...]' : article.synthesisResult}`
        : '';

      return `# Artikel ${idx + 1}: ${article.documentName}\n\n${agentParts}${synthPart ? '\n\n' + synthPart : ''}`;
    })
    .join('\n\n---\n\n');

  const prompt = getReviewerPrompt(lang, articleSummaries);

  const provider = apiKeys.active_provider || agent.api_provider;
  const key = apiKeys[provider];
  if (!key) {
    throw new Error(t(lang, 'noApiKey', { provider: provider.toUpperCase() }));
  }

  const overridden: Agent = {
    ...agent,
    api_provider: provider,
    model: provider !== agent.api_provider ? getDefaultModelForProvider(provider) : agent.model,
  };
  if (provider === 'groq') return callGroq(overridden, prompt, key, lang);
  if (provider === 'openai') return callOpenAI(overridden, prompt, key, lang);
  if (provider === 'gemini') return callGemini(overridden, prompt, key, lang);

  throw new Error(t(lang, 'unknownProvider'));
}

export async function runSynthesisAgent(
  agent: Agent,
  agentResults: Array<{ agentName: string; result: string }>,
  documentName: string,
  apiKeys: ApiKeys,
  lang: Language = 'nl'
): Promise<string> {
  // Limit each agent result to ~1500 chars to stay within free-tier token limits
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

  const provider = apiKeys.active_provider || agent.api_provider;
  const key = apiKeys[provider];
  if (!key) {
    throw new Error(t(lang, 'noApiKeySynthesis', { provider: provider.toUpperCase() }));
  }

  const overridden: Agent = {
    ...agent,
    api_provider: provider,
    model: provider !== agent.api_provider ? getDefaultModelForProvider(provider) : agent.model,
  };
  if (provider === 'groq') return callGroq(overridden, prompt, key, lang);
  if (provider === 'openai') return callOpenAI(overridden, prompt, key, lang);
  if (provider === 'gemini') return callGemini(overridden, prompt, key, lang);

  throw new Error(t(lang, 'unknownProvider'));
}
