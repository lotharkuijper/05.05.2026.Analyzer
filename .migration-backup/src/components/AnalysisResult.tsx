import { Bot, CheckCircle, AlertCircle, Loader2, Clock } from 'lucide-react';
import type { Analysis, Agent } from '../types';
import { useT } from '../lib/i18n';

interface AnalysisResultProps {
  analysis: Analysis;
  agent: Agent;
}

export function AnalysisResult({ analysis, agent }: AnalysisResultProps) {
  const { t } = useT();

  const statusIcon = {
    pending: <Clock className="w-4 h-4 text-slate-500" />,
    running: <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />,
    completed: <CheckCircle className="w-4 h-4 text-emerald-400" />,
    error: <AlertCircle className="w-4 h-4 text-red-400" />,
  }[analysis.status];

  const statusLabel = {
    pending: t('statusPending'),
    running: t('statusRunning'),
    completed: t('statusCompleted'),
    error: t('statusError'),
  }[analysis.status];

  const formattedResult = analysis.result
    .split('\n')
    .map((line, i) => {
      if (line.startsWith('## ')) return <h3 key={i} className="text-sm font-bold text-white mt-4 mb-2 first:mt-0">{line.slice(3)}</h3>;
      if (line.startsWith('# ')) return <h2 key={i} className="text-base font-bold text-white mt-4 mb-2 first:mt-0">{line.slice(2)}</h2>;
      if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="text-sm font-semibold text-slate-200 mt-2">{line.slice(2, -2)}</p>;
      if (line.startsWith('- ') || line.startsWith('• ')) return <li key={i} className="text-sm text-slate-300 ml-3 list-disc">{line.slice(2)}</li>;
      if (!line.trim()) return <br key={i} />;
      return <p key={i} className="text-sm text-slate-300 leading-relaxed">{line}</p>;
    });

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center gap-3 border-b border-slate-700"
        style={{ background: `linear-gradient(135deg, ${agent.color}15, transparent)` }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: agent.color + '30' }}
        >
          <Bot className="w-4 h-4" style={{ color: agent.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white">{agent.name}</h4>
          <p className="text-xs text-slate-400">{agent.role}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {statusIcon}
          <span className={`text-xs font-medium ${
            analysis.status === 'completed' ? 'text-emerald-400' :
            analysis.status === 'error' ? 'text-red-400' :
            analysis.status === 'running' ? 'text-blue-400' : 'text-slate-500'
          }`}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {analysis.status === 'pending' && (
          <div className="flex items-center gap-2 text-slate-500">
            <Clock className="w-4 h-4" />
            <span className="text-sm">{t('waitingForAgents')}</span>
          </div>
        )}
        {analysis.status === 'running' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-blue-400 mb-3">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">{t('analyzingDoc')}</span>
            </div>
            {[100, 80, 60].map((w, i) => (
              <div key={i} className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500/50 to-blue-400/30 rounded-full animate-pulse"
                  style={{ width: `${w}%`, animationDelay: `${i * 200}ms` }}
                />
              </div>
            ))}
          </div>
        )}
        {analysis.status === 'completed' && analysis.result && (
          <div className="space-y-1">{formattedResult}</div>
        )}
        {analysis.status === 'error' && (
          <div className="flex items-start gap-2 text-red-400 bg-red-500/10 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{analysis.error_message || t('unknownError')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
