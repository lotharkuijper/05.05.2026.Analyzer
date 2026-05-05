import { CreditCard as Edit2, Trash2, Bot, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { Agent } from '../types';
import { useT } from '../lib/i18n';

interface AgentCardProps {
  agent: Agent;
  onEdit: (agent: Agent) => void;
  onDelete: (id: string) => void;
}

const providerLabels: Record<string, string> = {
  groq: 'Groq',
  openai: 'OpenAI',
  gemini: 'Google Gemini',
};

export function AgentCard({ agent, onEdit, onDelete }: AgentCardProps) {
  const { t } = useT();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:border-slate-600 transition-colors">
      <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
          style={{ backgroundColor: agent.color + '33', border: `1px solid ${agent.color}66` }}
        >
          <Bot className="w-5 h-5" style={{ color: agent.color }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-white">{agent.name}</h3>
            {agent.is_default && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">
                {t('defaultLabel')}
              </span>
            )}
            {agent.is_synthesizer && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300">
                {t('synthesizerLabel')}
              </span>
            )}
            {agent.is_reviewer && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300">
                {t('reviewerLabel')}
              </span>
            )}
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ backgroundColor: agent.color + '22', color: agent.color }}
            >
              {providerLabels[agent.api_provider] || agent.api_provider}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{agent.role}</p>
          <p className="text-xs text-slate-500 mt-0.5">{agent.model}</p>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={() => onEdit(agent)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-slate-700 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(agent.id)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-700 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-3 sm:px-4 pb-4 border-t border-slate-700 pt-3">
          <p className="text-xs text-slate-400 font-medium mb-2 uppercase tracking-wider">
            {t('fieldSystemPrompt').replace(' *', '')}
          </p>
          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{agent.system_prompt}</p>
        </div>
      )}
    </div>
  );
}
