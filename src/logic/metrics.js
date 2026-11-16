// Derived analytics. Pure functions over app state so the dashboard
// recalculates on every change.
import { LEAD_STATUSES, LEAD_SOURCES } from '../data/constants';
import { DAY, daysBetween, isSameDay } from '../lib/utils';
import { getLeadScore } from './qualification';

export function computeStats(state) {
  const { leads, workflows, tasks, logs } = state;
  const total = leads.length;
  const qualified = leads.filter((l) => ['Qualified', 'Proposal', 'Converted'].includes(l.status)).length;
  const converted = leads.filter((l) => l.status === 'Converted').length;
  const followupsDone = tasks.filter((t) => t.status === 'done').length;
  const openTasks = tasks.filter((t) => t.status === 'open');
  const overdue = openTasks.filter((t) => new Date(t.dueAt) < startOfToday());
  const activeWorkflows = workflows.filter((w) => w.active).length;
  const weekAgo = Date.now() - 7 * DAY;
  const newThisWeek = leads.filter((l) => new Date(l.createdAt) >= weekAgo).length;
  const runsThisWeek = logs.filter((l) => new Date(l.startedAt) >= weekAgo && l.workflowId).length;
  const successRuns = logs.filter((l) => l.status === 'success').length;
  const pipelineValue = leads
    .filter((l) => l.status !== 'Converted')
    .reduce((s, l) => s + (Number(l.dealValue) || 0), 0);
  return {
    total,
    qualified,
    converted,
    conversionRate: total ? (converted / total) * 100 : 0,
    followupsDone,
    openTasks: openTasks.length,
    overdue: overdue.length,
    activeWorkflows,
    totalWorkflows: workflows.length,
    newThisWeek,
    runsThisWeek,
    successRate: logs.length ? (successRuns / logs.length) * 100 : 0,
    pipelineValue,
  };
}

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Weekly lead acquisition split by inbound vs outbound sources. */
export function leadAcquisitionSeries(leads, weeks = 8) {
  const now = Date.now();
  const series = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const end = now - i * 7 * DAY;
    const start = end - 7 * DAY;
    const inWeek = leads.filter((l) => {
      const t = new Date(l.createdAt).getTime();
      return t > start && t <= end;
    });
    const label = new Date(end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    series.push({
      week: i === 0 ? 'This wk' : label,
      inbound: inWeek.filter((l) => !['Cold Outreach', 'LinkedIn'].includes(l.source)).length,
      outbound: inWeek.filter((l) => ['Cold Outreach', 'LinkedIn'].includes(l.source)).length,
    });
  }
  return series;
}

export function pipelineBreakdown(leads) {
  return LEAD_STATUSES.map((status) => {
    const items = leads.filter((l) => l.status === status);
    return { status, count: items.length, value: items.reduce((s, l) => s + (Number(l.dealValue) || 0), 0) };
  });
}

export function sourcePerformance(leads) {
  return LEAD_SOURCES.map((source) => {
    const items = leads.filter((l) => l.source === source);
    const converted = items.filter((l) => l.status === 'Converted').length;
    const advanced = items.filter((l) => ['Qualified', 'Proposal', 'Converted'].includes(l.status)).length;
    const avgScore = items.length ? Math.round(items.reduce((s, l) => s + getLeadScore(l), 0) / items.length) : 0;
    return {
      source,
      count: items.length,
      converted,
      advanceRate: items.length ? (advanced / items.length) * 100 : 0,
      avgScore,
    };
  }).filter((s) => s.count > 0);
}

/** Leads that need attention, with a reason for each. Sorted by urgency. */
export function leadsNeedingAttention(state) {
  const out = [];
  for (const lead of state.leads) {
    if (lead.status === 'Converted') continue;
    const idle = daysBetween(lead.lastContactedAt || lead.createdAt);
    const score = getLeadScore(lead);
    const overdue = state.tasks.filter(
      (t) => t.leadId === lead.id && t.status === 'open' && new Date(t.dueAt) < startOfToday(),
    );
    const reasons = [];
    let urgency = 0;
    if (overdue.length) { reasons.push(`${overdue.length} overdue follow-up${overdue.length > 1 ? 's' : ''}`); urgency += 30; }
    if (!lead.lastContactedAt) { reasons.push(`never contacted (added ${idle === 0 ? 'today' : `${idle}d ago`})`); urgency += score >= 70 ? 28 : 12; }
    else if (idle >= 7) { reasons.push(`no contact for ${idle} days`); urgency += Math.min(idle, 25); }
    if (lead.priority === 'High') urgency += 10;
    if (score >= 75) urgency += 10;
    if (reasons.length) out.push({ lead, reasons, score, urgency, idle });
  }
  return out.sort((a, b) => b.urgency - a.urgency);
}

export const todays = (items, key) => items.filter((i) => isSameDay(i[key]));
