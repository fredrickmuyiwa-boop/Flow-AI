// AI provider boundary.
//
// The UI only ever calls askCopilot() / qualifyLead(). Today they run the
// deterministic local engine. Set VITE_AI_MODE=claude to route Copilot through
// the secure serverless function in /api/copilot.js, which holds the Anthropic
// key on the server. No API key is ever read or bundled in frontend code.
import { localCopilot } from './copilot';
import { scoreLead } from '../logic/qualification';
import { computeStats, leadsNeedingAttention } from '../logic/metrics';
import { sleep } from '../lib/utils';

export const AI_MODE = (import.meta.env && import.meta.env.VITE_AI_MODE) || 'local';

export const AI_MODE_LABEL = AI_MODE === 'claude' ? 'Claude via secure backend' : 'Local intelligence (demo)';

/** Compact, privacy-conscious context sent to the backend in "claude" mode. */
export function buildContext(state) {
  return {
    stats: computeStats(state),
    leads: state.leads.slice(0, 60).map((l) => ({
      name: l.name,
      company: l.company,
      title: l.jobTitle,
      industry: l.industry,
      source: l.source,
      status: l.status,
      priority: l.priority,
      dealValue: l.dealValue,
      score: l.qualification?.score ?? null,
      lastContactedAt: l.lastContactedAt,
      latestNote: (l.notes || []).slice(-1)[0]?.text || null,
    })),
    attention: leadsNeedingAttention(state).slice(0, 8).map((a) => ({ name: a.lead.name, reasons: a.reasons })),
    workflows: state.workflows.map((w) => ({ name: w.name, active: w.active, trigger: w.trigger.type })),
    recentLogs: state.logs.slice(0, 10).map((l) => ({ workflow: l.workflowName, lead: l.leadName, status: l.status, at: l.startedAt })),
    business: state.settings,
  };
}

export async function askCopilot(query, state, history = []) {
  if (AI_MODE === 'claude') {
    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, history: history.slice(-8), context: buildContext(state) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Backend returned ${res.status}`);
      return { text: data.text, actions: [], intent: 'claude', source: 'claude' };
    } catch (err) {
      const local = localCopilot(query, state);
      return { ...local, source: 'local', notice: `Claude backend unavailable (${err.message}). Answered with local intelligence.` };
    }
  }
  // Small, realistic "thinking" delay so the UI's loading state is visible.
  await sleep(450 + Math.min(query.length * 6, 500));
  return { ...localCopilot(query, state), source: 'local' };
}

export async function qualifyLead(lead) {
  await sleep(900);
  return { ...scoreLead(lead), at: new Date().toISOString() };
}
