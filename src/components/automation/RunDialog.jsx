import { useMemo, useState } from 'react';
import { Play } from 'lucide-react';
import { useStore } from '../../store/AppStore';
import { TRIGGERS } from '../../engine/catalog';
import { findTargets } from '../../engine/automationEngine';
import Button from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Field, Select } from '../ui/Field';

export default function RunDialog({ wf, onClose, onRun }) {
  const { state } = useStore();
  const scan = TRIGGERS[wf?.trigger.type]?.mode === 'scan';
  const sorted = useMemo(() => [...state.leads].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), [state.leads]);
  const [leadId, setLeadId] = useState(sorted[0]?.id || '');
  const preview = useMemo(() => (wf && scan ? findTargets(state, wf) : null), [wf, scan, state]);
  if (!wf) return null;
  return (
    <Modal
      open
      onClose={onClose}
      title={`Run “${wf.name}”`}
      description={scan ? 'This trigger scans your CRM for matching leads.' : 'Event triggers run on one lead at a time. Choose which lead to test with.'}
      size="sm"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={Play} disabled={scan ? false : !leadId} onClick={() => onRun(scan ? undefined : [leadId])}>
            Run now
          </Button>
        </>
      }
    >
      {scan ? (
        <div className="rounded-xl bg-ink-50 p-4 text-sm text-ink-700">
          <p>
            <span className="text-2xl font-bold text-ink-900">{preview.leads.length}</span> lead{preview.leads.length === 1 ? '' : 's'} currently match.
          </p>
          {preview.leads.length > 0 && <p className="mt-1 text-xs text-ink-500">{preview.leads.slice(0, 5).map((l) => l.name).join(', ')}{preview.leads.length > 5 ? '…' : ''}</p>}
          {preview.skippedRecent > 0 && <p className="mt-2 text-xs text-ink-500">{preview.skippedRecent} already processed recently — skipped to prevent duplicate outreach.</p>}
        </div>
      ) : sorted.length ? (
        <Field label="Lead">
          <Select options={sorted.map((l) => l.id)} labels={Object.fromEntries(sorted.map((l) => [l.id, `${l.name}${l.company ? ` — ${l.company}` : ''}`]))} value={leadId} onChange={(e) => setLeadId(e.target.value)} />
        </Field>
      ) : (
        <p className="text-sm text-ink-500">Add a lead first to test this workflow.</p>
      )}
      {!wf.active && <p className="mt-3 text-xs text-ink-500">This workflow is inactive. Manual runs still work; activate it to run automatically.</p>}
    </Modal>
  );
}
