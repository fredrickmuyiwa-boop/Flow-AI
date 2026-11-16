import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Mail, Phone, Building2, Briefcase, CalendarDays, Radio, Pencil, Trash2, Sparkles, Loader2, Brain, Target, Lightbulb,
  StickyNote, Send, CheckSquare, Square, Plus, Copy, Zap, MessageSquareText, PhoneCall, Play, Bot, Check, ChevronDown,
} from 'lucide-react';
import { useStore } from '../store/AppStore';
import { useRouter } from '../lib/router';
import { useUI } from '../store/UIContext';
import { useToast } from '../components/ui/Toast';
import { useDemoSignal } from '../components/demo/DemoContext';
import { qualifyLead } from '../ai/provider';
import { getLeadScore } from '../logic/qualification';
import { EMAIL_TEMPLATES } from '../logic/messaging';
import { LEAD_STATUSES, PRIORITIES, STATUS_STYLES } from '../data/constants';
import { cx, formatDate, formatDateTime, timeAgo, currency, DAY } from '../lib/utils';
import Button from '../components/ui/Button';
import { Input, Select, Textarea } from '../components/ui/Field';
import { LogBadge, PriorityBadge, ScorePill, StatusBadge, Badge } from '../components/ui/Badge';
import { Avatar, EmptyState, SectionTitle } from '../components/ui/misc';
import { ConfirmDialog } from '../components/ui/Modal';
import LeadForm from '../components/leads/LeadForm';

const TABS = [
  { key: 'overview', label: 'Notes & timeline', icon: StickyNote },
  { key: 'messages', label: 'Emails', icon: MessageSquareText },
  { key: 'tasks', label: 'Tasks', icon: CheckSquare },
  { key: 'automation', label: 'Automation', icon: Zap },
];

function ScoreRing({ score }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const color = score >= 75 ? '#10b981' : score >= 55 ? '#6d5cf6' : score >= 35 ? '#f59e0b' : '#9097b5';
  return (
    <div className="relative size-24 shrink-0">
      <svg viewBox="0 0 80 80" className="size-24 -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#eef0f7" strokeWidth="7" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (score / 100) * c} style={{ transition: 'stroke-dashoffset 0.9s ease' }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-2xl font-extrabold tabular-nums text-ink-900">{score}</p>
          <p className="-mt-1 text-[10px] font-semibold text-ink-400">/ 100</p>
        </div>
      </div>
    </div>
  );
}

function QualificationCard({ lead, onRun, running }) {
  const q = lead.qualification;
  return (
    <div className={cx('card overflow-hidden', running && 'ring-2 ring-brand-200')}>
      <div className="flex items-center justify-between border-b border-ink-100 bg-gradient-to-r from-brand-50 to-sky-50/60 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-white text-brand-600 shadow-card"><Brain className="size-4" /></span>
          <div>
            <p className="text-sm font-bold text-ink-900">AI qualification</p>
            <p className="text-[11px] text-ink-500">Deterministic local model · explainable</p>
          </div>
        </div>
        <Button size="sm" variant={q ? 'secondary' : 'primary'} icon={Sparkles} loading={running} onClick={onRun}>
          {running ? 'Analysing…' : q ? 'Re-run' : 'Qualify lead'}
        </Button>
      </div>
      {running ? (
        <div className="space-y-3 p-5">
          {['Reading contact & firmographic data', 'Weighing source quality and authority', 'Scanning notes for buying intent'].map((t, i) => (
            <div key={t} className="flex items-center gap-2.5 text-[13px] text-ink-600" style={{ animation: `fade-in .3s ${i * 0.25}s both` }}>
              <Loader2 className="size-3.5 animate-spin text-brand-500" /> {t}…
            </div>
          ))}
        </div>
      ) : q ? (
        <div className="p-5">
          <div className="flex items-center gap-4">
            <ScoreRing score={q.score} />
            <div className="min-w-0">
              <p className="eyebrow">Lead category</p>
              <p className="mt-0.5 text-[15px] font-bold leading-snug text-ink-900">{q.category}</p>
              <p className="mt-1 text-[11px] text-ink-400">Qualified {timeAgo(q.at)}</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-ink-800"><Target className="size-3.5 text-brand-500" /> Reasoning</p>
            <ul className="space-y-1.5">
              {(q.strengths || []).slice(0, 4).map((r) => (
                <li key={r} className="flex gap-2 text-[13px] leading-snug text-ink-700"><Check className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />{r}</li>
              ))}
              {(q.gaps || []).slice(0, 3).map((r) => (
                <li key={r} className="flex gap-2 text-[13px] leading-snug text-ink-500"><span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-amber-400" />{r}</li>
              ))}
            </ul>
          </div>
          <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50/60 p-3">
            <p className="flex items-center gap-1.5 text-xs font-bold text-brand-800"><Lightbulb className="size-3.5" /> Recommended next action</p>
            <p className="mt-1 text-[13px] leading-snug text-ink-800">{q.nextAction}</p>
          </div>
        </div>
      ) : (
        <div className="p-5 text-center">
          <p className="text-sm text-ink-600">Not qualified yet. Estimated fit: <span className="font-bold text-ink-900">{getLeadScore(lead)}</span>/100</p>
          <p className="mt-1 text-xs text-ink-400">Run qualification to save a score, category, reasoning and next action.</p>
        </div>
      )}
    </div>
  );
}

