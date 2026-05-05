import { Plus, Bot, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { Agent } from '../types';
import { AgentCard } from '../components/AgentCard';
import { AgentModal } from '../components/AgentModal';
import { useT } from '../lib/i18n';
import { getAgentKind, RAINBOW_GRADIENT } from '../lib/agentKind';

interface AgentsViewProps {
  agents: Agent[];
  onCreateAgent: (data: Omit<Agent, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onUpdateAgent: (id: string, data: Omit<Agent, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onDeleteAgent: (id: string) => Promise<void>;
}

export function AgentsView({ agents, onCreateAgent, onUpdateAgent, onDeleteAgent }: AgentsViewProps) {
  const { t } = useT();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [pendingDeleteAgent, setPendingDeleteAgent] = useState<Agent | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async (data: Omit<Agent, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingAgent) {
      await onUpdateAgent(editingAgent.id, data);
    } else {
      await onCreateAgent(data);
    }
    setModalOpen(false);
    setEditingAgent(null);
  };

  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setModalOpen(true);
  };

  const handleClose = () => {
    setModalOpen(false);
    setEditingAgent(null);
  };

  const handleDeleteRequest = (agent: Agent) => {
    setPendingDeleteAgent(agent);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteAgent) return;
    setDeleting(true);
    await onDeleteAgent(pendingDeleteAgent.id);
    setDeleting(false);
    setPendingDeleteAgent(null);
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">{t('agentsTitle')}</h1>
          <p className="text-slate-400 text-sm mt-1">{t('agentsSubtitle')}</p>
        </div>
        <button
          onClick={() => { setEditingAgent(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/25"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{t('newAgent')}</span>
        </button>
      </div>

      {agents.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 sm:p-12 text-center">
          <Bot className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-base font-semibold text-white mb-2">{t('noAgents')}</h3>
          <p className="text-sm text-slate-400 mb-4">{t('noAgentsDesc')}</p>
          <button
            onClick={() => { setEditingAgent(null); setModalOpen(true); }}
            className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
          >
            {t('createAgent')}
          </button>
        </div>
      ) : (
        (() => {
          const specialists = agents.filter((a) => getAgentKind(a) === 'specialist');
          const integrators = agents.filter((a) => getAgentKind(a) === 'integrator');
          const renderCard = (agent: Agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onEdit={handleEdit}
              onDelete={(id) => {
                const a = agents.find((x) => x.id === id);
                if (a) handleDeleteRequest(a);
              }}
            />
          );
          return (
            <div className="space-y-6">
              <section>
                <div className="flex items-baseline justify-between mb-2 px-1">
                  <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    {t('specialistsSection')}
                  </h2>
                  <span className="text-xs text-slate-500">{t('specialistsSectionHint')}</span>
                </div>
                <div className="grid gap-3">
                  {specialists.length > 0 ? (
                    specialists.map(renderCard)
                  ) : (
                    <p className="text-xs text-slate-500 italic px-1 py-2">—</p>
                  )}
                </div>
              </section>

              <div
                className="h-1 rounded-full opacity-70"
                style={{ background: RAINBOW_GRADIENT }}
                role="separator"
                aria-label={`${t('specialistsSection')} / ${t('integratorsSection')}`}
              />

              <section>
                <div className="flex items-baseline justify-between mb-2 px-1">
                  <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    {t('integratorsSection')}
                  </h2>
                  <span className="text-xs text-slate-500">{t('integratorsSectionHint')}</span>
                </div>
                <div className="grid gap-3">
                  {integrators.length > 0 ? (
                    integrators.map(renderCard)
                  ) : (
                    <p className="text-xs text-slate-500 italic px-1 py-2">—</p>
                  )}
                </div>
              </section>
            </div>
          );
        })()
      )}

      {modalOpen && (
        <AgentModal
          agent={editingAgent}
          onSave={handleSave}
          onClose={handleClose}
        />
      )}

      {pendingDeleteAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-base font-semibold text-white">{t('deleteAgentTitle')}</h3>
            </div>
            <p className="text-sm text-slate-400 mb-6">
              {t('deleteAgentConfirm', { name: '___' }).split('___').map((part, i) =>
                i === 0
                  ? part
                  : <><span key={i} className="text-white font-medium">{pendingDeleteAgent.name}</span>{part}</>
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setPendingDeleteAgent(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors disabled:opacity-50"
              >
                {t('cancel')}
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? t('deleting') : t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
