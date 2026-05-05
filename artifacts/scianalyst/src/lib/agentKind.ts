import type { Agent } from '../types';

export type AgentKind = 'specialist' | 'integrator';
export type IntegratorSubKind = 'synthesizer' | 'reviewer';

export function getAgentKind(agent: Pick<Agent, 'is_reviewer' | 'is_synthesizer'>): AgentKind {
  return agent.is_reviewer || agent.is_synthesizer ? 'integrator' : 'specialist';
}

export function getIntegratorSubKind(
  agent: Pick<Agent, 'is_reviewer' | 'is_synthesizer'>,
): IntegratorSubKind | null {
  if (agent.is_synthesizer) return 'synthesizer';
  if (agent.is_reviewer) return 'reviewer';
  return null;
}

export const RAINBOW_GRADIENT =
  'conic-gradient(from 180deg, #ef4444, #f59e0b, #84cc16, #06b6d4, #3b82f6, #a855f7, #ec4899, #ef4444)';
