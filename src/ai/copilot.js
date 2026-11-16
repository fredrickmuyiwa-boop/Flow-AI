// FlowPilot Copilot — local intelligence.
//
// A deterministic intent router that reasons over live CRM state.
// It returns a structured response the UI renders:
//   { text: string (light markdown), actions?: [{ label, kind, ... }], intent }
// Swap in Claude via src/ai/provider.js without changing the UI contract.
import { computeStats, leadsNeedingAttention, pipelineBreakdown, sourcePerformance, todays } from '../logic/metrics';
import { getLeadScore, scoreLead } from '../logic/qualification';
import { generateEmail, generateLeadSummary } from '../logic/messaging';
import { currency, daysBetween, firstName, formatDate, isSameDay, timeAgo } from '../lib/utils';
import { describeTrigger } from '../engine/catalog';

export const SUGGESTED_PROMPTS = [
  'Analyse my current leads',
  'Identify high-priority prospects',
  'Draft an email to a potential customer',
  'Recommend ways to improve conversions',
  "Summarise today's activities",
  'Suggest which leads need attention',
];

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Find a lead referenced in the query by full name, company, or unique first/last name. */
export function findLeadInQuery(query, leads) {
  const q = norm(query);
  const byFull = leads.find((l) => q.includes(norm(l.name)));
  if (byFull) return byFull;
  const byCompany = leads.find((l) => l.company && q.includes(norm(l.company)));
  if (byCompany) return byCompany;
  const tokens = q.split(/[^a-z0-9-]+/).filter((t) => t.length > 2);
  const hits = leads.filter((l) => norm(l.name).split(/\s+/).some((part) => tokens.includes(part)));
  return hits.length === 1 ? hits[0] : null;
}

const leadLine = (l, extra = '') =>
  `- **${l.name}** · ${l.company || 'No company'} — score ${getLeadScore(l)}, ${l.status}${extra ? `, ${extra}` : ''}`;

const openLead = (l) => ({ kind: 'navigate', label: `Open ${firstName(l.name)}'s profile`, to: `/leads/${l.id}` });

// ---------------- Intent handlers ----------------

function analyseLeads(state) {
  const s = computeStats(state);
  const pipe = pipelineBreakdown(state.leads);
  const perf = sourcePerformance(state.leads).sort((a, b) => b.advanceRate - a.advanceRate);
  const unqualified = state.leads.filter((l) => !l.qualification && l.status !== 'Converted');
  const hotUnworked = state.leads.filter((l) => getLeadScore(l) >= 75 && ['New', 'Contacted'].includes(l.status));
  const best = perf[0];
  const worst = perf[perf.length - 1];
  return {
    intent: 'analyse',
    text: [
      `### Pipeline snapshot`,
      `You have **${s.total} leads** worth **${currency(s.pipelineValue)}** in open pipeline. ${s.qualified} (${Math.round((s.qualified / Math.max(s.total, 1)) * 100)}%) have reached Qualified or beyond, and **${s.converted} converted** — a ${s.conversionRate.toFixed(1)}% conversion rate.`,
      ``,
      `**By stage:** ${pipe.map((p) => `${p.status} ${p.count}`).join(' · ')}`,
      ``,
      `### What stands out`,
      best ? `- **${best.source}** is your strongest channel: ${Math.round(best.advanceRate)}% of those leads advance (avg score ${best.avgScore}).` : null,
      worst && worst !== best ? `- **${worst.source}** is weakest at ${Math.round(worst.advanceRate)}% — consider a nurture sequence instead of rep time.` : null,
      hotUnworked.length
        ? `- **${hotUnworked.length} high-fit lead${hotUnworked.length > 1 ? 's are' : ' is'} still early-stage** (${hotUnworked.slice(0, 3).map((l) => l.name).join(', ')}). These are the quickest wins.`
        : `- Every high-fit lead has progressed past Contacted — nice work.`,
      unqualified.length ? `- ${unqualified.length} open leads haven't been formally qualified yet.` : null,
      s.overdue ? `- ⚠ ${s.overdue} follow-up task${s.overdue > 1 ? 's are' : ' is'} overdue.` : null,
    ]
      .filter((x) => x !== null)
      .join('\n'),
    actions: [{ kind: 'navigate', label: 'Open Contacts & Leads', to: '/leads' }],
  };
}

