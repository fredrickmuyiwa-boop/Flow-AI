// FlowPilot automation engine.
//
// Pure functions: (state, workflow, context) -> { state, logs }.
// No side effects outside the returned state — nothing leaves the browser.
// "Generate email" produces a DRAFT in the CRM; it never sends.
import { uid, DAY, EMAIL_RE, daysBetween } from '../lib/utils';
import { getLeadScore } from '../logic/qualification';
import { generateEmail, generateLeadSummary, renderTemplate, unresolvedVariables, EMAIL_TEMPLATES } from '../logic/messaging';
import { ACTIONS, CONDITIONS, TRIGGERS, describeTrigger } from './catalog';
import { startOfToday } from '../logic/metrics';

// ---------- Conditions ----------
export function evaluateCondition(cond, lead) {
  const c = cond.config || {};
  switch (cond.type) {
    case 'score_gt': {
      const score = getLeadScore(lead);
      const threshold = Number(c.value ?? 75);
      return { passed: score > threshold, detail: `Lead score ${score} ${score > threshold ? '>' : 'is not greater than'} ${threshold}` };
    }
    case 'source_eq':
      return { passed: lead.source === c.value, detail: `Source is ${lead.source}${lead.source === c.value ? '' : `, expected ${c.value}`}` };
    case 'status_eq':
      return { passed: lead.status === c.value, detail: `Status is ${lead.status}${lead.status === c.value ? '' : `, expected ${c.value}`}` };
    case 'email_exists': {
      const ok = EMAIL_RE.test(lead.email || '');
      return { passed: ok, detail: ok ? `Email on file (${lead.email})` : 'No valid email address on file' };
    }
    default:
      return { passed: false, detail: `Unknown condition "${cond.type}"` };
  }
}

// ---------- Target selection ----------
export function findTargets(state, workflow, now = Date.now()) {
  const { type, config = {} } = workflow.trigger;
  const open = state.leads.filter((l) => l.status !== 'Converted');
  const recentlyProcessed = (leadId, days) =>
    state.logs.some(
      (lg) =>
        lg.workflowId === workflow.id &&
        lg.leadId === leadId &&
        lg.status === 'success' &&
        now - new Date(lg.startedAt).getTime() < days * DAY,
    );

  if (type === 'no_contact') {
    const days = Number(config.days ?? 7);
    const due = open.filter((l) => daysBetween(l.lastContactedAt || l.createdAt, now) >= days);
    const fresh = due.filter((l) => !recentlyProcessed(l.id, days));
    return { leads: fresh, skippedRecent: due.length - fresh.length };
  }
  if (type === 'followup_due') {
    const eod = startOfToday().getTime() + DAY;
    const ids = new Set(
      state.tasks.filter((t) => t.status === 'open' && new Date(t.dueAt).getTime() < eod).map((t) => t.leadId),
    );
    open.forEach((l) => l.followUpDate && new Date(l.followUpDate).getTime() < eod && ids.add(l.id));
    const due = open.filter((l) => ids.has(l.id));
    const fresh = due.filter((l) => !recentlyProcessed(l.id, 1));
    return { leads: fresh, skippedRecent: due.length - fresh.length };
  }
  // Event triggers, run manually: default to the most recently added lead.
  const latest = [...state.leads].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  return { leads: latest ? [latest] : [], skippedRecent: 0 };
}

