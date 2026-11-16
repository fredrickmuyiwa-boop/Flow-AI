import { useEffect, useMemo, useState } from 'react';
import { ScrollText, Search, FilterX, ExternalLink, Code2, User, Workflow, Zap, Clock, Hash } from 'lucide-react';
import { useStore } from '../store/AppStore';
import { useRouter } from '../lib/router';
import { LOG_STATUS_STYLES } from '../data/constants';
import { cx, formatDateTime, timeAgo } from '../lib/utils';
import Button from '../components/ui/Button';
import { Select } from '../components/ui/Field';
import { LogBadge } from '../components/ui/Badge';
import { EmptyState, PageHeader } from '../components/ui/misc';
import { Drawer } from '../components/ui/Modal';
import { StepList } from '../components/automation/RunResult';

const MODES = { All: 'All runs', automatic: 'Automatic', manual: 'Manual', campaign: 'Campaign' };

export default function ActivityLogs() {
  const { state } = useStore();
  const { query, navigate } = useRouter();
  const [status, setStatus] = useState('All');
  const [wf, setWf] = useState('All');
  const [mode, setMode] = useState('All');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState(query.log || null);
  const [raw, setRaw] = useState(false);

  useEffect(() => {
    if (query.log) setOpenId(query.log);
  }, [query.log]);

  const workflowNames = useMemo(() => [...new Set(state.logs.map((l) => l.workflowName))], [state.logs]);
  const rows = useMemo(
    () =>
      state.logs.filter(
        (l) =>
          (status === 'All' || l.status === status) &&
          (wf === 'All' || l.workflowName === wf) &&
          (mode === 'All' || l.mode === mode) &&
          (!q.trim() || `${l.leadName} ${l.workflowName} ${l.actionSummary}`.toLowerCase().includes(q.trim().toLowerCase())),
      ),
    [state.logs, status, wf, mode, q],
  );
  const counts = useMemo(() => Object.fromEntries(Object.keys(LOG_STATUS_STYLES).map((k) => [k, state.logs.filter((l) => l.status === k).length])), [state.logs]);
  const open = state.logs.find((l) => l.id === openId);
  const lead = open && state.leads.find((l) => l.id === open.leadId);
  const filtered = status !== 'All' || wf !== 'All' || mode !== 'All' || q;

  const close = () => {
    setOpenId(null);
    setRaw(false);
    if (query.log) navigate('/logs');
  };

  return (
    <div>
      <PageHeader eyebrow="Monitoring" title="Activity Logs" description="A complete audit trail of every workflow execution, campaign simulation and automated action." />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Object.entries(LOG_STATUS_STYLES).map(([k, s]) => (
          <button key={k} onClick={() => setStatus(status === k ? 'All' : k)} className={cx('card flex items-center justify-between p-3.5 text-left transition', status === k && 'ring-2 ring-brand-300')}>
            <span className="flex items-center gap-2 text-[13px] font-semibold text-ink-700">
              <span className={cx('size-2 rounded-full', s.dot)} /> {s.label}
            </span>
            <span className="text-lg font-bold tabular-nums text-ink-900">{counts[k]}</span>
          </button>
        ))}
      </div>

      <div className="card">
        <div className="flex flex-col gap-2 border-b border-ink-100 p-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by lead, workflow or action…" className="input pl-9" aria-label="Search logs" />
          </div>
          <div className="grid grid-cols-3 gap-2 lg:flex">
            <Select aria-label="Status" options={['All', ...Object.keys(LOG_STATUS_STYLES)]} labels={{ All: 'All statuses', ...Object.fromEntries(Object.entries(LOG_STATUS_STYLES).map(([k, s]) => [k, s.label])) }} value={status} onChange={(e) => setStatus(e.target.value)} className="lg:w-36" />
            <Select aria-label="Workflow" options={['All', ...workflowNames]} labels={{ All: 'All workflows' }} value={wf} onChange={(e) => setWf(e.target.value)} className="lg:w-56" />
            <Select aria-label="Mode" options={Object.keys(MODES)} labels={MODES} value={mode} onChange={(e) => setMode(e.target.value)} className="lg:w-36" />
          </div>
        </div>
        <div className="flex items-center justify-between px-4 py-2.5 text-xs text-ink-500">
          <span><b className="text-ink-800">{rows.length}</b> of {state.logs.length} executions</span>
          {filtered && (
            <button className="inline-flex items-center gap-1 font-semibold text-brand-600" onClick={() => { setStatus('All'); setWf('All'); setMode('All'); setQ(''); }}>
              <FilterX className="size-3.5" /> Clear filters
            </button>
          )}
        </div>

        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-y border-ink-100 bg-ink-50/70 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                  <th className="px-4 py-2.5">Timestamp</th>
                  <th className="px-3 py-2.5">Workflow</th>
                  <th className="px-3 py-2.5">Trigger</th>
                  <th className="px-3 py-2.5">Action performed</th>
                  <th className="px-3 py-2.5">Related lead</th>
                  <th className="px-3 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {rows.map((l) => (
                  <tr key={l.id} onClick={() => setOpenId(l.id)} className={cx('cursor-pointer hover:bg-brand-50/30', openId === l.id && 'bg-brand-50/50')}>
                    <td className="whitespace-nowrap px-4 py-3">
                      <p className="font-mono text-[12px] text-ink-800">{formatDateTime(l.startedAt)}</p>
                      <p className="text-[11px] text-ink-400">{timeAgo(l.startedAt)}</p>
                    </td>
                    <td className="px-3 py-3 font-semibold text-ink-900">{l.workflowName}</td>
                    <td className="px-3 py-3 text-[13px] text-ink-600">
                      {l.trigger}
                      <span className="block text-[11px] capitalize text-ink-400">{l.mode}</span>
                    </td>
                    <td className="max-w-[280px] px-3 py-3 text-[13px] text-ink-600"><span className="line-clamp-2">{l.actionSummary}</span></td>
                    <td className="px-3 py-3 text-[13px] font-medium text-ink-800">{l.leadName}</td>
                    <td className="px-3 py-3"><LogBadge status={l.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={ScrollText} title={state.logs.length ? 'No executions match' : 'No executions yet'} message={state.logs.length ? 'Adjust the filters to see more.' : 'Run a workflow in Automation Studio to see its execution log here.'} />
        )}
      </div>

      <Drawer
        open={!!open}
        onClose={close}
        title={open?.workflowName}
        subtitle={open && <span className="flex items-center gap-2"><LogBadge status={open.status} /> <span className="font-mono text-xs">{formatDateTime(open.startedAt)}</span></span>}
        footer={
          open && (
            <>
              {lead && <Button icon={User} onClick={() => navigate(`/leads/${lead.id}`)}>Open lead</Button>}
              {open.workflowId && state.workflows.some((w) => w.id === open.workflowId) && <Button icon={Workflow} onClick={() => navigate(`/automations/${open.workflowId}`)}>Open workflow</Button>}
            </>
          )
        }
      >
        {open && (
          <div className="space-y-5">
            <dl className="grid grid-cols-2 gap-3">
              {[
                [Zap, 'Trigger', open.trigger],
                [Clock, 'Duration', open.status === 'pending' ? 'In progress…' : `${open.durationMs} ms`],
                [User, 'Related lead', open.leadName],
                [Workflow, 'Mode', <span className="capitalize">{open.mode}</span>],
                [Hash, 'Execution ID', <span className="font-mono text-[11px]">{open.id}</span>],
                [Clock, 'Started', formatDateTime(open.startedAt)],
              ].map(([Icon, k, v]) => (
                <div key={k} className="rounded-xl border border-ink-100 bg-ink-50/60 p-3">
                  <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400"><Icon className="size-3" /> {k}</dt>
                  <dd className="mt-1 text-[13px] font-semibold text-ink-900">{v}</dd>
                </div>
              ))}
            </dl>

            {open.note && (
              <div className={cx('rounded-xl border p-3 text-[13px]', open.status === 'failed' ? 'border-rose-200 bg-rose-50 text-rose-800' : open.status === 'pending' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-ink-200 bg-ink-50 text-ink-700')}>
                {open.note}
              </div>
            )}

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">Execution steps</p>
              <StepList log={open} />
            </div>

            {(open.outputs?.messageIds?.length > 0 || open.outputs?.taskIds?.length > 0) && lead && (
              <div className="flex flex-wrap gap-2">
                {open.outputs.messageIds?.length > 0 && <Button size="sm" icon={ExternalLink} onClick={() => navigate(`/leads/${lead.id}?tab=messages&open=${open.outputs.messageIds[0]}`)}>View generated email</Button>}
                {open.outputs.taskIds?.length > 0 && <Button size="sm" icon={ExternalLink} onClick={() => navigate(`/leads/${lead.id}?tab=tasks`)}>View created task</Button>}
              </div>
            )}

            <div>
              <button onClick={() => setRaw((r) => !r)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-ink-900">
                <Code2 className="size-3.5" /> {raw ? 'Hide' : 'Show'} raw execution record
              </button>
              {raw && <pre className="mt-2 max-h-72 overflow-auto rounded-xl bg-ink-950 p-3.5 font-mono text-[11px] leading-relaxed text-emerald-200 scrollbar-thin">{JSON.stringify(open, null, 2)}</pre>}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
