import { FlaskConical, Bot, BookOpen, Microscope, TrendingUp } from 'lucide-react';
import { useT } from '../lib/i18n';

interface DashboardViewProps {
  onNavigate: (view: 'analysis' | 'agents') => void;
}

export function DashboardView({ onNavigate }: DashboardViewProps) {
  const { t } = useT();

  const steps = [
    { step: '01', icon: FlaskConical, titleKey: 'step1Title' as const, descKey: 'step1Desc' as const },
    { step: '02', icon: Bot, titleKey: 'step2Title' as const, descKey: 'step2Desc' as const },
    { step: '03', icon: BookOpen, titleKey: 'step3Title' as const, descKey: 'step3Desc' as const },
    { step: '04', icon: TrendingUp, titleKey: 'step4Title' as const, descKey: 'step4Desc' as const },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Hero header */}
      <div className="relative overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900" />
        <div className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(148,163,184,0.3) 39px, rgba(148,163,184,0.3) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(148,163,184,0.3) 39px, rgba(148,163,184,0.3) 40px)',
          }}
        />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-8 py-10 sm:py-16">
          <div className="flex items-center gap-3 mb-5 sm:mb-6">
            <div className="w-px h-8 bg-amber-400/60" />
            <span className="text-xs font-medium tracking-[0.2em] text-amber-400/80 uppercase">
              {t('heroLabel')}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4" style={{ letterSpacing: '-0.01em' }}>
            SciAnalyst
          </h1>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-xl">
            {t('heroDesc')}
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-8 py-8 sm:py-12 space-y-8 sm:space-y-10">

        {/* Primary actions */}
        <div>
          <h2 className="text-xs font-semibold tracking-[0.15em] text-slate-500 uppercase mb-4 sm:mb-5">
            {t('gettingStarted')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <button
              onClick={() => onNavigate('analysis')}
              className="group relative overflow-hidden bg-slate-900 border border-slate-700 hover:border-amber-500/50 rounded-2xl p-5 sm:p-6 text-left transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/5"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative">
                <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 group-hover:bg-amber-500/15 transition-colors">
                  <Microscope className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="text-base font-semibold text-white mb-1.5">{t('newAnalysis')}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{t('newAnalysisDesc')}</p>
              </div>
            </button>

            <button
              onClick={() => onNavigate('agents')}
              className="group relative overflow-hidden bg-slate-900 border border-slate-700 hover:border-blue-500/50 rounded-2xl p-5 sm:p-6 text-left transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative">
                <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4 group-hover:bg-blue-500/15 transition-colors">
                  <Bot className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-base font-semibold text-white mb-1.5">{t('manageAgents')}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{t('manageAgentsDesc')}</p>
              </div>
            </button>
          </div>
        </div>

        {/* How it works */}
        <div>
          <h2 className="text-xs font-semibold tracking-[0.15em] text-slate-500 uppercase mb-4 sm:mb-5">
            {t('howItWorks')}
          </h2>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl divide-y divide-slate-800">
            {steps.map(({ step, icon: Icon, titleKey, descKey }) => (
              <div key={step} className="flex items-start gap-3 sm:gap-5 px-4 sm:px-6 py-4 sm:py-5">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">
                  <span className="text-xs font-bold text-slate-500 font-mono">{step}</span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-slate-800/50 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white mb-1">{t(titleKey)}</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">{t(descKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* API note */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-4 sm:px-6 py-4 flex items-start gap-4">
          <div className="w-1 h-10 rounded-full bg-emerald-500/60 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-emerald-400 mb-1 tracking-wide uppercase">{t('freeAccess')}</p>
            <p className="text-sm text-slate-400 leading-relaxed">
              {t('freeAccessDesc', {
                groq: '___GROQ___',
                url: '___URL___',
                settings: '___SETTINGS___',
              }).split('___').map((part, i) => {
                if (part === 'GROQ') return <span key={i} className="text-white font-medium">Groq</span>;
                if (part === 'URL') return <span key={i} className="text-slate-300 font-mono text-xs">console.groq.com</span>;
                if (part === 'SETTINGS') return <span key={i} className="text-slate-300">{t('settings')}</span>;
                return part;
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
