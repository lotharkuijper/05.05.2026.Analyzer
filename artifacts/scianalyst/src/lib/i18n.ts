import { useState } from 'react';

export type Language = 'nl' | 'en';

const STORAGE_KEY = 'scianalyst_language';

export function getStoredLanguage(): Language {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'en' || v === 'nl') return v;
  } catch { /* ignore */ }
  return 'nl';
}

export function setStoredLanguage(lang: Language) {
  try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }
}

export function useLanguage(): [Language, (l: Language) => void] {
  const [lang, setLang] = useState<Language>(getStoredLanguage);
  const toggle = (l: Language) => {
    setLang(l);
    setStoredLanguage(l);
  };
  return [lang, toggle];
}

const translations = {
  nl: {
    // Sidebar
    nav: 'Navigatie',
    navDashboard: 'Dashboard',
    navAnalysis: 'Analyse',
    navAgents: 'Agents',
    navSettings: 'Instellingen',
    lightMode: 'Lichte modus',
    darkMode: 'Donkere modus',

    // Dashboard
    heroLabel: 'Wetenschappelijke Analyse',
    heroDesc: 'Een multi-agent platform voor systematische analyse van wetenschappelijke literatuur. Upload een artikel en laat gespecialiseerde AI-agents het methodologisch, statistisch en inhoudelijk doorlichten.',
    gettingStarted: 'Aan de slag',
    newAnalysis: 'Nieuwe Analyse',
    newAnalysisDesc: 'Upload een PDF of Word-document en selecteer welke agents het moeten analyseren.',
    manageAgents: 'Agents Beheren',
    manageAgentsDesc: 'Stel gespecialiseerde AI-agents in met eigen rollen, modellen en systeemprompts.',
    howItWorks: 'Werkwijze',
    step1Title: 'Document uploaden',
    step1Desc: 'Laad een wetenschappelijk artikel als PDF of Word-bestand. De tekst wordt automatisch geëxtraheerd en klaargemaakt voor analyse.',
    step2Title: 'Agents selecteren',
    step2Desc: 'Kies welke gespecialiseerde agents het document moeten beoordelen — van methodologie tot statistiek en literatuurverwijzingen.',
    step3Title: 'Analyse uitvoeren',
    step3Desc: 'Elke agent analyseert het document vanuit zijn eigen expertise. De Eindredacteur integreert alle bevindingen tot één samenhangend rapport.',
    step4Title: 'Rapport exporteren',
    step4Desc: 'Exporteer de geïntegreerde analyse als Word-document of PowerPoint-presentatie, klaar voor gebruik in peer review of redactie.',
    freeAccess: 'Gratis toegang',
    freeAccessDesc: 'Voor gratis gebruik wordt {groq} aanbevolen — snelle inferentie met LLaMA-modellen. Registreer op {url} voor een API-sleutel en voeg deze in via {settings}.',
    settings: 'Instellingen',

    // Settings
    settingsTitle: 'Instellingen',
    settingsSubtitle: 'Beheer uw API-sleutels voor AI-providers',
    securityNoticeTitle: 'Veiligheidsmelding',
    securityNoticeDesc: 'API-sleutels worden lokaal opgeslagen in uw browser (localStorage) en worden nooit naar externe servers verzonden. Ze worden alleen gebruikt voor directe communicatie met de respectieve API providers.',
    recommended: 'Aanbevolen',
    providerGroqDesc: 'Aanbevolen — gratis en snel. Ondersteunt LLaMA modellen.',
    providerOpenAIDesc: 'GPT-4o Mini is kosteneffectief voor analyses.',
    providerGeminiDesc: 'Gemini 1.5 Flash heeft een gratis tier beschikbaar.',
    activeProvider: 'Actieve provider',
    activeProviderDesc: 'Alle agents gebruiken deze provider voor analyses. De provider-instelling per agent wordt genegeerd.',
    apiKeyLink: 'API Sleutel',
    save: 'Instellingen Opslaan',
    saved: 'Opgeslagen!',
    groqGuideTitle: 'Groq — Gratis API gids',
    groqGuideStep1: 'Ga naar {url} en maak een gratis account aan',
    groqGuideStep2: 'Klik op "API Keys" in het linkermenu',
    groqGuideStep3: 'Klik op "Create API Key" en kopieer de sleutel',
    groqGuideStep4: 'Plak de sleutel hierboven en sla op',
    groqGuideStep5: 'U kunt nu gratis analyses uitvoeren met LLaMA 3.3 70B',

    // Agents view
    agentsTitle: 'AI-Agents',
    agentsSubtitle: 'Beheer uw gespecialiseerde analyse-agents',
    newAgent: 'Nieuwe Agent',
    noAgents: 'Geen agents gevonden',
    noAgentsDesc: 'Maak uw eerste AI-agent aan om analyses uit te voeren',
    createAgent: 'Agent aanmaken',
    deleteAgentTitle: 'Agent verwijderen',
    deleteAgentConfirm: 'Weet u zeker dat u {name} wilt verwijderen?',
    cancel: 'Annuleren',
    delete: 'Verwijderen',
    deleting: 'Verwijderen...',
    defaultLabel: 'Standaard',
    synthesizerLabel: 'Eind-integrator',
    reviewerLabel: 'Review-integrator',
    fieldIsSynthesizer: 'Eind-integrator (sluit Analyse af)',
    fieldIsDefault: 'Standaard (vooraf geselecteerd in zijn rol)',
    fieldIsReviewer: 'Review-integrator (sluit Review af)',
    sectionReviewIntegrator: 'Review-integrator',
    reviewIntegratorHint: 'Kies wie alle bevindingen samenbrengt: de Reviewer maakt een systematische review, de Boekenschrijver schrijft een doorlopend boek.',

    // Agent modal
    editAgent: 'Agent bewerken',
    fieldName: 'Naam *',
    fieldRole: 'Rol / Persona *',
    fieldSystemPrompt: 'Systeemprompt *',
    fieldApiProvider: 'API Provider',
    fieldModel: 'Model',
    fieldColor: 'Kleur',
    namePlaceholder: 'bijv. De Statisticus',
    rolePlaceholder: 'bijv. Statistisch analist',
    promptPlaceholder: 'Beschrijf hoe deze agent het artikel moet analyseren...',
    providerGroqNote: 'Gratis · Snel',
    providerOpenAINote: 'Betaald',
    providerGeminiNote: 'Gratis tier',
    saveAgent: 'Opslaan',

    // Analysis result
    statusPending: 'Wachtend',
    statusRunning: 'Analyseren...',
    statusCompleted: 'Voltooid',
    statusError: 'Fout',
    waitingForAgents: 'Wacht op andere agents...',
    analyzingDoc: 'Analyseert het document...',
    unknownError: 'Er is een onbekende fout opgetreden.',

    // Analysis view
    sectionDocument: 'Document',
    sectionDocuments: 'Documenten',
    sectionAgents: 'Agents',
    sectionExport: 'Exporteren',
    uploading: 'Verwerken...',
    dropHint: 'Sleep PDF of DOCX',
    dropOr: 'of klik om te bladeren',
    selectAll: 'Alles',
    synthEditorNote: 'De gekozen eind-integrator wordt automatisch uitgevoerd',
    sectionFinalAgent: 'Eind-integrator',
    finalAgentHint: 'Eén van deze sluit de analyse af',
    running: 'Bezig...',
    startAnalysis: 'Analyse Starten',
    waitingRateLimit: 'Even wachten om de API-limiet te respecteren...',
    synthesisRunning: 'De Eindredacteur stelt de eindsynthese samen...',
    agentAnalyzing: '{name} analyseert het document...',
    nextAgentIn: 'Volgende agent start over {n}s',
    noDocSelected: 'Geen document geselecteerd',
    noDocSelectedDesc: 'Upload een wetenschappelijk artikel (PDF of Word) via het paneel links om te beginnen',
    selectAgentsHint: 'Selecteer agents en klik op "Analyse Starten"',
    charsExtracted: '{n}K tekens geëxtraheerd',
    charsAnalyzed: '{n}K tekens geanalyseerd',
    integratedAnalysis: 'Geïntegreerde Analyse',
    integratedAnalysisDesc: 'Samengesteld door de Eindredacteur op basis van alle agents',
    editorCompiling: 'De Eindredacteur compileert het eindrapport...',
    editorCompilingNote: 'Dit kan even duren',
    agentLog: 'Agent Logboek',
    agentLogNote: '— individuele rapporten',
    uploadError: 'Fout bij uploaden: {msg}',
    exportWord: 'Word (.docx)',
    exportPptx: 'PowerPoint (.pptx)',
    exportPoster: 'Congresposter (.png)',

    // AI providers
    apiErrorGroq: 'Groq API fout',
    apiErrorOpenAI: 'OpenAI API fout',
    apiErrorGemini: 'Gemini API fout',
    noApiKey: 'Geen API-sleutel geconfigureerd voor {provider}. Voeg uw sleutel in via Instellingen.',
    noApiKeySynthesis: 'Geen API-sleutel geconfigureerd voor {provider}.',
    unknownProvider: 'Onbekende API provider',
    textTruncated: '[... tekst ingekort voor verwerkingslimiet ...]',
    synthesisFailedPrefix: '**Eindsynthese mislukt:**',

    // Exporters
    exportTitle: 'Wetenschappelijke Analyse:',
    exportGenerated: 'Gegenereerd op:',
    exportSynthesis: 'Eindsynthese',
    posterTitle: 'WETENSCHAPPELIJKE ANALYSE',
    posterSubtitle: 'EINDREDACTEUR — GEÏNTEGREERDE SYNTHESE',
    posterFooter: 'Gegenereerd door SciAnalyst · Multi-Agent Wetenschappelijke Analyse',

    // Review Mode
    reviewModeTitle: 'Review Mode',
    reviewModeSubtitle: 'Systematische review van meerdere artikelen tegelijk',
    reviewUploadHint: 'Sleep meerdere PDF- of DOCX-bestanden',
    reviewUploadOr: 'of klik om te bladeren (meerdere bestanden)',
    reviewDocumentsTitle: 'Geüploade artikelen',
    reviewStartBtn: 'Review Starten',
    reviewRunning: 'Bezig...',
    reviewAnalyzingDoc: 'Artikel {n} van {total} analyseren',
    reviewAgentAnalyzing: '{name} analyseert "{doc}"...',
    reviewWaitingRateLimit: 'Even wachten om de API-limiet te respecteren...',
    reviewNextAgentIn: 'Volgende agent start over {n}s',
    reviewRunningReviewer: 'De Reviewer schrijft de systematische review...',
    reviewResultTitle: 'Systematische Review',
    reviewResultSubtitle: 'Geïntegreerde review van {n} artikelen',
    reviewPerArticle: 'Individuele analyses per artikel',
    reviewArticleExpand: 'Uitklappen',
    reviewArticleCollapse: 'Inklappen',
    reviewCopy: 'Reviewtekst kopiëren',
    reviewCopied: 'Gekopieerd!',
    reviewExportWord: 'Review exporteren (.docx)',
    reviewNoDocsHint: 'Upload minimaal één artikel om te beginnen',
    reviewSelectAgentsHint: 'Selecteer agents voor de per-artikel analyse',
    reviewPhaseLabel: 'Artikel {current}/{total}',
    reviewDone: 'Review voltooid',
    reviewFastMode: 'Snelle modus',
    reviewSafeMode: 'Veilige modus',
    reviewFastModeDesc: 'Agents per artikel parallel — sneller, maar kans op rate-limit fouten bij veel papers.',
    reviewSafeModeDesc: 'Agents één voor één — veilig voor elk aantal papers, iets langzamer.',
    reviewSpeedLabel: 'Verwerkingsmodus',
  },

  en: {
    // Sidebar
    nav: 'Navigation',
    navDashboard: 'Dashboard',
    navAnalysis: 'Analysis',
    navAgents: 'Agents',
    navSettings: 'Settings',
    lightMode: 'Light mode',
    darkMode: 'Dark mode',

    // Dashboard
    heroLabel: 'Scientific Analysis',
    heroDesc: 'A multi-agent platform for systematic analysis of scientific literature. Upload a paper and let specialized AI agents scrutinize it methodologically, statistically, and content-wise.',
    gettingStarted: 'Get started',
    newAnalysis: 'New Analysis',
    newAnalysisDesc: 'Upload a PDF or Word document and select which agents should analyze it.',
    manageAgents: 'Manage Agents',
    manageAgentsDesc: 'Configure specialized AI agents with custom roles, models, and system prompts.',
    howItWorks: 'How it works',
    step1Title: 'Upload document',
    step1Desc: 'Load a scientific paper as a PDF or Word file. The text is automatically extracted and prepared for analysis.',
    step2Title: 'Select agents',
    step2Desc: 'Choose which specialized agents should review the document — from methodology to statistics and references.',
    step3Title: 'Run analysis',
    step3Desc: 'Each agent analyzes the document from its own expertise. The Editor integrates all findings into one coherent report.',
    step4Title: 'Export report',
    step4Desc: 'Export the integrated analysis as a Word document or PowerPoint presentation, ready for peer review or editorial use.',
    freeAccess: 'Free access',
    freeAccessDesc: 'For free use, {groq} is recommended — fast inference with LLaMA models. Register at {url} for an API key and add it via {settings}.',
    settings: 'Settings',

    // Settings
    settingsTitle: 'Settings',
    settingsSubtitle: 'Manage your API keys for AI providers',
    securityNoticeTitle: 'Security notice',
    securityNoticeDesc: 'API keys are stored locally in your browser (localStorage) and are never sent to external servers. They are only used for direct communication with the respective API providers.',
    recommended: 'Recommended',
    providerGroqDesc: 'Recommended — free and fast. Supports LLaMA models.',
    providerOpenAIDesc: 'GPT-4o Mini is cost-effective for analyses.',
    providerGeminiDesc: 'Gemini 1.5 Flash has a free tier available.',
    activeProvider: 'Active provider',
    activeProviderDesc: 'All agents will use this provider for analyses. The per-agent provider setting is overridden.',
    apiKeyLink: 'API Key',
    save: 'Save Settings',
    saved: 'Saved!',
    groqGuideTitle: 'Groq — Free API guide',
    groqGuideStep1: 'Go to {url} and create a free account',
    groqGuideStep2: 'Click on "API Keys" in the left menu',
    groqGuideStep3: 'Click "Create API Key" and copy the key',
    groqGuideStep4: 'Paste the key above and save',
    groqGuideStep5: 'You can now run free analyses with LLaMA 3.3 70B',

    // Agents view
    agentsTitle: 'AI Agents',
    agentsSubtitle: 'Manage your specialized analysis agents',
    newAgent: 'New Agent',
    noAgents: 'No agents found',
    noAgentsDesc: 'Create your first AI agent to start running analyses',
    createAgent: 'Create agent',
    deleteAgentTitle: 'Delete agent',
    deleteAgentConfirm: 'Are you sure you want to delete {name}?',
    cancel: 'Cancel',
    delete: 'Delete',
    deleting: 'Deleting...',
    defaultLabel: 'Default',
    synthesizerLabel: 'Final integrator',
    reviewerLabel: 'Review integrator',
    fieldIsSynthesizer: 'Final integrator (closes Analysis)',
    fieldIsDefault: 'Default (pre-selected within its role)',
    fieldIsReviewer: 'Review integrator (closes Review)',
    sectionReviewIntegrator: 'Review integrator',
    reviewIntegratorHint: 'Pick who brings all findings together: the Reviewer writes a systematic review, the Book Writer writes a flowing book.',

    // Agent modal
    editAgent: 'Edit agent',
    fieldName: 'Name *',
    fieldRole: 'Role / Persona *',
    fieldSystemPrompt: 'System prompt *',
    fieldApiProvider: 'API Provider',
    fieldModel: 'Model',
    fieldColor: 'Color',
    namePlaceholder: 'e.g. The Statistician',
    rolePlaceholder: 'e.g. Statistical analyst',
    promptPlaceholder: 'Describe how this agent should analyze the paper...',
    providerGroqNote: 'Free · Fast',
    providerOpenAINote: 'Paid',
    providerGeminiNote: 'Free tier',
    saveAgent: 'Save',

    // Analysis result
    statusPending: 'Pending',
    statusRunning: 'Analyzing...',
    statusCompleted: 'Completed',
    statusError: 'Error',
    waitingForAgents: 'Waiting for other agents...',
    analyzingDoc: 'Analyzing document...',
    unknownError: 'An unknown error occurred.',

    // Analysis view
    sectionDocument: 'Document',
    sectionDocuments: 'Documents',
    sectionAgents: 'Agents',
    sectionExport: 'Export',
    uploading: 'Processing...',
    dropHint: 'Drop PDF or DOCX',
    dropOr: 'or click to browse',
    selectAll: 'All',
    synthEditorNote: 'The chosen final integrator runs automatically',
    sectionFinalAgent: 'Final integrator',
    finalAgentHint: 'One of these closes the analysis',
    running: 'Running...',
    startAnalysis: 'Start Analysis',
    waitingRateLimit: 'Waiting to respect the API rate limit...',
    synthesisRunning: 'The Editor is compiling the final synthesis...',
    agentAnalyzing: '{name} is analyzing the document...',
    nextAgentIn: 'Next agent starts in {n}s',
    noDocSelected: 'No document selected',
    noDocSelectedDesc: 'Upload a scientific paper (PDF or Word) via the left panel to get started',
    selectAgentsHint: 'Select agents and click "Start Analysis"',
    charsExtracted: '{n}K characters extracted',
    charsAnalyzed: '{n}K characters analyzed',
    integratedAnalysis: 'Integrated Analysis',
    integratedAnalysisDesc: 'Compiled by the Editor based on all agents',
    editorCompiling: 'The Editor is compiling the final report...',
    editorCompilingNote: 'This may take a moment',
    agentLog: 'Agent Log',
    agentLogNote: '— individual reports',
    uploadError: 'Upload error: {msg}',
    exportWord: 'Word (.docx)',
    exportPptx: 'PowerPoint (.pptx)',
    exportPoster: 'Conference poster (.png)',

    // AI providers
    apiErrorGroq: 'Groq API error',
    apiErrorOpenAI: 'OpenAI API error',
    apiErrorGemini: 'Gemini API error',
    noApiKey: 'No API key configured for {provider}. Add your key via Settings.',
    noApiKeySynthesis: 'No API key configured for {provider}.',
    unknownProvider: 'Unknown API provider',
    textTruncated: '[... text truncated for processing limit ...]',
    synthesisFailedPrefix: '**Final synthesis failed:**',

    // Exporters
    exportTitle: 'Scientific Analysis:',
    exportGenerated: 'Generated on:',
    exportSynthesis: 'Final Synthesis',
    posterTitle: 'SCIENTIFIC ANALYSIS',
    posterSubtitle: 'EDITOR — INTEGRATED SYNTHESIS',
    posterFooter: 'Generated by SciAnalyst · Multi-Agent Scientific Analysis',

    // Review Mode
    reviewModeTitle: 'Review Mode',
    reviewModeSubtitle: 'Systematic review of multiple articles at once',
    reviewUploadHint: 'Drop multiple PDF or DOCX files',
    reviewUploadOr: 'or click to browse (multiple files)',
    reviewDocumentsTitle: 'Uploaded articles',
    reviewStartBtn: 'Start Review',
    reviewRunning: 'Running...',
    reviewAnalyzingDoc: 'Analyzing article {n} of {total}',
    reviewAgentAnalyzing: '{name} is analyzing "{doc}"...',
    reviewWaitingRateLimit: 'Waiting to respect the API rate limit...',
    reviewNextAgentIn: 'Next agent starts in {n}s',
    reviewRunningReviewer: 'The Reviewer is writing the systematic review...',
    reviewResultTitle: 'Systematic Review',
    reviewResultSubtitle: 'Integrated review of {n} articles',
    reviewPerArticle: 'Individual analyses per article',
    reviewArticleExpand: 'Expand',
    reviewArticleCollapse: 'Collapse',
    reviewCopy: 'Copy review text',
    reviewCopied: 'Copied!',
    reviewExportWord: 'Export review (.docx)',
    reviewNoDocsHint: 'Upload at least one article to get started',
    reviewSelectAgentsHint: 'Select agents for per-article analysis',
    reviewPhaseLabel: 'Article {current}/{total}',
    reviewDone: 'Review complete',
    reviewFastMode: 'Fast mode',
    reviewSafeMode: 'Safe mode',
    reviewFastModeDesc: 'Agents run in parallel per article — faster, but may hit rate limits with many papers.',
    reviewSafeModeDesc: 'Agents run one by one — safe for any number of papers, slightly slower.',
    reviewSpeedLabel: 'Processing mode',
  },
} as const;