function highPriority(state) {
  const ranked = state.leads
    .filter((l) => l.status !== 'Converted')
    .map((l) => ({ l, score: getLeadScore(l) }))
    .sort((a, b) => b.score - a.score || (Number(b.l.dealValue) || 0) - (Number(a.l.dealValue) || 0))
    .slice(0, 5);
  if (!ranked.length) return { intent: 'priority', text: 'There are no open leads right now. Add a lead to get started.' };
  return {
    intent: 'priority',
    text: [
      `### Top ${ranked.length} prospects to focus on`,
      ...ranked.map(({ l, score }, i) => {
        const why = scoreLead(l).strengths[0]?.replace(/\.$/, '') || 'Strong overall fit';
        return `${i + 1}. **${l.name}** (${l.company || 'no company'}) — score **${score}**, ${l.status}, ${currency(Number(l.dealValue) || 0)}. ${why}.`;
      }),
      ``,
      `Combined value: **${currency(ranked.reduce((s, r) => s + (Number(r.l.dealValue) || 0), 0))}**. Start with ${firstName(ranked[0].l.name)} — ${scoreLead(ranked[0].l).nextAction.charAt(0).toLowerCase()}${scoreLead(ranked[0].l).nextAction.slice(1)}`,
    ].join('\n'),
    actions: [openLead(ranked[0].l)],
  };
}

function draftEmail(state, query) {
  let lead = findLeadInQuery(query, state.leads);
  if (!lead) {
    lead = state.leads
      .filter((l) => l.status !== 'Converted' && l.email)
      .sort((a, b) => getLeadScore(b) - getLeadScore(a))
      .find((l) => ['New', 'Contacted', 'Qualified'].includes(l.status));
  }
  if (!lead) return { intent: 'draft', text: 'I could not find a suitable lead with an email address. Add one in Contacts & Leads first.' };
  const template = lead.status === 'New' ? 'welcome' : daysBetween(lead.lastContactedAt || lead.createdAt) >= 7 ? 'reengagement' : 'outreach';
  const email = generateEmail(template, lead, state.settings);
  return {
    intent: 'draft',
    text: [
      findLeadInQuery(query, state.leads) ? `Here's a draft for **${lead.name}**:` : `I picked **${lead.name}** (${lead.company}) — highest-fit open lead with an email on file. Here's a draft:`,
      ``,
      `**Subject:** ${email.subject}`,
      ``,
      '```',
      email.body,
      '```',
      `_Tailored to their ${lead.source} origin, ${lead.industry || 'industry'} context and latest CRM note. Nothing has been sent._`,
    ].join('\n'),
    actions: [
      { kind: 'save_draft', label: 'Save draft to CRM', leadId: lead.id, template, subject: email.subject, body: email.body },
      openLead(lead),
    ],
  };
}

function improveConversions(state) {
  const s = computeStats(state);
  const perf = sourcePerformance(state.leads).sort((a, b) => b.advanceRate - a.advanceRate);
  const neverContacted = state.leads.filter((l) => !l.lastContactedAt && l.status !== 'Converted');
  const proposals = state.leads.filter((l) => l.status === 'Proposal');
  const welcome = state.workflows.find((w) => w.trigger.type === 'new_lead' && w.actions.some((a) => a.config?.template === 'welcome'));
  const recs = [];
  if (welcome && !welcome.active)
    recs.push(`**Turn on "${welcome.name}".** ${neverContacted.length} open leads have never been contacted. An instant welcome + follow-up task typically lifts contact rates the most.`);
  else if (neverContacted.length)
    recs.push(`**Close the speed-to-lead gap.** ${neverContacted.length} leads have never been contacted (${neverContacted.slice(0, 3).map((l) => firstName(l.name)).join(', ')}).`);
  if (perf[0]) recs.push(`**Double down on ${perf[0].source}.** It advances ${Math.round(perf[0].advanceRate)}% of leads. Ask converted customers like ${state.leads.find((l) => l.status === 'Converted')?.name || 'your best clients'} for introductions.`);
  if (proposals.length) recs.push(`**Protect ${proposals.length} open proposal${proposals.length > 1 ? 's' : ''}** worth ${currency(proposals.reduce((x, l) => x + (Number(l.dealValue) || 0), 0))}. Book decision calls within 48 hours — proposals idle for a week rarely close.`);
  if (s.overdue) recs.push(`**Clear ${s.overdue} overdue follow-up${s.overdue > 1 ? 's' : ''}.** Overdue tasks are the most common reason warm leads go cold.`);
  const weak = perf[perf.length - 1];
  if (weak && weak !== perf[0]) recs.push(`**Route ${weak.source} leads into a campaign** rather than rep time — they advance only ${Math.round(weak.advanceRate)}% of the time.`);
  recs.push(`**Qualify before you chase.** Use AI qualification on every New lead so reps work the top 20% first.`);
  return {
    intent: 'improve',
    text: [`### ${Math.min(recs.length, 5)} ways to lift your ${s.conversionRate.toFixed(1)}% conversion rate`, ...recs.slice(0, 5).map((r, i) => `${i + 1}. ${r}`)].join('\n'),
    actions: [{ kind: 'navigate', label: 'Open Automation Studio', to: '/automations' }],
  };
}

