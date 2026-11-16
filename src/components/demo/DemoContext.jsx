// Guided demo: drives the REAL application (store actions + navigation),
// it does not fake screens. Pages listen for "signals" (e.g. run qualification,
// show run results, ask Copilot) so each step uses the same UI a user would.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../store/AppStore';
import { useRouter } from '../../lib/router';
import { useToast } from '../ui/Toast';
import { useUI } from '../../store/UIContext';

const DemoContext = createContext(null);

export const DEMO_LEAD = {
  name: 'Ngozi Adeyemi',
  email: 'ngozi.adeyemi@luminaretail.com',
  company: 'Lumina Retail Group',
  phone: '+234 802 555 0147',
  jobTitle: 'Head of Operations',
  source: 'Web Form',
  status: 'New',
  priority: 'Medium',
  companySize: '201-1000',
  industry: 'E-commerce',
  dealValue: '42000',
  note: 'Requested a demo: wants to automate order and wholesale follow-ups before peak season. Budget approved, timeline this month.',
};

export function DemoProvider({ children }) {
  const { state, actions } = useStore();
  const { navigate } = useRouter();
  const toast = useToast();
  const { notifyRuns } = useUI();
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [minimised, setMinimised] = useState(false);
  const [signal, setSignal] = useState(null);
  const [meta, setMeta] = useState({});
  const metaRef = useRef({});
  const sigId = useRef(0);

  const setM = (patch) => {
    metaRef.current = { ...metaRef.current, ...patch };
    setMeta(metaRef.current);
  };

  const emit = useCallback((type, payload) => setSignal({ id: ++sigId.current, type, payload }), []);
  const consume = useCallback((id) => setSignal((s) => (s && s.id === id ? null : s)), []);

  const ensureLead = useCallback(() => {
    const s = actions.getState();
    const existing = s.leads.find((l) => l.email === DEMO_LEAD.email);
    if (existing) return { lead: existing, logs: [], created: false };
    const { lead, logs } = actions.addLead(DEMO_LEAD);
    return { lead, logs, created: true };
  }, [actions]);

  const leadId = () => {
    const s = actions.getState();
    return s.leads.find((l) => l.email === DEMO_LEAD.email)?.id;
  };

  const steps = useMemo(
    () => [
      {
        key: 'overview',
        cta: 'Start on the dashboard',
        title: 'Your automation command centre',
        body: 'The Overview shows live KPIs — total and qualified leads, active workflows, follow-ups completed and conversion rate — plus the lead acquisition trend, pipeline breakdown and the latest automation activity. Every number is calculated from the CRM data, so it updates as we go.',
        enter: () => navigate('/'),
      },
      {
        key: 'leads',
        cta: 'View existing leads',
        title: 'A working CRM',
        body: 'Contacts & Leads holds every prospect with source, stage, priority, fit score and last contact. Search, filter by status/source/priority and sort — all client-side and instant.',
        enter: () => navigate('/leads'),
      },
      {
        key: 'add',
        cta: 'Add a new prospect',
        title: 'A new prospect arrives',
        body: () => {
          const fired = metaRef.current.autoLogs || [];
          return `We just added Ngozi Adeyemi (Head of Operations, Lumina Retail Group) as a new lead. ${
            fired.length
              ? `Notice the event-driven automation: "${fired.map((l) => l.workflowName).join('", "')}" fired the moment she was created and ${fired.some((l) => l.status === 'success') ? 'marked her High priority and drafted outreach' : 'evaluated its conditions'}.`
              : 'Active “New lead created” workflows run automatically whenever a lead is added.'
          }`;
        },
        enter: () => {
          const { lead, logs } = ensureLead();
          setM({ leadId: lead.id, autoLogs: logs });
          navigate(`/leads/${lead.id}`);
          if (logs.length) setTimeout(() => notifyRuns(logs), 400);
        },
      },
      {
        key: 'qualify',
        cta: 'Run AI qualification',
        title: 'AI lead qualification',
        body: 'The qualification engine scores authority, company fit, budget, source quality, contactability and buying intent from her notes. You get a score, a category, the reasoning behind it and a recommended next action. It is a transparent, deterministic model — no live LLM is claimed — and sits behind a provider interface ready for Claude.',
        enter: () => {
          const id = leadId() || ensureLead().lead.id;
          navigate(`/leads/${id}?tab=overview`);
          emit('qualify', { leadId: id });
        },
      },
      {
        key: 'studio',
        cta: 'Open Automation Studio',
        title: 'Automation Studio',
        body: 'Workflows are built from triggers, conditions and actions. “New Lead Welcome” is currently inactive — the highlighted card. Each workflow can be activated, deactivated, edited visually or run on demand.',
        highlight: 'wf_welcome',
        enter: () => navigate('/automations'),
      },
      {
        key: 'activate',
        cta: 'Activate “New Lead Welcome”',
        title: 'Workflow activated',
        body: '“New Lead Welcome” is now live: every future lead will automatically receive a personalised welcome draft and a follow-up call task.',
        highlight: 'wf_welcome',
        enter: () => {
          navigate('/automations');
          actions.toggleWorkflow('wf_welcome', true);
          toast.success('Workflow activated', '“New Lead Welcome” will now run on every new lead.');
        },
      },
      {
        key: 'execute',
        cta: 'Execute it for Ngozi',
        title: 'Execution results',
        body: 'We ran the workflow manually against Ngozi. The engine evaluated each step and recorded the outcome, duration and timestamp. Both actions succeeded — the outputs are real records saved in the CRM.',
        highlight: 'wf_welcome',
        enter: () => {
          navigate('/automations');
          const id = leadId() || ensureLead().lead.id;
          const res = actions.runWorkflow('wf_welcome', { leadIds: [id] });
          setM({ runLogId: res.logs[0]?.id, messageId: res.logs[0]?.outputs?.messageIds?.[0] });
          emit('run_result', { workflowId: 'wf_welcome', logs: res.logs });
        },
      },
      {
        key: 'email',
        cta: 'See the personalised email',
        title: 'The generated email',
        body: 'The welcome email references her source (web form), her own words from the CRM note and a concrete next step — then signs off with the sender from Settings. It is stored as a draft: nothing is sent without a connected, authorised email integration.',
        enter: () => {
          const id = leadId();
          emit('close_run_result');
          navigate(`/leads/${id}?tab=messages&open=${metaRef.current.messageId || ''}`);
        },
      },
      {
        key: 'task',
        cta: 'See the follow-up task',
        title: 'Follow-up task created',
        body: 'The workflow also created “Welcome call with Ngozi (Lumina Retail Group)”, due in two days. Completing it updates last-contact date and the dashboard’s follow-ups metric.',
        enter: () => navigate(`/leads/${leadId()}?tab=tasks`),
      },
      {
        key: 'log',
        cta: 'Inspect the execution log',
        title: 'Full audit trail',
        body: 'Every run is logged with workflow, trigger, actions, status, timestamp, duration and related lead. Open any entry to inspect step-by-step details — success, pending, skipped and failed runs are all recorded.',
        enter: () => navigate(`/logs?log=${metaRef.current.runLogId || ''}`),
      },
      {
        key: 'copilot',
        cta: 'Ask Copilot about Ngozi',
        title: 'FlowPilot Copilot',
        body: 'Copilot reads live CRM state — qualification, notes, tasks, drafts and automation history — to produce a contextual summary and next step. The same interface can be pointed at Claude through the secure /api/copilot backend.',
        enter: () => {
          navigate('/assistant');
          emit('ask', { text: `Summarise ${DEMO_LEAD.name}` });
        },
      },
    ],
    [navigate, actions, emit, ensureLead, notifyRuns, toast],
  );

  const goTo = useCallback(
    async (i) => {
      if (i < 0 || i > steps.length) return;
      setBusy(true);
      setStep(i);
      if (i < steps.length) await steps[i].enter();
      setTimeout(() => setBusy(false), 350);
    },
    [steps],
  );

  const start = useCallback(() => {
    setActive(true);
    setMinimised(false);
    metaRef.current = {};
    setMeta({});
    goTo(0);
  }, [goTo]);

  const exit = useCallback(() => {
    setActive(false);
    setSignal(null);
  }, []);

  // Keep the current lead id fresh if the user deletes the demo lead mid-tour.
  useEffect(() => {
    if (active && meta.leadId && !state.leads.some((l) => l.id === meta.leadId) && step > 2) {
      toast.warning('Demo lead was removed', 'Restarting from “Add a new prospect”.');
      goTo(2);
    }
  }, [active, meta.leadId, state.leads, step, goTo, toast]);

  const current = steps[step];
  const value = {
    active,
    step,
    total: steps.length,
    steps,
    current,
    busy,
    minimised,
    setMinimised,
    highlight: active && current ? current.highlight : null,
    signal,
    consume,
    start,
    exit,
    next: () => goTo(step + 1),
    back: () => goTo(step - 1),
    restart: start,
  };
  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export const useDemo = () => useContext(DemoContext);

// Guards against StrictMode's double effect invocation handling a signal twice.
const handledSignals = new Set();

/** Run handler when a demo signal of the given type is pending. */
export function useDemoSignal(type, handler) {
  const { signal, consume } = useDemo();
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (signal && signal.type === type && !handledSignals.has(signal.id)) {
      handledSignals.add(signal.id);
      consume(signal.id);
      ref.current(signal.payload);
    }
  }, [signal, type, consume]);
}
