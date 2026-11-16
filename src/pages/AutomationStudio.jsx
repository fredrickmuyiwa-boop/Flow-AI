import { useState } from 'react';
import { Plus, Play, Pencil, Copy, Trash2, Workflow, Radar, Clock, Activity, CircleCheck } from 'lucide-react';
import { useStore } from '../store/AppStore';
import { useRouter } from '../lib/router';
import { useToast } from '../components/ui/Toast';
import { useDemo, useDemoSignal } from '../components/demo/DemoContext';
import { TRIGGERS } from '../engine/catalog';
import { cx, timeAgo, uid } from '../lib/utils';
import Button, { IconButton } from '../components/ui/Button';
import { Toggle, PageHeader, EmptyState } from '../components/ui/misc';
import { ConfirmDialog } from '../components/ui/Modal';
import FlowChips from '../components/automation/FlowChips';
import RunResult from '../components/automation/RunResult';
import RunDialog from '../components/automation/RunDialog';

export default function AutomationStudio() {
  const { state, actions } = useStore();
  const { navigate } = useRouter();
  const toast = useToast();
  const demo = useDemo();
  const [running, setRunning] = useState(null);
  const [result, setResult] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useDemoSignal('run_result', (p) => {
    const wf = state.workflows.find((w) => w.id === p.workflowId);
    setResult({ ...p, workflowName: wf?.name });
  });
  useDemoSignal('close_run_result', () => setResult(null));

  const stats = (wf) => {
    const logs = state.logs.filter((l) => l.workflowId === wf.id);
    return { logs: logs.length, ok: logs.filter((l) => l.status === 'success').length, failed: logs.filter((l) => l.status === 'failed').length };
  };

  const run = (wf, leadIds) => {
    const res = actions.runWorkflow(wf.id, { leadIds });
    setRunning(null);
    if (res.error) return toast.error('Could not run workflow', res.error);
    setResult({ ...res, workflowName: wf.name });
    const ok = res.logs.filter((l) => l.status === 'success').length;
    if (res.logs.length) toast.success(`“${wf.name}” executed`, `${res.logs.length} lead${res.logs.length > 1 ? 's' : ''} processed · ${ok} succeeded.`);
  };

  const toggle = (wf) => {
    actions.toggleWorkflow(wf.id);
    toast.success(wf.active ? 'Workflow deactivated' : 'Workflow activated', wf.active ? `“${wf.name}” will no longer run automatically.` : `“${wf.name}” is now listening for “${TRIGGERS[wf.trigger.type].label.toLowerCase()}”.`);
  };

  const duplicate = (wf) => {
    const copy = actions.saveWorkflow({ ...structuredClone(wf), id: uid('wf'), name: `${wf.name} (copy)`, active: false });
    toast.success('Workflow duplicated', `“${copy.name}” created as inactive.`);
  };

  const runChecks = () => {
    const { logs, workflows } = actions.runScheduledChecks();
    if (!workflows) return toast.warning('No scheduled workflows are active');
    setResult({ logs, workflowName: 'Scheduled checks' });
  };

  const activeCount = state.workflows.filter((w) => w.active).length;
  const runs24h = state.logs.filter((l) => l.workflowId && Date.now() - new Date(l.startedAt) < 86400000).length;

  return (
    <div>
      <PageHeader
        eyebrow="Automation"
        title="Automation Studio"
        description="Build workflows from triggers, conditions and actions. Event triggers run instantly; scan triggers run on schedule or on demand."
        actions={
          <>
            <Button icon={Radar} onClick={runChecks}>Run scheduled checks</Button>
            <Button variant="primary" icon={Plus} onClick={() => navigate('/automations/new')}>New workflow</Button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-3 gap-3">
        {[
          [Activity, 'Active workflows', `${activeCount} / ${state.workflows.length}`],
          [Clock, 'Runs in last 24h', runs24h],
          [CircleCheck, 'Success rate', `${state.logs.length ? Math.round((state.logs.filter((l) => l.status === 'success').length / state.logs.length) * 100) : 0}%`],
        ].map(([Icon, label, value]) => (
          <div key={label} className="card flex items-center gap-3 p-3.5">
            <span className="hidden size-9 place-items-center rounded-lg bg-brand-50 text-brand-600 sm:grid"><Icon className="size-4" /></span>
            <div>
              <p className="text-[11px] font-semibold text-ink-500 sm:text-xs">{label}</p>
              <p className="text-lg font-bold tabular-nums text-ink-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {state.workflows.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {state.workflows.map((wf) => {
            const s = stats(wf);
            const hl = demo.highlight === wf.id;
            return (
              <div key={wf.id} className={cx('card flex flex-col p-5 transition', hl && 'demo-highlight border-brand-300', !wf.active && 'bg-white/70')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cx('size-2 rounded-full', wf.active ? 'bg-emerald-500' : 'bg-ink-300')} />
                      <h3 className="truncate text-[15px] font-bold text-ink-900">{wf.name}</h3>
                    </div>
                    <p className="mt-1 text-[13px] leading-snug text-ink-500">{wf.description || 'No description.'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cx('text-xs font-semibold', wf.active ? 'text-emerald-600' : 'text-ink-400')}>{wf.active ? 'Active' : 'Inactive'}</span>
                    <Toggle checked={wf.active} onChange={() => toggle(wf)} label={`${wf.active ? 'Deactivate' : 'Activate'} ${wf.name}`} />
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-dashed border-ink-200 bg-ink-50/50 p-3">
                  <FlowChips workflow={wf} />
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-ink-500">
                    <span className="font-semibold text-ink-700">{wf.runCount}</span> runs · {s.ok} logged OK{s.failed ? <span className="text-rose-600"> · {s.failed} failed</span> : ''} · last {timeAgo(wf.lastRunAt)}
                  </p>
                  <div className="flex items-center gap-1">
                    <IconButton icon={Pencil} label="Edit workflow" size="sm" onClick={() => navigate(`/automations/${wf.id}`)} />
                    <IconButton icon={Copy} label="Duplicate workflow" size="sm" onClick={() => duplicate(wf)} />
                    <IconButton icon={Trash2} label="Delete workflow" size="sm" className="hover:!bg-rose-50 hover:!text-rose-600" onClick={() => setDeleting(wf)} />
                    <Button size="sm" variant="primary" icon={Play} onClick={() => setRunning(wf)} className="ml-1">Run now</Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card">
          <EmptyState icon={Workflow} title="No workflows yet" message="Create your first automation — e.g. welcome every new lead automatically." action={<Button variant="primary" icon={Plus} onClick={() => navigate('/automations/new')}>New workflow</Button>} />
        </div>
      )}

      {running && <RunDialog wf={running} onClose={() => setRunning(null)} onRun={(ids) => run(running, ids)} />}
      <RunResult open={!!result} result={result} onClose={() => setResult(null)} />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title={`Delete “${deleting?.name}”?`}
        message="The workflow stops running immediately. Its past execution logs are kept."
        onConfirm={() => {
          actions.deleteWorkflow(deleting.id);
          toast.success('Workflow deleted');
        }}
      />
    </div>
  );
}
