import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './views/DashboardView';
import { AgentsView } from './views/AgentsView';
import { SettingsView } from './views/SettingsView';
import type { Agent, ActiveView, ApiKeys } from './types';
import { supabase } from './lib/supabase';
import { LanguageContext, useLanguage, t as tFn } from './lib/i18n';
import type { TranslationKey } from './lib/i18n';

const AnalysisView = lazy(() => import('./views/AnalysisView').then((m) => ({ default: m.AnalysisView })));
const ReviewView = lazy(() => import('./views/ReviewView').then((m) => ({ default: m.ReviewView })));

function ViewFallback() {
  return (
    <div className="flex items-center justify-center h-full p-12 text-slate-500 dark:text-slate-400 text-sm">
      Loading…
    </div>
  );
}

const API_KEYS_STORAGE_KEY = 'scianalyst_api_keys';

const defaultApiKeys: ApiKeys = { groq: '', openai: '', gemini: '', active_provider: 'groq' };

function loadApiKeys(): ApiKeys {
  try {
    const stored = localStorage.getItem(API_KEYS_STORAGE_KEY);
    if (stored) return { ...defaultApiKeys, ...JSON.parse(stored) };
  } catch {
    // ignore
  }
  return defaultApiKeys;
}

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [darkMode, setDarkMode] = useState(() => {
    // initialise html class synchronously on first render
    window.document.documentElement.classList.add('dark');
    return true;
  });

  useEffect(() => {
    if (darkMode) {
      window.document.documentElement.classList.add('dark');
    } else {
      window.document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeys>(loadApiKeys);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lang, setLang] = useLanguage();

  const translate = useCallback((key: TranslationKey, vars?: Record<string, string>) => tFn(lang, key, vars), [lang]);

  const langCtx = useMemo(() => ({
    lang,
    setLang,
    t: translate,
  }), [lang, setLang, translate]);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    const { data } = await supabase.from('agents').select('*').order('created_at');
    if (data) setAgents(data as Agent[]);
  };

  const handleCreateAgent = useCallback(async (agentData: Omit<Agent, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase.from('agents').insert(agentData).select().single();
    if (error) throw error;
    setAgents((prev) => [...prev, data as Agent]);
  }, []);

  const handleUpdateAgent = useCallback(async (id: string, agentData: Omit<Agent, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('agents')
      .update({ ...agentData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    setAgents((prev) => prev.map((a) => (a.id === id ? (data as Agent) : a)));
  }, []);

  const handleDeleteAgent = useCallback(async (id: string) => {
    const { error } = await supabase.from('agents').delete().eq('id', id);
    if (error) throw error;
    setAgents((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleSaveApiKeys = useCallback((keys: ApiKeys) => {
    setApiKeys(keys);
    localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(keys));
  }, []);

  const handleNavigate = useCallback((view: ActiveView) => {
    setActiveView(view);
    setSidebarOpen(false);
  }, []);

  return (
    <LanguageContext.Provider value={langCtx}>
      <div>
        <div className="flex min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white">
          {/* Mobile overlay */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-30 bg-black/50 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          <Sidebar
            activeView={activeView}
            setActiveView={handleNavigate}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
          />

          <div className="flex-1 flex flex-col min-w-0">
            {/* Mobile top bar */}
            <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 sticky top-0 z-20">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Open menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <span className="text-sm font-bold text-slate-900 dark:text-white tracking-wide">SciAnalyst</span>
            </header>

            <main className="flex-1 overflow-auto">
              {activeView === 'dashboard' && (
                <DashboardView onNavigate={(view) => handleNavigate(view as ActiveView)} />
              )}
              {activeView === 'analysis' && (
                <Suspense fallback={<ViewFallback />}>
                  <AnalysisView agents={agents} apiKeys={apiKeys} />
                </Suspense>
              )}
              {activeView === 'review' && (
                <Suspense fallback={<ViewFallback />}>
                  <ReviewView agents={agents} apiKeys={apiKeys} />
                </Suspense>
              )}
              {activeView === 'agents' && (
                <AgentsView
                  agents={agents}
                  onCreateAgent={handleCreateAgent}
                  onUpdateAgent={handleUpdateAgent}
                  onDeleteAgent={handleDeleteAgent}
                />
              )}
              {activeView === 'settings' && (
                <SettingsView apiKeys={apiKeys} onSave={handleSaveApiKeys} />
              )}
            </main>
          </div>
        </div>
      </div>
    </LanguageContext.Provider>
  );
}