function todaySummary(state) {
  const logs = todays(state.logs, 'startedAt');
  const newLeads = todays(state.leads, 'createdAt');
  const tasksDue = state.tasks.filter((t) => t.status === 'open' && isSameDay(t.dueAt));
  const done = state.tasks.filter((t) => t.completedAt && isSameDay(t.completedAt));
  const drafts = todays(state.messages, 'createdAt');
  const failed = logs.filter((l) => l.status === 'failed');
  const acts = todays(state.activity, 'at').slice(0, 5);
  return {
    intent: 'today',
    text: [
      `### Today at a glance — ${formatDate(Date.now(), { weekday: 'long' })}`,
      `- **${newLeads.length} new lead${newLeads.length === 1 ? '' : 's'}**${newLeads.length ? `: ${newLeads.map((l) => `${l.name} (${l.source})`).join(', ')}` : ''}`,
      `- **${logs.length} automation run${logs.length === 1 ? '' : 's'}** — ${logs.filter((l) => l.status === 'success').length} succeeded${failed.length ? `, ${failed.length} failed` : ''}`,
      `- **${drafts.length} AI-drafted message${drafts.length === 1 ? '' : 's'}** saved to the CRM`,
      `- **${tasksDue.length} follow-up${tasksDue.length === 1 ? '' : 's'} due today**${tasksDue.length ? `: ${tasksDue.slice(0, 3).map((t) => t.title).join('; ')}` : ''}`,
      `- **${done.length} follow-up${done.length === 1 ? '' : 's'} completed**`,
      acts.length ? `\n**Recent events**\n${acts.map((a) => `- ${a.text} · ${timeAgo(a.at)}`).join('\n')}` : null,
      failed.length ? `\n⚠ "${failed[0].workflowName}" failed for ${failed[0].leadName}: ${failed[0].note}` : null,
    ]
      .filter(Boolean)
      .join('\n'),
    actions: [{ kind: 'navigate', label: 'View activity logs', to: '/logs' }],
  };
}

function needsAttention(state) {
  const list = leadsNeedingAttention(state).slice(0, 6);
  if (!list.length) return { intent: 'attention', text: 'Everything is under control — no open leads are stale or overdue. 🎉' };
  return {
    intent: 'attention',
    text: [
      `### ${list.length} leads need attention`,
      ...list.map(({ lead, reasons, score }) => `- **${lead.name}** (${lead.company || 'no company'}, score ${score}) — ${reasons.join('; ')}`),
      ``,
      `Tip: the **Dormant Lead Recovery** workflow can draft re-engagement emails for the stale ones automatically.`,
    ].join('\n'),
    actions: [openLead(list[0].lead), { kind: 'navigate', label: 'Open Automation Studio', to: '/automations' }],
  };
}

function summariseLead(state, lead) {
  const q = lead.qualification || scoreLead(lead);
  const logs = state.logs.filter((l) => l.leadId === lead.id).slice(0, 3);
  const tasks = state.tasks.filter((t) => t.leadId === lead.id && t.status === 'open');
  const msgs = state.messages.filter((m) => m.leadId === lead.id);
  const latestNote = (lead.notes || []).filter((n) => !n.system).slice(-1)[0];
  return {
    intent: 'lead_summary',
    text: [
      `### ${lead.name} — ${lead.company || 'No company'}`,
      generateLeadSummary(lead, state),
      ``,
      `**Qualification:** ${q.score}/100 · ${q.category}${lead.qualification ? '' : ' _(estimated — run AI qualification to save)_'}`,
      q.strengths?.length ? `**Strengths:** ${q.strengths.slice(0, 2).join(' ')}` : null,
      q.gaps?.length ? `**Watch-outs:** ${q.gaps.slice(0, 2).join(' ')}` : null,
      latestNote ? `**Latest note:** "${latestNote.text}"` : null,
      logs.length ? `**Automation history:** ${logs.map((l) => `${l.workflowName} (${l.status}, ${timeAgo(l.startedAt)})`).join('; ')}` : `**Automation history:** none yet.`,
      tasks.length ? `**Open tasks:** ${tasks.map((t) => `${t.title} — due ${formatDate(t.dueAt, { year: undefined })}`).join('; ')}` : null,
      msgs.length ? `**Drafts on file:** ${msgs.map((m) => `"${m.subject}"`).slice(0, 2).join(', ')}` : null,
      ``,
      `**Recommended next step:** ${q.nextAction}`,
    ]
      .filter((x) => x !== null)
      .join('\n'),
    actions: [openLead(lead)],
  };
}