export type TranslationKey = keyof typeof translations.nl;
export type Translations = typeof translations.nl;

export function t(lang: Language, key: TranslationKey, vars?: Record<string, string>): string {
  let str: string = translations[lang][key] ?? translations.nl[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replaceAll(`{${k}}`, v);
    }
  }
  return str;
}

// Neutral synthesis payload — the selected integrator agent's own system_prompt
// fully determines tone, structure and output style. This wrapper only delivers
// the document name and the combined per-agent analyses.
export function getSynthesisPrompt(lang: Language, documentName: string, combinedResults: string): string {
  if (lang === 'en') {
    return `Below are the per-agent analyses of the paper "${documentName}". Produce your final integrated output in the form your role prescribes (your system instructions describe the structure, tone and constraints — follow them precisely).

---

Analyses:

${combinedResults}`;
  }

  return `Hieronder staan de analyses per agent van het artikel "${documentName}". Lever jouw geïntegreerde eindresultaat op in de vorm die jouw rol voorschrijft (jouw systeem-instructies beschrijven de structuur, toon en regels — volg die strikt).

---

Analyses:

${combinedResults}`;
}

import { createContext, useContext } from 'react';

export const LanguageContext = createContext<{
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: TranslationKey, vars?: Record<string, string>) => string;
}>({
  lang: 'nl',
  setLang: () => {},
  t: (key) => key,
});

export function useT() {
  return useContext(LanguageContext);
}
