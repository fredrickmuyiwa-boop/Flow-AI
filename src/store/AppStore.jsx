// Application state: a single store persisted to LocalStorage.
//
// commit(fn) applies a pure state transition synchronously through a ref, so
// action creators can chain transitions and return results (e.g. the logs a
// workflow run produced) to the UI for toasts and result panels.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { buildSeed } from '../data/seed';
import { loadState, saveState, clearState } from '../lib/storage';
import { uid } from '../lib/utils';
import { dispatchEvent, executeWorkflow } from '../engine/automationEngine';

const StoreContext = createContext(null);

function initialState() {
  const saved = loadState();
  if (saved && saved.version === 1 && Array.isArray(saved.leads)) return saved;
  return buildSeed();
}

const now = () => new Date().toISOString();

export function StoreProvider({ children }) {
  const [state, setState] = useState(initialState);
  const ref = useRef(state);
  const timers = useRef([]);

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const commit = useCallback((fn) => {
    const next = fn(ref.current);
    ref.current = next;
    setState(next);
    return next;
  }, []);

  const get = useCallback(() => ref.current, []);

  const pushActivity = (s, text, type, leadId) => ({
    ...s,
    activity: [{ id: uid('act'), type, text, leadId, at: now() }, ...s.activity].slice(0, 300),
  });

  // ---------------- Leads ----------------
  const addLead = useCallback(
    (data, { fromForm = false } = {}) => {
      const lead = {
        id: uid('lead'),
        name: data.name.trim(),
        email: (data.email || '').trim(),
        company: (data.company || '').trim(),
        phone: (data.phone || '').trim(),
        source: data.source,
        status: data.status || 'New',
        priority: data.priority || 'Medium',
        jobTitle: (data.jobTitle || '').trim(),
        companySize: data.companySize || '',
        industry: data.industry || '',
        dealValue: data.dealValue ? Number(data.dealValue) : 0,
        followUpDate: data.followUpDate || null,
        createdAt: now(),
        lastContactedAt: null,
        qualification: null,
        notes: data.note?.trim() ? [{ id: uid('note'), text: data.note.trim(), createdAt: now(), author: get().settings.senderName }] : [],
      };
      let logs = [];
      commit((s) => {
        let next = pushActivity(
          { ...s, leads: [lead, ...s.leads] },
          fromForm ? `${lead.name} submitted the demo request form` : `New lead ${lead.name}${lead.company ? ` (${lead.company})` : ''} added from ${lead.source}`,
          'lead_created',
          lead.id,
        );
        const r1 = dispatchEvent(next, 'new_lead', lead.id, { label: 'New lead created' });
        next = r1.state;
        logs = r1.logs;
        if (fromForm) {
          const r2 = dispatchEvent(next, 'form_submitted', lead.id, { label: 'Form submitted' });
          next = r2.state;
          logs = [...logs, ...r2.logs];
        }
        return next;
      });
      return { lead, logs };
    },
    [commit, get],
  );

  const updateLead = useCallback(
    (id, patch) => {
      const before = get().leads.find((l) => l.id === id);
      if (!before) return { logs: [] };
      let logs = [];
      commit((s) => {
        let next = { ...s, leads: s.leads.map((l) => (l.id === id ? { ...l, ...patch } : l)) };
        if (patch.status && patch.status !== before.status) {
          next = pushActivity(next, `${before.name} moved from ${before.status} to ${patch.status}`, 'status_changed', id);
          if (patch.status === 'Contacted' && !before.lastContactedAt)
            next.leads = next.leads.map((l) => (l.id === id ? { ...l, lastContactedAt: now() } : l));
          const r = dispatchEvent(next, 'status_changed', id, { toStatus: patch.status, label: `Status changed → ${patch.status}` });
          next = r.state;
          logs = r.logs;
        }
        return next;
      });
      return { logs };
    },
    [commit, get],
  );

  const deleteLead = useCallback(
    (id) =>
      commit((s) => ({
        ...s,
        leads: s.leads.filter((l) => l.id !== id),
        tasks: s.tasks.filter((t) => t.leadId !== id),
        messages: s.messages.filter((m) => m.leadId !== id),
        campaigns: s.campaigns.map((c) => ({ ...c, leadIds: c.leadIds.filter((x) => x !== id) })),
      })),
    [commit],
  );

  const markContacted = useCallback(
    (id) =>
      commit((s) => {
        const lead = s.leads.find((l) => l.id === id);
        return pushActivity({ ...s, leads: s.leads.map((l) => (l.id === id ? { ...l, lastContactedAt: now() } : l)) }, `Contact logged with ${lead?.name}`, 'contacted', id);
      }),
    [commit],
  );

  const addNote = useCallback(
    (leadId, text) =>
      commit((s) => {
        const note = { id: uid('note'), text: text.trim(), createdAt: now(), author: s.settings.senderName };
        return { ...s, leads: s.leads.map((l) => (l.id === leadId ? { ...l, notes: [...(l.notes || []), note] } : l)) };
      }),
    [commit],
  );

  const deleteNote = useCallback(
    (leadId, noteId) =>
      commit((s) => ({ ...s, leads: s.leads.map((l) => (l.id === leadId ? { ...l, notes: l.notes.filter((n) => n.id !== noteId) } : l)) })),
    [commit],
  );

  const saveQualification = useCallback(
    (leadId, q) =>
      commit((s) => {
        const lead = s.leads.find((l) => l.id === leadId);
        return pushActivity(
          { ...s, leads: s.leads.map((l) => (l.id === leadId ? { ...l, qualification: q } : l)) },
          `${lead?.name} qualified — score ${q.score} (${q.category.split(' — ')[0]})`,
          'qualified',
          leadId,
        );
      }),
    [commit],
  );

  // ---------------- Tasks & messages ----------------
  const addTask = useCallback(
    (leadId, title, dueAt) =>
      commit((s) => ({
        ...s,
        tasks: [{ id: uid('task'), leadId, title: title.trim(), dueAt, status: 'open', source: 'Manual', createdAt: now(), completedAt: null }, ...s.tasks],
      })),
    [commit],
  );

  const toggleTask = useCallback(
    (taskId) =>
      commit((s) => {
        const t = s.tasks.find((x) => x.id === taskId);
        if (!t) return s;
        const done = t.status !== 'done';
        let next = {
          ...s,
          tasks: s.tasks.map((x) => (x.id === taskId ? { ...x, status: done ? 'done' : 'open', completedAt: done ? now() : null } : x)),
        };
        if (done) {
          next = pushActivity(next, `Follow-up completed: ${t.title}`, 'task_completed', t.leadId);
          next.leads = next.leads.map((l) => (l.id === t.leadId ? { ...l, lastContactedAt: now() } : l));
        }
        return next;
      }),
    [commit],
  );

  const deleteTask = useCallback((taskId) => commit((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== taskId) })), [commit]);

  const saveMessage = useCallback(
    ({ leadId, kind = 'outreach', subject, body, workflowName = 'FlowPilot Copilot' }) => {
      const msg = { id: uid('msg'), leadId, kind, subject, body, createdAt: now(), workflowName, status: 'draft' };
      commit((s) => ({ ...s, messages: [msg, ...s.messages] }));
      return msg;
    },
    [commit],
  );

  const deleteMessage = useCallback((id) => commit((s) => ({ ...s, messages: s.messages.filter((m) => m.id !== id) })), [commit]);

  // ---------------- Workflows ----------------
  const saveWorkflow = useCallback(
    (wf) => {
      const exists = get().workflows.some((w) => w.id === wf.id);
      const record = exists ? wf : { ...wf, id: wf.id || uid('wf'), createdAt: now(), runCount: 0, lastRunAt: null };
      commit((s) => ({ ...s, workflows: exists ? s.workflows.map((w) => (w.id === wf.id ? record : w)) : [...s.workflows, record] }));
      return record;
    },
    [commit, get],
  );

  const deleteWorkflow = useCallback((id) => commit((s) => ({ ...s, workflows: s.workflows.filter((w) => w.id !== id) })), [commit]);

  const toggleWorkflow = useCallback(
    (id, active) => {
      commit((s) => ({ ...s, workflows: s.workflows.map((w) => (w.id === id ? { ...w, active: active ?? !w.active } : w)) }));
      return get().workflows.find((w) => w.id === id);
    },
    [commit, get],
  );

  const runWorkflow = useCallback(
    (id, { leadIds } = {}) => {
      const wf = get().workflows.find((w) => w.id === id);
      if (!wf) return { logs: [], error: 'Workflow not found' };
      let result;
      commit((s) => {
        result = executeWorkflow(s, wf, { leadIds, mode: 'manual', triggerLabel: `Manual run · ${wf.trigger.type.replace(/_/g, ' ')}` });
        return result.state;
      });
      return result;
    },
    [commit, get],
  );

  // ---------------- Campaigns ----------------
  const saveCampaign = useCallback(
    (c) => {
      const exists = c.id && get().campaigns.some((x) => x.id === c.id);
      const record = { ...c, id: c.id || uid('cmp'), updatedAt: now(), createdAt: c.createdAt || now(), status: c.status || 'Draft' };
      commit((s) => ({ ...s, campaigns: exists ? s.campaigns.map((x) => (x.id === c.id ? record : x)) : [record, ...s.campaigns] }));
      return record;
    },
    [commit, get],
  );

  const deleteCampaign = useCallback((id) => commit((s) => ({ ...s, campaigns: s.campaigns.filter((c) => c.id !== id) })), [commit]);

  /** Simulated send: queues pending log entries, then resolves them over a few seconds. Nothing is emailed. */
  const simulateCampaign = useCallback(
    (id, onDone) => {
      const s0 = get();
      const cmp = s0.campaigns.find((c) => c.id === id);
      if (!cmp) return;
      const recipients = cmp.leadIds.map((lid) => s0.leads.find((l) => l.id === lid)).filter(Boolean);
      const startedAt = now();
      const pendingLogs = recipients.map((l) => ({
        id: uid('log'),
        workflowId: null,
        campaignId: id,
        workflowName: `Campaign: ${cmp.name}`,
        trigger: 'Campaign simulation (demo)',
        mode: 'campaign',
        leadId: l.id,
        leadName: l.name,
        status: 'pending',
        actionSummary: 'Render personalised email → Simulated delivery',
        steps: [{ label: 'Render personalised email', status: 'pending', detail: 'Queued for simulation.' }],
        conditions: [],
        startedAt,
        durationMs: 0,
        outputs: {},
      }));
      commit((s) => ({
        ...s,
        campaigns: s.campaigns.map((c) => (c.id === id ? { ...c, status: 'Simulating', updatedAt: now() } : c)),
        logs: [...pendingLogs, ...s.logs],
      }));

      const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      pendingLogs.forEach((pl, i) => {
        const t = setTimeout(() => {
          const lead = get().leads.find((l) => l.id === pl.leadId);
          const ok = lead && valid.test(lead.email || '');
          commit((s) => ({
            ...s,
            logs: s.logs.map((lg) =>
              lg.id === pl.id
                ? {
                    ...lg,
                    status: ok ? 'success' : 'failed',
                    durationMs: 600 + i * 350,
                    note: ok ? undefined : 'Recipient has no valid email address.',
                    steps: [
                      { label: 'Render personalised email', status: ok ? 'success' : 'failed', detail: ok ? 'Merge tags resolved for this recipient.' : 'No valid email address — skipped.' },
                      ...(ok ? [{ label: 'Simulated delivery', status: 'success', detail: `DEMO ONLY — no email was sent. Would deliver to ${lead.email}.` }] : []),
                    ],
                  }
                : lg,
            ),
          }));
        }, 700 + i * 450);
        timers.current.push(t);
      });

      const finish = setTimeout(() => {
        const s = get();
        const done = s.logs.filter((l) => pendingLogs.some((p) => p.id === l.id));
        const delivered = done.filter((l) => l.status === 'success').length;
        commit((st) =>
          pushActivity(
            {
              ...st,
              campaigns: st.campaigns.map((c) =>
                c.id === id ? { ...c, status: 'Simulated', simulatedAt: now(), updatedAt: now(), results: { total: recipients.length, delivered, skipped: recipients.length - delivered } } : c,
              ),
            },
            `Campaign "${cmp.name}" simulated for ${recipients.length} recipients (demo — not sent)`,
            'campaign',
            null,
          ),
        );
        onDone?.({ total: recipients.length, delivered });
      }, 900 + recipients.length * 450);
      timers.current.push(finish);
    },
    [commit, get],
  );

  // ---------------- Copilot chat ----------------
  const addChat = useCallback((msg) => commit((s) => ({ ...s, chat: [...s.chat, { id: uid('chat'), at: now(), ...msg }].slice(-80) })), [commit]);
  const clearChat = useCallback(() => commit((s) => ({ ...s, chat: [] })), [commit]);

  // ---------------- Settings ----------------
  const updateSettings = useCallback((patch) => commit((s) => ({ ...s, settings: { ...s.settings, ...patch } })), [commit]);
  const setIntegration = useCallback((key, value) => commit((s) => ({ ...s, integrations: { ...s.integrations, [key]: value } })), [commit]);

  const resetDemo = useCallback(() => {
    timers.current.forEach(clearTimeout);
    clearState();
    commit(() => buildSeed());
  }, [commit]);

  /** Run every active scan-type workflow (dormant leads, due follow-ups) — a stand-in for a cron scheduler. */
  const runScheduledChecks = useCallback(() => {
    const scanWfs = get().workflows.filter((w) => w.active && ['no_contact', 'followup_due'].includes(w.trigger.type));
    const all = [];
    commit((s) => {
      let next = s;
      for (const wf of scanWfs) {
        const r = executeWorkflow(next, next.workflows.find((w) => w.id === wf.id), { mode: 'automatic', triggerLabel: 'Scheduled check' });
        next = r.state;
        all.push(...r.logs);
      }
      return next;
    });
    return { logs: all, workflows: scanWfs.length };
  }, [commit, get]);

  const actions = useMemo(
    () => ({
      addLead,
      updateLead,
      deleteLead,
      markContacted,
      addNote,
      deleteNote,
      saveQualification,
      addTask,
      toggleTask,
      deleteTask,
      saveMessage,
      deleteMessage,
      saveWorkflow,
      deleteWorkflow,
      toggleWorkflow,
      runWorkflow,
      runScheduledChecks,
      saveCampaign,
      deleteCampaign,
      simulateCampaign,
      addChat,
      clearChat,
      updateSettings,
      setIntegration,
      resetDemo,
      getState: get,
    }),
    [addLead, updateLead, deleteLead, markContacted, addNote, deleteNote, saveQualification, addTask, toggleTask, deleteTask, saveMessage, deleteMessage, saveWorkflow, deleteWorkflow, toggleWorkflow, runWorkflow, runScheduledChecks, saveCampaign, deleteCampaign, simulateCampaign, addChat, clearChat, updateSettings, setIntegration, resetDemo, get],
  );

  const value = useMemo(() => ({ state, actions }), [state, actions]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export const useStore = () => useContext(StoreContext);

