import { Eye, EyeOff, Save, ExternalLink, Shield, CheckCircle, Zap } from 'lucide-react';
import { useState } from 'react';
import type { ApiKeys, ApiProvider } from '../types';
import { useT } from '../lib/i18n';

interface SettingsViewProps {
  apiKeys: ApiKeys;
  onSave: (keys: ApiKeys) => void;
}

export function SettingsView({ apiKeys, onSave }: SettingsViewProps) {
  const { t } = useT();
  const [keys, setKeys] = useState<ApiKeys>({ ...apiKeys });
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);

  const providers = [
    {
      id: 'groq' as keyof ApiKeys,
      name: 'Groq',
      description: t('providerGroqDesc'),
      url: 'https://console.groq.com',
      placeholder: 'gsk_...',
      recommended: true,
    },
    {
      id: 'openai' as keyof ApiKeys,
      name: 'OpenAI',
      description: t('providerOpenAIDesc'),
      url: 'https://platform.openai.com/api-keys',
      placeholder: 'sk-...',
      recommended: false,
    },
    {
      id: 'gemini' as keyof ApiKeys,
      name: 'Google Gemini',
      description: t('providerGeminiDesc'),
      url: 'https://aistudio.google.com/app/apikey',
      placeholder: 'AIza...',
      recommended: false,
    },
  ];

  const toggleVisible = (id: string) =>
    setVisible((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleSave = () => {
    onSave(keys);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const hasChanges = JSON.stringify(keys) !== JSON.stringify(apiKeys);

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-white">{t('settingsTitle')}</h1>
        <p className="text-slate-400 text-sm mt-1">{t('settingsSubtitle')}</p>
      </div>

      {/* Active provider selector */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <h3 className="text-sm font-semibold text-white">{t('activeProvider')}</h3>
        </div>
        <p className="text-xs text-slate-400 mb-4">{t('activeProviderDesc')}</p>
        <div className="grid grid-cols-3 gap-2">
          {providers.map(({ id, name, recommended }) => {
            const isActive = keys.active_provider === id;
            const hasKey = !!keys[id];
            return (
              <button
                key={id}
                onClick={() => setKeys((prev) => ({ ...prev, active_provider: id as ApiProvider }))}
                className={`relative p-3 rounded-xl border text-left transition-all ${
                  isActive
                    ? 'border-amber-500/60 bg-amber-500/10 text-white'
                    : 'border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                }`}
              >
                {isActive && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-400" />
                )}
                <div className="text-xs font-semibold mb-0.5">{name}</div>
                <div className={`text-xs ${hasKey ? 'text-emerald-400' : 'text-slate-600'}`}>
                  {hasKey ? (recommended ? t('recommended') : 'API key set') : 'No key'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Security notice */}
      <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
        <Shield className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-300">{t('securityNoticeTitle')}</p>
          <p className="text-xs text-amber-400/80 mt-1 leading-relaxed">{t('securityNoticeDesc')}</p>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        {providers.map(({ id, name, description, url, placeholder, recommended }) => (
          <div key={id} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="flex items-start justify-between mb-3 gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-white">{name}</h3>
                  {recommended && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                      {t('recommended')}
                    </span>
                  )}
                  {keys[id] && (
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{description}</p>
              </div>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors whitespace-nowrap flex-shrink-0"
              >
                {t('apiKeyLink')} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="relative">
              <input
                type={visible[id] ? 'text' : 'password'}
                value={keys[id]}
                onChange={(e) => setKeys((prev) => ({ ...prev, [id]: e.target.value }))}
                placeholder={placeholder}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 pr-10 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors font-mono"
              />
              <button
                onClick={() => toggleVisible(id)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {visible[id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={!hasChanges && !saved}
        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-all shadow-lg ${
          saved
            ? 'bg-emerald-500 text-white shadow-emerald-500/20'
            : hasChanges
              ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-blue-500/20'
              : 'bg-slate-700 text-slate-400 cursor-not-allowed'
        }`}
      >
        {saved ? (
          <><CheckCircle className="w-4 h-4" />{t('saved')}</>
        ) : (
          <><Save className="w-4 h-4" />{t('save')}</>
        )}
      </button>

      <div className="mt-8 bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3">{t('groqGuideTitle')}</h3>
        <ol className="space-y-2 text-xs text-slate-400">
          {(['groqGuideStep1', 'groqGuideStep2', 'groqGuideStep3', 'groqGuideStep4', 'groqGuideStep5'] as const).map((key, idx) => (
            <li key={key} className="flex gap-2">
              <span className="text-blue-400 font-bold flex-shrink-0">{idx + 1}.</span>
              {t(key, { url: 'console.groq.com' })}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