// ---------- Execution ----------
function runOnLead(ws, workflow, leadId, ctx) {
  const started = Date.now();
  const idx = ws.leads.findIndex((l) => l.id === leadId);
  const base = {
    id: uid('log'),
    workflowId: workflow.id,
    workflowName: workflow.name,
    trigger: ctx.triggerLabel || describeTrigger(workflow.trigger),
    mode: ctx.mode,
    leadId,
    startedAt: new Date(ctx.now).toISOString(),
    conditions: [],
    steps: [],
    outputs: { messageIds: [], taskIds: [] },
  };
  if (idx === -1) {
    return { ...base, leadName: 'Deleted lead', status: 'failed', actionSummary: 'Lead not found', note: 'The related lead no longer exists.', durationMs: 1 };
  }

  let lead = { ...ws.leads[idx], notes: [...(ws.leads[idx].notes || [])] };
  base.leadName = lead.name;

  // Conditions (AND)
  for (const cond of workflow.conditions || []) {
    const res = evaluateCondition(cond, lead);
    base.conditions.push({ label: CONDITIONS[cond.type]?.describe(cond.config || {}) || cond.type, ...res });
  }
  const failedCond = base.conditions.find((c) => !c.passed);
  if (failedCond) {
    return {
      ...base,
      status: 'skipped',
      actionSummary: 'Conditions not met — no actions run',
      note: `Condition not met: ${failedCond.detail}.`,
      durationMs: Date.now() - started + 40,
    };
  }

  const settings = ws.settings;
  let halted = false;
  for (const action of workflow.actions || []) {
    const def = ACTIONS[action.type];
    const label = def?.label || action.type;
    const c = action.config || {};
    if (halted) {
      base.steps.push({ label, type: action.type, status: 'not_run', detail: 'Skipped because a previous step failed.' });
      continue;
    }
    try {
      switch (action.type) {
        case 'generate_email': {
          if (!EMAIL_RE.test(lead.email || '')) throw new Error('Lead has no valid email address — cannot personalise an email draft.');
          const template = c.template || 'welcome';
          const email = generateEmail(template, lead, settings);
          const msg = {
            id: uid('msg'),
            leadId: lead.id,
            kind: template,
            subject: email.subject,
            body: email.body,
            createdAt: new Date(ctx.now).toISOString(),
            workflowName: workflow.name,
            status: 'draft',
          };
          ws.messages = [msg, ...ws.messages];
          base.outputs.messageIds.push(msg.id);
          base.steps.push({
            label,
            type: action.type,
            status: 'success',
            detail: `${EMAIL_TEMPLATES[template] || 'Email'} draft created: "${email.subject}". Saved to CRM — not sent.`,
            output: { kind: 'message', id: msg.id },
          });
          break;
        }
        case 'create_task': {
          const titleTpl = c.title || 'Follow up with {{first_name}}';
          const missing = unresolvedVariables(titleTpl, lead);
          if (missing.length) throw new Error(`Template variable {{${missing[0]}}} has no value on this lead. Add it to the lead and re-run.`);
          const dueInDays = Number(c.dueInDays ?? 2);
          const due = new Date(ctx.now + dueInDays * DAY);
          due.setHours(10, 0, 0, 0);
          const task = {
            id: uid('task'),
            leadId: lead.id,
            title: renderTemplate(titleTpl, lead, settings),
            dueAt: due.toISOString(),
            status: 'open',
            source: workflow.name,
            createdAt: new Date(ctx.now).toISOString(),
            completedAt: null,
          };
          ws.tasks = [task, ...ws.tasks];
          base.outputs.taskIds.push(task.id);
          base.steps.push({
            label,
            type: action.type,
            status: 'success',
            detail: `Task "${task.title}" due ${due.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}.`,
            output: { kind: 'task', id: task.id },
          });
          break;
        }
        case 'update_status': {
          const to = c.status || 'Contacted';
          const from = lead.status;
          lead.status = to;
          if (to === 'Contacted' && !lead.lastContactedAt) lead.lastContactedAt = new Date(ctx.now).toISOString();
          base.steps.push({ label, type: action.type, status: 'success', detail: from === to ? `Status already ${to}.` : `Status changed ${from} → ${to}.` });
          if (from !== to)
            ws.activity = [{ id: uid('act'), type: 'status_changed', text: `${lead.name} moved to ${to} by "${workflow.name}"`, leadId: lead.id, at: new Date(ctx.now).toISOString() }, ...ws.activity];
          break;
        }
        case 'assign_priority': {
          const to = c.priority || 'High';
          const from = lead.priority;
          lead.priority = to;
          const score = getLeadScore(lead);
          base.steps.push({ label, type: action.type, status: 'success', detail: from === to ? `Priority confirmed as ${to} (score ${score}).` : `Priority changed ${from} → ${to} (score ${score}).` });
          break;
        }
        case 'add_note': {
          const text = renderTemplate(c.text || 'Automated note from FlowPilot.', lead, settings);
          lead.notes.push({ id: uid('note'), text, createdAt: new Date(ctx.now).toISOString(), author: `Automation · ${workflow.name}`, system: true });
          base.steps.push({ label, type: action.type, status: 'success', detail: `Note added: "${text}"` });
          break;
        }
        case 'generate_summary': {
          const summary = generateLeadSummary(lead, ws);
          lead.notes.push({ id: uid('note'), text: summary, createdAt: new Date(ctx.now).toISOString(), author: 'FlowPilot AI summary', system: true, kind: 'summary' });
          base.steps.push({ label, type: action.type, status: 'success', detail: 'AI summary saved to the lead timeline.', output: { kind: 'summary', text: summary } });
          break;
        }
        default:
          throw new Error(`Unsupported action "${action.type}".`);
      }
    } catch (err) {
      halted = true;
      base.steps.push({ label, type: action.type, status: 'failed', detail: err.message });
    }
  }

  lead.lastAutomationAt = new Date(ctx.now).toISOString();
  ws.leads = ws.leads.map((l, i) => (i === idx ? lead : l));

  const anyFailed = base.steps.some((s) => s.status === 'failed');
  return {
    ...base,
    status: anyFailed ? 'failed' : 'success',
    actionSummary: base.steps.map((s) => s.label).join(' → ') || 'No actions configured',
    note: anyFailed ? base.steps.find((s) => s.status === 'failed').detail : undefined,
    durationMs: Date.now() - started + 120 + base.steps.length * 85,
  };
}