function MessageCard({ m, defaultOpen, onDelete, onCopy }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={cx('rounded-xl border bg-white transition', defaultOpen ? 'border-brand-300 ring-4 ring-brand-100' : 'border-ink-200')}>
      <button className="flex w-full items-start gap-3 p-3.5 text-left" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600"><Mail className="size-4" /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink-900">{m.subject}</span>
          <span className="mt-0.5 block text-xs text-ink-500">
            {EMAIL_TEMPLATES[m.kind] || 'Campaign email'} · by {m.workflowName} · {timeAgo(m.createdAt)}
          </span>
        </span>
        <Badge className="bg-ink-50 text-ink-600 ring-ink-200">Draft · not sent</Badge>
        <ChevronDown className={cx('mt-1 size-4 shrink-0 text-ink-400 transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="border-t border-ink-100 px-4 pb-4 pt-3">
          <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-ink-700">{m.body}</pre>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="xs" icon={Copy} onClick={() => onCopy(m)}>Copy email</Button>
            <Button size="xs" variant="ghost" icon={Trash2} onClick={() => onDelete(m)} className="hover:!text-rose-600">Delete draft</Button>
            <span className="ml-auto self-center text-[11px] text-ink-400">Sending requires a connected email integration.</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LeadDetail({ params }) {
  const { state, actions } = useStore();
  const { navigate, query } = useRouter();
  const ui = useUI();
  const toast = useToast();
  const lead = state.leads.find((l) => l.id === params.id);
  const [tab, setTab] = useState(TABS.some((t) => t.key === query.tab) ? query.tab : 'overview');
  const [running, setRunning] = useState(false);
  const [note, setNote] = useState('');
  const [noteErr, setNoteErr] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDue, setTaskDue] = useState(() => new Date(Date.now() + 2 * DAY).toISOString().slice(0, 10));
  const [taskErr, setTaskErr] = useState('');
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [wfToRun, setWfToRun] = useState('');

  useEffect(() => {
    if (TABS.some((t) => t.key === query.tab)) setTab(query.tab);
  }, [query.tab]);

  const tasks = useMemo(() => state.tasks.filter((t) => t.leadId === params.id).sort((a, b) => (a.status === b.status ? new Date(a.dueAt) - new Date(b.dueAt) : a.status === 'open' ? -1 : 1)), [state.tasks, params.id]);
  const messages = useMemo(() => state.messages.filter((m) => m.leadId === params.id), [state.messages, params.id]);
  const logs = useMemo(() => state.logs.filter((l) => l.leadId === params.id), [state.logs, params.id]);
  const timeline = useMemo(() => {
    if (!lead) return [];
    const notes = (lead.notes || []).map((n) => ({ kind: 'note', at: n.createdAt, n }));
    const acts = state.activity.filter((a) => a.leadId === lead.id).map((a) => ({ kind: 'act', at: a.at, a }));
    return [...notes, ...acts].sort((a, b) => new Date(b.at) - new Date(a.at));
  }, [lead, state.activity]);

  const runQualification = async () => {
    if (!lead || running) return;
    setRunning(true);
    try {
      const result = await qualifyLead(lead);
      actions.saveQualification(lead.id, result);
      toast.success(`Qualified: ${result.score}/100`, result.category);
    } catch (e) {
      toast.error('Qualification failed', e.message);
    } finally {
      setRunning(false);
    }
  };

  useDemoSignal('qualify', (p) => {
    if (p.leadId === params.id) {
      setTab('overview');
      runQualification();
    }
  });

  if (!lead)
    return (
      <div className="card">
        <EmptyState icon={Building2} title="Lead not found" message="This lead may have been deleted." action={<Button variant="primary" onClick={() => navigate('/leads')}>Back to leads</Button>} />
      </div>
    );

  const changeStatus = (to) => {
    if (to === lead.status) return;
    const { logs: ran } = actions.updateLead(lead.id, { status: to });
    toast.success('Status updated', `${lead.name} → ${to}`);
    if (ran.length) setTimeout(() => ui.notifyRuns(ran), 300);
  };

  const addNote = (e) => {
    e.preventDefault();
    if (note.trim().length < 2) return setNoteErr('Write a note before saving.');
    actions.addNote(lead.id, note);
    setNote('');
    setNoteErr('');
    toast.success('Note added');
  };

  const addTask = (e) => {
    e.preventDefault();
    if (!taskTitle.trim()) return setTaskErr('Give the task a title.');
    if (!taskDue) return setTaskErr('Pick a due date.');
    actions.addTask(lead.id, taskTitle, new Date(`${taskDue}T10:00:00`).toISOString());
    setTaskTitle('');
    setTaskErr('');
    toast.success('Follow-up task created');
  };

  const copy = async (m) => {
    try {
      await navigator.clipboard.writeText(`Subject: ${m.subject}\n\n${m.body}`);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Clipboard unavailable', 'Your browser blocked clipboard access — select the text to copy it.');
    }
  };

  const runWf = () => {
    if (!wfToRun) return;
    const res = actions.runWorkflow(wfToRun, { leadIds: [lead.id] });
    const log = res.logs[0];
    if (res.error) return toast.error('Could not run workflow', res.error);
    const fn = log.status === 'success' ? toast.success : log.status === 'failed' ? toast.error : toast.info;
    fn(`${log.workflowName}: ${log.status}`, log.note || log.actionSummary, { action: { label: 'Inspect log', onClick: () => navigate(`/logs?log=${log.id}`) } });
    setTab('automation');
  };

  const stageIdx = LEAD_STATUSES.indexOf(lead.status);
  const openTasks = tasks.filter((t) => t.status === 'open').length;

  return (
    <div>
      <button onClick={() => navigate('/leads')} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-900">
        <ArrowLeft className="size-4" /> Contacts & Leads
      </button>

      <div className="card mb-4 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={lead.name} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-ink-900">{lead.name}</h1>
                <StatusBadge status={lead.status} />
                <PriorityBadge priority={lead.priority} />
              </div>
              <p className="mt-0.5 text-sm text-ink-500">
                {[lead.jobTitle, lead.company].filter(Boolean).join(' at ') || 'No role or company on record'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" icon={PhoneCall} onClick={() => { actions.markContacted(lead.id); toast.success('Contact logged', `Last-contacted date updated for ${lead.name}.`); }}>Log contact</Button>
            <Button size="sm" icon={Bot} onClick={() => navigate(`/assistant?q=${encodeURIComponent(`Summarise ${lead.name}`)}`)}>Ask Copilot</Button>
            <Button size="sm" icon={Pencil} onClick={() => setEditing(true)}>Edit</Button>
            <Button size="sm" variant="danger" icon={Trash2} onClick={() => setDeleting(true)}>Delete</Button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-5 gap-1.5" role="group" aria-label="Pipeline stage">
          {LEAD_STATUSES.map((s, i) => (
            <button
              key={s}
              onClick={() => changeStatus(s)}
              className={cx(
                'group rounded-lg px-1 py-2 text-center text-[11px] font-semibold transition sm:text-xs',
                i <= stageIdx ? 'text-white' : 'bg-ink-100 text-ink-500 hover:bg-ink-200',
              )}
              style={i <= stageIdx ? { background: STATUS_STYLES[lead.status].chart } : undefined}
              aria-pressed={s === lead.status}
              title={`Move to ${s}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <QualificationCard lead={lead} onRun={runQualification} running={running} />

          <div className="card p-5">
            <SectionTitle>Details</SectionTitle>
            <dl className="space-y-2.5 text-[13px]">
              {[
                [Mail, 'Email', lead.email ? <a className="text-brand-600 hover:underline" href={`mailto:${lead.email}`}>{lead.email}</a> : '—'],
                [Phone, 'Phone', lead.phone || '—'],
                [Building2, 'Company', [lead.company, lead.companySize && `${lead.companySize} employees`].filter(Boolean).join(' · ') || '—'],
                [Briefcase, 'Industry', lead.industry || '—'],
                [Radio, 'Source', lead.source],
                [CalendarDays, 'Date added', formatDate(lead.createdAt)],
                [PhoneCall, 'Last contacted', lead.lastContactedAt ? `${formatDate(lead.lastContactedAt)} (${timeAgo(lead.lastContactedAt)})` : 'Never'],
                [Target, 'Est. deal value', lead.dealValue ? currency(lead.dealValue) : '—'],
                [CalendarDays, 'Follow-up date', lead.followUpDate ? formatDate(lead.followUpDate) : '—'],
              ].map(([Icon, k, v]) => (
                <div key={k} className="flex items-start gap-2.5">
                  <Icon className="mt-0.5 size-3.5 shrink-0 text-ink-400" />
                  <dt className="w-28 shrink-0 text-ink-500">{k}</dt>
                  <dd className="min-w-0 flex-1 break-words font-medium text-ink-800">{v}</dd>
                </div>
              ))}
              <div className="flex items-center gap-2.5 pt-1">
                <span className="size-3.5" />
                <dt className="w-28 shrink-0 text-ink-500">Priority</dt>
                <dd className="flex-1">
                  <Select
                    aria-label="Lead priority"
                    options={PRIORITIES}
                    value={lead.priority}
                    onChange={(e) => {
                      actions.updateLead(lead.id, { priority: e.target.value });
                      toast.success('Priority updated', `${lead.name} is now ${e.target.value} priority.`);
                    }}
                    className="h-8 py-1"
                  />
                </dd>
              </div>
            </dl>
          </div>

          <div className="card p-5">
            <SectionTitle>Run a workflow on this lead</SectionTitle>
            <div className="flex gap-2">
              <Select aria-label="Workflow to run" options={state.workflows.map((w) => w.id)} labels={Object.fromEntries(state.workflows.map((w) => [w.id, w.name]))} placeholder="Choose workflow…" value={wfToRun} onChange={(e) => setWfToRun(e.target.value)} />
              <Button variant="primary" icon={Play} disabled={!wfToRun} onClick={runWf}>Run</Button>
            </div>
            <p className="mt-2 text-xs text-ink-400">Conditions are evaluated against this lead. Results appear in Automation and Activity Logs.</p>
          </div>
        </div>

        <div className="card min-w-0">
          <div className="flex gap-1 overflow-x-auto border-b border-ink-100 px-3 pt-2 scrollbar-thin" role="tablist">
            {TABS.map(({ key, label, icon: Icon }) => {
              const count = { messages: messages.length, tasks: openTasks, automation: logs.length }[key];
              return (
                <button
                  key={key}
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => setTab(key)}
                  className={cx('-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-[13px] font-semibold transition', tab === key ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-500 hover:text-ink-800')}
                >
                  <Icon className="size-4" /> {label}
                  {count ? <span className="rounded-md bg-ink-100 px-1.5 text-[11px] text-ink-600">{count}</span> : null}
                </button>
              );
            })}
          </div>

          <div className="p-5">
            {tab === 'overview' && (
              <div>
                <form onSubmit={addNote} className="mb-5">
                  <Textarea value={note} onChange={(e) => { setNote(e.target.value); setNoteErr(''); }} placeholder={`Add a note about ${lead.name.split(' ')[0]} — call outcome, objections, next steps…`} error={noteErr} className="min-h-[72px]" aria-label="New note" />
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-rose-600">{noteErr}</span>
                    <Button type="submit" size="sm" variant="primary" icon={Send}>Add note</Button>
                  </div>
                </form>
                {timeline.length ? (
                  <ol className="relative space-y-4 border-l border-ink-200 pl-5">
                    {timeline.map((t) =>
                      t.kind === 'note' ? (
                        <li key={t.n.id} className="relative">
                          <span className={cx('absolute -left-[27px] top-1 grid size-3.5 place-items-center rounded-full ring-4 ring-white', t.n.system ? 'bg-brand-500' : 'bg-ink-800')} />
                          <div className={cx('rounded-xl border p-3', t.n.kind === 'summary' ? 'border-brand-200 bg-brand-50/50' : 'border-ink-200 bg-white')}>
                            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink-800">{t.n.text}</p>
                            <div className="mt-2 flex items-center justify-between text-[11px] text-ink-400">
                              <span>{t.n.author} · {formatDateTime(t.n.createdAt)}</span>
                              <button className="font-semibold hover:text-rose-600" onClick={() => { actions.deleteNote(lead.id, t.n.id); toast.success('Note deleted'); }}>Delete</button>
                            </div>
                          </div>
                        </li>
                      ) : (
                        <li key={t.a.id} className="relative">
                          <span className="absolute -left-[25px] top-1.5 size-2.5 rounded-full bg-ink-300 ring-4 ring-white" />
                          <p className="text-[13px] text-ink-600">{t.a.text}</p>
                          <p className="text-[11px] text-ink-400">{formatDateTime(t.at)}</p>
                        </li>
                      ),
                    )}
                  </ol>
                ) : (
                  <EmptyState icon={StickyNote} title="No notes yet" message="Notes feed AI qualification and personalised emails." />
                )}
              </div>
            )}

            {tab === 'messages' && (
              <div>
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
                  These are AI-generated <strong>drafts</strong> stored in FlowPilot. No email has been sent — sending requires connecting and authorising an email provider (e.g. Gmail) in Settings.
                </div>
                {messages.length ? (
                  <div className="space-y-2.5">
                    {messages.map((m) => (
                      <MessageCard key={m.id} m={m} defaultOpen={query.open === m.id || (query.tab === 'messages' && messages[0].id === m.id && !query.open)} onCopy={copy} onDelete={(x) => { actions.deleteMessage(x.id); toast.success('Draft deleted'); }} />
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={Mail} title="No email drafts yet" message="Run a workflow with “Generate personalised email”, or ask Copilot to draft one." action={<Button size="sm" icon={Bot} onClick={() => navigate(`/assistant?q=${encodeURIComponent(`Draft an email to ${lead.name}`)}`)}>Draft with Copilot</Button>} />
                )}
              </div>
            )}

            {tab === 'tasks' && (
              <div>
                <form onSubmit={addTask} className="mb-4 flex flex-col gap-2 sm:flex-row">
                  <Input value={taskTitle} onChange={(e) => { setTaskTitle(e.target.value); setTaskErr(''); }} placeholder="New follow-up task…" error={taskErr && !taskTitle.trim() ? taskErr : ''} aria-label="Task title" />
                  <Input type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} className="sm:w-44" aria-label="Due date" />
                  <Button type="submit" variant="primary" icon={Plus}>Add</Button>
                </form>
                {taskErr && <p className="-mt-2 mb-3 text-xs font-medium text-rose-600">{taskErr}</p>}
                {tasks.length ? (
                  <ul className="space-y-2">
                    {tasks.map((t) => {
                      const overdue = t.status === 'open' && new Date(t.dueAt) < new Date(new Date().setHours(0, 0, 0, 0));
                      return (
                        <li key={t.id} className={cx('flex items-start gap-3 rounded-xl border p-3', t.status === 'done' ? 'border-ink-100 bg-ink-50/60' : 'border-ink-200 bg-white', t.source !== 'Manual' && t.status === 'open' && Date.now() - new Date(t.createdAt) < 120000 && 'ring-4 ring-brand-100 border-brand-300')}>
                          <button onClick={() => { actions.toggleTask(t.id); toast.success(t.status === 'done' ? 'Task reopened' : 'Follow-up completed'); }} aria-label={t.status === 'done' ? 'Mark as open' : 'Mark as done'} className="mt-0.5 text-ink-400 hover:text-brand-600">
                            {t.status === 'done' ? <CheckSquare className="size-5 text-emerald-500" /> : <Square className="size-5" />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className={cx('text-sm font-semibold', t.status === 'done' ? 'text-ink-400 line-through' : 'text-ink-900')}>{t.title}</p>
                            <p className="mt-0.5 text-xs text-ink-500">
                              <span className={overdue ? 'font-semibold text-rose-600' : ''}>{overdue ? 'Overdue · ' : ''}Due {formatDate(t.dueAt, { weekday: 'short' })}</span> · {t.source === 'Manual' ? 'Created manually' : <>Created by <span className="font-medium text-brand-700">{t.source}</span></>}
                            </p>
                          </div>
                          <button className="text-xs font-semibold text-ink-400 hover:text-rose-600" onClick={() => { actions.deleteTask(t.id); toast.success('Task deleted'); }}>Delete</button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <EmptyState icon={CheckSquare} title="No follow-up tasks" message="Create one above, or let a workflow create them automatically." />
                )}
              </div>
            )}

            {tab === 'automation' && (
              logs.length ? (
                <ul className="divide-y divide-ink-100">
                  {logs.map((l) => (
                    <li key={l.id}>
                      <button className="flex w-full items-center gap-3 py-3 text-left" onClick={() => navigate(`/logs?log=${l.id}`)}>
                        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600"><Zap className="size-4" /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-ink-900">{l.workflowName}</span>
                          <span className="block truncate text-xs text-ink-500">{l.actionSummary} · {formatDateTime(l.startedAt)}</span>
                        </span>
                        <LogBadge status={l.status} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={Zap} title="No automation runs for this lead" message="Use “Run a workflow on this lead” or activate a workflow." />
              )
            )}
          </div>
        </div>
      </div>

      <LeadForm
        open={editing}
        initial={lead}
        title={`Edit ${lead.name}`}
        submitLabel="Save changes"
        onClose={() => setEditing(false)}
        onSubmit={(v) => {
          const { note: _n, ...patch } = v;
          const { logs: ran } = actions.updateLead(lead.id, { ...patch, dealValue: v.dealValue ? Number(v.dealValue) : 0 });
          setEditing(false);
          toast.success('Lead updated');
          if (ran.length) setTimeout(() => ui.notifyRuns(ran), 300);
        }}
      />
      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        title={`Delete ${lead.name}?`}
        message="This removes the lead, their tasks and drafted emails. Automation logs are kept for audit."
        onConfirm={() => {
          actions.deleteLead(lead.id);
          toast.success('Lead deleted');
          navigate('/leads');
        }}
      />
    </div>
  );
}
