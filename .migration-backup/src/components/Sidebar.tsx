import { FlaskConical, Bot, Microscope, Settings, Moon, Sun, X, BookOpen } from 'lucide-react';
import type { ActiveView } from '../types';
import { useT } from '../lib/i18n';
import type { Language } from '../lib/i18n';

interface SidebarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
}

export function Sidebar({ activeView, setActiveView, darkMode, setDarkMode, sidebarOpen, setSidebarOpen }: SidebarProps) {
  const { t, lang, setLang } = useT();

  const navItems = [
    { id: 'dashboard' as ActiveView, icon: Microscope, label: t('navDashboard') },
    { id: 'analysis' as ActiveView, icon: Microscope, label: t('navAnalysis') },
    { id: 'review' as ActiveView, icon: BookOpen, label: t('reviewModeTitle') },
    { id: 'agents' as ActiveView, icon: Bot, label: t('navAgents') },
    { id: 'settings' as ActiveView, icon: Settings, label: t('navSettings') },
  ];

  // Override icons since we need distinct ones
  const icons: Record<ActiveView, typeof Bot> = {
    dashboard: FlaskConical,
    analysis: Microscope,
    review: BookOpen,
    agents: Bot,
    settings: Settings,
  };

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-40 w-60 flex-shrink-0 flex flex-col
        bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800
        transition-transform duration-300 ease-in-out
        lg:static lg:translate-x-0 lg:z-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
    >
      {/* Logo */}
      <div className="px-5 py-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
            <FlaskConical className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-white tracking-wide">SciAnalyst</h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 tracking-wide">Multi-Agent</p>
          </div>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Close menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="text-[10px] font-semibold tracking-[0.15em] text-slate-400 dark:text-slate-600 uppercase px-3 pb-2 pt-1">
          {t('nav')}
        </p>
        {navItems.map(({ id, label }) => {
          const Icon = icons[id];
          return (
            <button
              key={id}
              onClick={() => setActiveView(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                activeView === id
                  ? 'bg-emerald-50 dark:bg-slate-800 text-emerald-800 dark:text-white font-medium border border-emerald-200 dark:border-slate-700'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 font-normal border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${activeView === id ? 'text-emerald-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'}`} />
              {label}
              {activeView === id && (
                <div className="ml-auto w-1 h-1 rounded-full bg-emerald-500 dark:bg-amber-400" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom controls */}
      <div className="px-3 pb-4 border-t border-slate-200 dark:border-slate-800 pt-3 space-y-0.5">
        {/* Dark/light mode */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-normal text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all border border-transparent"
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-sky-500" />}
          {darkMode ? t('lightMode') : t('darkMode')}
        </button>

        {/* Language switcher */}
        <div className="flex items-center gap-1 px-3 py-2">
          {(['nl', 'en'] as Language[]).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold tracking-wider transition-all ${
                lang === l
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40'
                  : 'text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 border border-transparent hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="px-3 pt-1">
          <span className="text-[10px] text-slate-400 dark:text-slate-700 tracking-wide font-mono">v1.0.0</span>
        </div>
      </div>
    </aside>
  );
}
