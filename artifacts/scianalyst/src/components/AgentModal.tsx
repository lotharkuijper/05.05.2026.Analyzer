import { X } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Agent, ApiProvider } from '../types';
import { getModelsForProvider, getDefaultModelForProvider } from '../lib/aiProviders';
import { useT } from '../lib/i18n';

interface AgentModalProps {
  agent: Agent | null;
  onSave: (data: Omit<Agent, 'id' | 'created_at' | 'updated_at'>) => void;
  onClose: () => void;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16', '#f97316'];

const BLANK: Omit<Agent, 'id' | 'created_at' | 'updated_at'> = {
  name: '',
  role: '',
  system_prompt: '',
  api_provider: 'groq',
  model: 'llama-3.3-70b-versatile',
  is_default: false,
  is_reviewer: false,
  is_synthesizer: false,
  color: '#3b82f6',
};

export function AgentModal({ agent, onSave, onClose }: AgentModalProps) {
  const { t } = useT();
  const [form, setForm] = useState<Omit<Agent, 'id' | 'created_at' | 'updated_at'>>(BLANK);

  const providers: { id: ApiProvider; label: string; note: string }[] = [
    { id: 'groq', label: 'Groq', note: t('providerGroqNote') },
    { id: 'openai', label: 'OpenAI', note: t('providerOpenAINote') },
    { id: 'gemini', label: 'Google Gemini', note: t('providerGeminiNote') },
  ];

  useEffect(() => {
    if (agent) {
      const { id, created_at, updated_at, ...rest } = agent;
      setForm(rest);
    } else {
      setForm(BLANK);
    }
  }, [agent]);

  const set = <K extends keyof typeof form>(key: K, value: typeof form[K]) =>
    setForm((p) => ({ ...p, [key]: value }));

  const handleProviderChange = (provider: ApiProvider) => {
    setForm((p) => ({ ...p, api_provider: provider, model: getDefaultModelForProvider(provider) }));
  };

  const valid = form.name.trim() && form.role.trim() && form.system_prompt.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-xl shadow-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-700">
          <h2 className="text-base font-semibold text-white">
            {agent ? t('editAgent') : t('newAgent')}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 sm:p-5 space-y-4">
          {/* Name + Role: stacked on mobile, side-by-side on sm+ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('fieldName')}</label>
              <input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder={t('namePlaceholder')}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('fieldRole')}</label>
              <input
                value={form.role}
                onChange={(e) => set('role', e.target.value)}
                placeholder={t('rolePlaceholder')}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('fieldSystemPrompt')}</label>
            <textarea
              value={form.system_prompt}
              onChange={(e) => set('system_prompt', e.target.value)}
              rows={4}
              placeholder={t('promptPlaceholder')}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">{t('fieldApiProvider')}</label>
            <div className="grid grid-cols-3 gap-2">
              {providers.map(({ id, label, note }) => (
                <button
                  key={id}
                  onClick={() => handleProviderChange(id)}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    form.api_provider === id
                      ? 'border-blue-500 bg-blue-500/10 text-white'
                      : 'border-slate-600 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <div className="text-xs font-semibold">{label}</div>
                  <div className="text-xs opacity-60">{note}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('fieldModel')}</label>
            <select
              value={form.model}
              onChange={(e) => set('model', e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
            >
              {getModelsForProvider(form.api_provider).map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_synthesizer}
                onChange={(e) => set('is_synthesizer', e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-800"
              />
              <span className="text-xs text-slate-300">{t('fieldIsSynthesizer')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(e) => set('is_default', e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-purple-500 focus:ring-purple-500 focus:ring-offset-slate-800"
              />
              <span className="text-xs text-slate-300">{t('fieldIsDefault')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_reviewer}
                onChange={(e) => set('is_reviewer', e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-800"
              />
              <span className="text-xs text-slate-300">{t('fieldIsReviewer')}</span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">{t('fieldColor')}</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => set('color', c)}
                  className={`w-7 h-7 rounded-lg transition-transform hover:scale-110 ${
                    form.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800 scale-110' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 sm:p-5 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            onClick={() => valid && onSave(form)}
            disabled={!valid}
            className="px-5 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {agent ? t('saveAgent') : t('createAgent')}
          </button>
        </div>
      </div>
    </div>
  );
}
