import { CheckCircle2, XCircle, MinusCircle, Clock, Mail, CheckSquare, ExternalLink, Filter } from 'lucide-react';
import { Modal } from '../ui/Modal';
import Button from '../ui/Button';
import { LogBadge } from '../ui/Badge';
import { useStore } from '../../store/AppStore';
import { useRouter } from '../../lib/router';
import { formatDateTime, cx } from '../../lib/utils';

const STEP_ICON = {
  success: <CheckCircle2 className="size-4 text-emerald-500" />,
  failed: <XCircle className="size-4 text-rose-500" />,
  not_run: <MinusCircle className="size-4 text-ink-300" />,
  pending: <Clock className="size-4 text-amber-500" />,
};

export function StepList({ log }) {
  return (
    <ol className="space-y-2">
      {log.conditions?.map((c, i) => (
        <li key={`c${i}`} className="flex gap-2.5 rounded-lg bg-ink-50 px-3 py-2 text-[13px]">
          <Filter className={cx('mt-0.5 size-4 shrink-0', c.passed ? 'text-emerald-500' : 'text-rose-500')} />
          <span>
            <span className="font-semibold text-ink-800">Condition · {c.label}</span>
            <span className="block text-xs text-ink-500">{c.passed ? 'Passed' : 'Not met'} — {c.detail}</span>
          </span>
        </li>
      ))}
      {log.steps?.map((s, i) => (
        <li key={i} className="flex gap-2.5 rounded-lg border border-ink-100 px-3 py-2 text-[13px]">
          <span className="mt-0.5 shrink-0">{STEP_ICON[s.status] || STEP_ICON.not_run}</span>
          <span className="min-w-0">
            <span className="font-semibold text-ink-800">
              {i + 1}. {s.label}
            </span>
            <span className="block text-xs leading-snug text-ink-500">{s.detail}</span>
          </span>
        </li>
      ))}
      {!log.steps?.length && log.note && <li className="rounded-lg bg-ink-50 px-3 py-2 text-[13px] text-ink-600">{log.note}</li>}
    </ol>
  );
}

export default function RunResult({ open, onClose, result }) {
  const { state } = useStore();
  const { navigate } = useRouter();
  if (!result) return null;
  const { logs = [], workflowName, skippedRecent = 0 } = result;
  const msgIds = logs.flatMap((l) => l.outputs?.messageIds || []);
  const taskIds = logs.flatMap((l) => l.outputs?.taskIds || []);
  const msgs = state.messages.filter((m) => msgIds.includes(m.id));
  const tasks = state.tasks.filter((t) => taskIds.includes(t.id));
  const ok = logs.filter((l) => l.status === 'success').length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Execution results · ${workflowName}`}
      description={logs.length ? `${logs.length} lead${logs.length > 1 ? 's' : ''} processed · ${ok} succeeded · ${formatDateTime(logs[0]?.startedAt)}` : 'No leads matched this workflow’s trigger.'}
      size="lg"
      footer={
        <>
          {logs[0] && <Button icon={ExternalLink} onClick={() => { onClose(); navigate(`/logs?log=${logs[0].id}`); }}>Open in Activity Logs</Button>}
          <Button variant="primary" onClick={onClose}>Done</Button>
        </>
      }
    >
      {!logs.length ? (
        <div className="rounded-xl bg-ink-50 p-4 text-sm text-ink-600">
          Nothing to do right now — no leads currently match the trigger{skippedRecent ? ` (${skippedRecent} already processed recently and skipped to avoid duplicates)` : ''}.
        </div>
      ) : (
        <div className="space-y-5">
          {skippedRecent > 0 && <p className="text-xs text-ink-500">{skippedRecent} lead(s) skipped — already processed by this workflow recently.</p>}
          {logs.slice(0, 6).map((log) => (
            <div key={log.id} className="rounded-xl border border-ink-200 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-ink-900">{log.leadName}</p>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-ink-400">{log.durationMs}ms</span>
                  <LogBadge status={log.status} />
                </div>
              </div>
              <StepList log={log} />
            </div>
          ))}
          {logs.length > 6 && <p className="text-xs text-ink-500">+ {logs.length - 6} more — see Activity Logs.</p>}

          {msgs.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-500"><Mail className="size-3.5" /> Generated email{msgs.length > 1 ? 's' : ''} (draft — not sent)</p>
              {msgs.slice(0, 2).map((m) => (
                <div key={m.id} className="mb-2 rounded-xl border border-brand-200 bg-brand-50/40 p-4">
                  <p className="text-sm font-semibold text-ink-900">Subject: {m.subject}</p>
                  <pre className="mt-2 max-h-56 overflow-y-auto whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-ink-700 scrollbar-thin">{m.body}</pre>
                </div>
              ))}
            </div>
          )}
          {tasks.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-500"><CheckSquare className="size-3.5" /> Follow-up tasks created</p>
              <ul className="space-y-1.5">
                {tasks.slice(0, 5).map((t) => (
                  <li key={t.id} className="flex items-center justify-between rounded-lg border border-ink-200 px-3 py-2 text-[13px]">
                    <span className="font-medium text-ink-800">{t.title}</span>
                    <span className="text-xs text-ink-500">Due {new Date(t.dueAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
