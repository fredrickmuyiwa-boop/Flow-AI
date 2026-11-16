import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  Users, BadgeCheck, Workflow, CheckCircle2, TrendingUp, Plus, Sparkles, PlayCircle, ArrowRight, Zap, AlertCircle, Clock, Radar,
} from 'lucide-react';
import { useStore } from '../store/AppStore';
import { useRouter } from '../lib/router';
import { useUI } from '../store/UIContext';
import { useDemo } from '../components/demo/DemoContext';
import { useToast } from '../components/ui/Toast';
import { computeStats, leadAcquisitionSeries, pipelineBreakdown, leadsNeedingAttention } from '../logic/metrics';
import { describeTrigger } from '../engine/catalog';
import { STATUS_STYLES } from '../data/constants';
import { currency, timeAgo, cx, firstName } from '../lib/utils';
import Button from '../components/ui/Button';
import { LogBadge } from '../components/ui/Badge';
import { Avatar, EmptyState, SectionTitle } from '../components/ui/misc';

function Kpi({ icon: Icon, label, value, sub, tone = 'brand', onClick }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600',
    sky: 'bg-sky-50 text-sky-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    violet: 'bg-violet-50 text-violet-600',
  };
  return (
    <button onClick={onClick} className="card group p-4 text-left transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-center justify-between">
        <span className={cx('grid size-8 place-items-center rounded-lg', tones[tone])}>
          <Icon className="size-4" />
        </span>
        <ArrowRight className="size-3.5 text-ink-300 opacity-0 transition group-hover:opacity-100" />
      </div>
      <p className="mt-3 text-[12px] font-semibold text-ink-500">{label}</p>
      <p className="mt-0.5 text-2xl font-bold tracking-tight text-ink-900 tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 truncate text-xs text-ink-400">{sub}</p>}
    </button>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-xs shadow-lift">
      <p className="mb-1 font-semibold text-ink-900">Week ending {label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-ink-600">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          {p.dataKey === 'inbound' ? 'Inbound' : 'Outbound'}: <span className="font-semibold text-ink-900">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

export default function Overview() {
  const { state, actions } = useStore();
  const { navigate } = useRouter();
  const ui = useUI();
  const demo = useDemo();
  const toast = useToast();

  const stats = useMemo(() => computeStats(state), [state]);
  const series = useMemo(() => leadAcquisitionSeries(state.leads), [state.leads]);
  const pipeline = useMemo(() => pipelineBreakdown(state.leads), [state.leads]);
  const attention = useMemo(() => leadsNeedingAttention(state).slice(0, 4), [state]);
  const maxStage = Math.max(...pipeline.map((p) => p.count), 1);

  const feed = useMemo(() => {
    const logs = state.logs.slice(0, 12).map((l) => ({ kind: 'log', at: l.startedAt, log: l }));
    const acts = state.activity.slice(0, 12).map((a) => ({ kind: 'act', at: a.at, act: a }));
    return [...logs, ...acts].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 8);
  }, [state.logs, state.activity]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const runChecks = () => {
    const { logs, workflows } = actions.runScheduledChecks();
    if (!workflows) return toast.warning('No scheduled workflows are active', 'Activate a “not contacted” or “follow-up due” workflow first.');
    if (!logs.length) return toast.info('Scheduled checks complete', 'No leads matched — everything is up to date.');
    toast.success('Scheduled checks complete', `${logs.length} lead${logs.length > 1 ? 's' : ''} processed across ${workflows} workflow${workflows > 1 ? 's' : ''}.`, {
      action: { label: 'View logs', onClick: () => navigate('/logs') },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-end 2xl:justify-between">
        <div>
          <p className="eyebrow mb-1">Overview</p>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-[28px]">
            {greeting}, {firstName(state.settings.senderName)}
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Automate the busywork. Focus on growth. <span className="text-ink-400">·</span>{' '}
            <span className="font-medium text-ink-700">{stats.newThisWeek} new leads</span> and{' '}
            <span className="font-medium text-ink-700">{stats.runsThisWeek} automation runs</span> this week.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button icon={Plus} onClick={ui.openLeadForm}>Add lead</Button>
          <Button icon={Workflow} onClick={() => navigate('/automations/new')}>New workflow</Button>
          <Button icon={Radar} onClick={runChecks}>Run scheduled checks</Button>
          <Button icon={Sparkles} variant="soft" onClick={() => navigate('/assistant')}>Ask Copilot</Button>
          {!demo.active && <Button icon={PlayCircle} variant="dark" onClick={demo.start}>Run Demo</Button>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi icon={Users} label="Total leads" value={stats.total} sub={`+${stats.newThisWeek} in the last 7 days`} onClick={() => navigate('/leads')} />
        <Kpi icon={BadgeCheck} tone="violet" label="Qualified leads" value={stats.qualified} sub="Qualified, Proposal or Converted" onClick={() => navigate('/leads')} />
        <Kpi icon={Workflow} tone="sky" label="Active workflows" value={`${stats.activeWorkflows}/${stats.totalWorkflows}`} sub={`${stats.runsThisWeek} runs this week`} onClick={() => navigate('/automations')} />
        <Kpi icon={CheckCircle2} tone="emerald" label="Follow-ups completed" value={stats.followupsDone} sub={`${stats.openTasks} open · ${stats.overdue} overdue`} onClick={() => navigate('/leads')} />
        <Kpi icon={TrendingUp} tone="amber" label="Conversion rate" value={`${stats.conversionRate.toFixed(1)}%`} sub={`${stats.converted} converted · ${currency(stats.pipelineValue)} open`} onClick={() => navigate('/leads')} />
        <Kpi icon={Zap} tone="brand" label="Automation success" value={`${Math.round(stats.successRate)}%`} sub={`${state.logs.length} logged executions`} onClick={() => navigate('/logs')} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="card p-5 xl:col-span-2">
          <SectionTitle
            action={
              <div className="flex items-center gap-3 text-xs text-ink-500">
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-brand-500" /> Inbound</span>
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-sky-400" /> Outbound</span>
              </div>
            }
          >
            Lead acquisition · last 8 weeks
          </SectionTitle>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6d5cf6" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#6d5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#eef0f7" />
                <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#9097b5' }} dy={6} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#9097b5' }} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#d3ccff' }} />
                <Area type="monotone" dataKey="inbound" stackId="1" stroke="#6d5cf6" strokeWidth={2} fill="url(#gIn)" />
                <Area type="monotone" dataKey="outbound" stackId="1" stroke="#38bdf8" strokeWidth={2} fill="url(#gOut)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <SectionTitle action={<span className="text-xs text-ink-500">{stats.total} leads</span>}>Pipeline breakdown</SectionTitle>
          <div className="space-y-3.5">
            {pipeline.map((p) => (
              <button key={p.status} onClick={() => navigate(`/leads?status=${p.status}`)} className="group block w-full text-left">
                <div className="mb-1.5 flex items-center justify-between text-[13px]">
                  <span className="flex items-center gap-2 font-semibold text-ink-800">
                    <span className={cx('size-2 rounded-full', STATUS_STYLES[p.status].dot)} />
                    {p.status}
                  </span>
                  <span className="text-ink-500 tabular-nums">
                    <span className="font-semibold text-ink-900">{p.count}</span> · {currency(p.value)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-ink-100">
                  <div className="h-full rounded-full transition-all duration-700 group-hover:opacity-80" style={{ width: `${(p.count / maxStage) * 100}%`, background: STATUS_STYLES[p.status].chart }} />
                </div>
              </button>
            ))}
          </div>
          <div className="mt-5 rounded-xl bg-ink-50 p-3 text-xs text-ink-500">
            Stage-to-stage: <span className="font-semibold text-ink-800">New → Contacted → Qualified → Proposal → Converted</span>. Click a stage to filter leads.
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <div className="card p-5">
          <SectionTitle action={<button className="text-xs font-semibold text-brand-600 hover:text-brand-700" onClick={() => navigate('/logs')}>All logs</button>}>
            Recent activity
          </SectionTitle>
          {feed.length ? (
            <ul className="space-y-3.5">
              {feed.map((f, i) =>
                f.kind === 'log' ? (
                  <li key={`l${f.log.id}${i}`}>
                    <button className="flex w-full gap-3 text-left" onClick={() => navigate(`/logs?log=${f.log.id}`)}>
                      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600"><Zap className="size-3.5" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-ink-900">{f.log.workflowName}</span>
                        <span className="block truncate text-xs text-ink-500">{f.log.leadName} · {timeAgo(f.at)}</span>
                      </span>
                      <LogBadge status={f.log.status} />
                    </button>
                  </li>
                ) : (
                  <li key={`a${f.act.id}${i}`}>
                    <button className="flex w-full gap-3 text-left" onClick={() => f.act.leadId && navigate(`/leads/${f.act.leadId}`)}>
                      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-ink-100 text-ink-500"><Clock className="size-3.5" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] leading-snug text-ink-800">{f.act.text}</span>
                        <span className="block text-xs text-ink-400">{timeAgo(f.at)}</span>
                      </span>
                    </button>
                  </li>
                ),
              )}
            </ul>
          ) : (
            <EmptyState icon={Clock} title="No activity yet" message="Add a lead or run a workflow to see activity here." />
          )}
        </div>

        <div className="card p-5">
          <SectionTitle action={<button className="text-xs font-semibold text-brand-600 hover:text-brand-700" onClick={() => navigate('/automations')}>Studio</button>}>
            Active automations
          </SectionTitle>
          {state.workflows.filter((w) => w.active).length ? (
            <div className="space-y-2.5">
              {state.workflows
                .filter((w) => w.active)
                .map((w) => (
                  <button key={w.id} onClick={() => navigate(`/automations/${w.id}`)} className="w-full rounded-xl border border-ink-200 p-3 text-left transition hover:border-brand-200 hover:bg-brand-50/40">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-[13px] font-semibold text-ink-900">
                        <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" /><span className="relative inline-flex size-2 rounded-full bg-emerald-500" /></span>
                        {w.name}
                      </span>
                      <span className="text-[11px] text-ink-400">{w.runCount} runs</span>
                    </div>
                    <p className="mt-1 text-xs text-ink-500">
                      {describeTrigger(w.trigger)} · {w.actions.length} action{w.actions.length > 1 ? 's' : ''} · last run {timeAgo(w.lastRunAt)}
                    </p>
                  </button>
                ))}
            </div>
          ) : (
            <EmptyState icon={Workflow} title="No active workflows" message="Activate a workflow in Automation Studio." action={<Button size="sm" variant="primary" onClick={() => navigate('/automations')}>Open Studio</Button>} />
          )}
        </div>

        <div className="card p-5 lg:col-span-2 xl:col-span-1">
          <SectionTitle action={<button className="text-xs font-semibold text-brand-600 hover:text-brand-700" onClick={() => navigate('/assistant')}>Ask Copilot</button>}>
            Needs attention
          </SectionTitle>
          {attention.length ? (
            <ul className="divide-y divide-ink-100">
              {attention.map(({ lead, reasons, score }) => (
                <li key={lead.id}>
                  <button className="flex w-full items-center gap-3 py-2.5 text-left" onClick={() => navigate(`/leads/${lead.id}`)}>
                    <Avatar name={lead.name} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-ink-900">{lead.name}</span>
                      <span className="flex items-center gap-1 truncate text-xs text-amber-700">
                        <AlertCircle className="size-3 shrink-0" /> {reasons[0]}
                      </span>
                    </span>
                    <span className="text-xs font-bold text-ink-500 tabular-nums">{score}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={CheckCircle2} title="All caught up" message="No stale leads or overdue follow-ups." />
          )}
        </div>
      </div>
    </div>
  );
}