function workflowReport(state) {
  const lines = state.workflows.map((w) => {
    const logs = state.logs.filter((l) => l.workflowId === w.id);
    const ok = logs.filter((l) => l.status === 'success').length;
    return `- **${w.name}** — ${w.active ? '🟢 active' : '⚪ inactive'} · ${describeTrigger(w.trigger)} · ${logs.length} logged runs (${ok} successful)${w.lastRunAt ? ` · last run ${timeAgo(w.lastRunAt)}` : ''}`;
  });
  const failed = state.logs.filter((l) => l.status === 'failed').slice(0, 1)[0];
  return {
    intent: 'workflows',
    text: [`### Automation status`, ...lines, failed ? `\nMost recent failure: **${failed.workflowName}** on ${failed.leadName} — ${failed.note}` : ''].join('\n'),
    actions: [{ kind: 'navigate', label: 'Open Automation Studio', to: '/automations' }],
  };
}

function sourceReport(state) {
  const perf = sourcePerformance(state.leads).sort((a, b) => b.count - a.count);
  return {
    intent: 'sources',
    text: [`### Lead sources`, ...perf.map((p) => `- **${p.source}** — ${p.count} leads, ${Math.round(p.advanceRate)}% advance to Qualified+, ${p.converted} converted, avg score ${p.avgScore}`)].join('\n'),
  };
}

function capabilities(state) {
  const s = computeStats(state);
  return {
    intent: 'help',
    text: [
      `I'm FlowPilot Copilot. I read your live CRM and automation data — currently **${s.total} leads**, **${s.activeWorkflows} active workflows** and **${s.openTasks} open follow-ups**.`,
      ``,
      `Try asking me to:`,
      `- Summarise a lead — e.g. _"Summarise ${state.leads[0]?.name || 'a lead'}"_`,
      `- Find high-priority prospects or leads that need attention`,
      `- Draft an email to someone by name`,
      `- Explain which lead sources perform best`,
      `- Report on workflow runs and failures`,
    ].join('\n'),
  };
}

// ---------------- Router ----------------
export function localCopilot(query, state) {
  const q = norm(query);
  const lead = findLeadInQuery(query, state.leads);

  if (/^(hi|hello|hey|yo|good (morning|afternoon|evening))\b/.test(q) || /what can you do|help me|^help$/.test(q)) return capabilities(state);
  if (/(draft|write|compose).*(email|message|note|outreach)|email (to|for) /.test(q)) return draftEmail(state, query);
  if (lead && /(summar|tell me about|who is|brief|overview|status of|profile)/.test(q)) return summariseLead(state, lead);
  if (/today|this morning|so far/.test(q)) return todaySummary(state);
  if (/attention|neglect|stale|overdue|slipping|forgot|follow.?up|need(s)? (a )?(call|chase)/.test(q)) return needsAttention(state);
  if (/high.?priority|hot|best (lead|prospect)|top (lead|prospect)|prospects|who should i (call|contact)/.test(q)) return highPriority(state);
  if (/improve|increase|boost|conversion|convert more|win rate|close more/.test(q)) return improveConversions(state);
  if (/workflow|automation|automations|runs?\b|failed|failure/.test(q)) return workflowReport(state);
  if (/source|channel|where .*leads come/.test(q)) return sourceReport(state);
  if (/analy[sz]|pipeline|leads|how (are|is) (we|my)|overview|report|stats|numbers/.test(q)) return analyseLeads(state);
  if (lead) return summariseLead(state, lead);
  return {
    ...capabilities(state),
    intent: 'fallback',
    text: `I couldn't map that to your CRM data yet.\n\n${capabilities(state).text}`,
  };
}