/**
 * Execute a workflow.
 * @param {object} state  full app state
 * @param {object} workflow
 * @param {{leadIds?: string[], mode: 'manual'|'automatic', triggerLabel?: string, now?: number}} ctx
 */
export function executeWorkflow(state, workflow, ctx = {}) {
  const now = ctx.now ?? Date.now();
  const ws = { ...state, leads: [...state.leads], tasks: [...state.tasks], messages: [...state.messages], activity: [...state.activity] };
  let targets;
  let skippedRecent = 0;
  if (ctx.leadIds?.length) targets = ctx.leadIds;
  else {
    const found = findTargets(state, workflow, now);
    targets = found.leads.map((l) => l.id);
    skippedRecent = found.skippedRecent;
  }

  if (!workflow.actions?.length) {
    return { state, logs: [], error: 'This workflow has no actions. Add at least one action in the builder.' };
  }

  const logs = targets.map((leadId, i) => runOnLead(ws, workflow, leadId, { ...ctx, now: now + i }));

  const workflows = state.workflows.map((w) =>
    w.id === workflow.id ? { ...w, lastRunAt: new Date(now).toISOString(), runCount: (w.runCount || 0) + logs.length } : w,
  );

  return {
    state: { ...ws, workflows, logs: [...logs.slice().reverse(), ...state.logs].slice(0, 500) },
    logs,
    skippedRecent,
    scanned: TRIGGERS[workflow.trigger.type]?.mode === 'scan',
  };
}

/** Fire an event trigger for every active workflow listening to it. */
export function dispatchEvent(state, eventType, leadId, meta = {}) {
  let current = state;
  const allLogs = [];
  const listeners = state.workflows.filter((w) => {
    if (!w.active || w.trigger.type !== eventType) return false;
    if (eventType === 'status_changed') {
      const want = w.trigger.config?.toStatus;
      return !want || want === 'Any' || want === meta.toStatus;
    }
    return true;
  });
  for (const wf of listeners) {
    const res = executeWorkflow(current, wf, {
      leadIds: [leadId],
      mode: 'automatic',
      triggerLabel: meta.label || describeTrigger(wf.trigger),
    });
    current = res.state;
    allLogs.push(...res.logs);
  }
  return { state: current, logs: allLogs };
}

/** Validate a workflow definition before saving. Returns array of error strings. */
export function validateWorkflow(wf) {
  const errors = [];
  if (!wf.name?.trim()) errors.push('Give the workflow a name.');
  if (!TRIGGERS[wf.trigger?.type]) errors.push('Choose a trigger.');
  if (!wf.actions?.length) errors.push('Add at least one action.');
  (wf.conditions || []).forEach((c) => {
    if (c.type === 'score_gt') {
      const v = Number(c.config?.value);
      if (Number.isNaN(v) || v < 0 || v > 100) errors.push('Score condition must be between 0 and 100.');
    }
  });
  (wf.actions || []).forEach((a) => {
    if (a.type === 'create_task' && !a.config?.title?.trim()) errors.push('Follow-up task needs a title.');
    if (a.type === 'add_note' && !a.config?.text?.trim()) errors.push('CRM note action needs note text.');
  });
  if (wf.trigger?.type === 'no_contact') {
    const d = Number(wf.trigger.config?.days);
    if (!d || d < 1) errors.push('Days without contact must be at least 1.');
  }
  return errors;
}
