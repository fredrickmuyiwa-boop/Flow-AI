import { useMemo, useState } from 'react';
import { Megaphone, Plus, Sparkles, Eye, Save, Send, Trash2, Pencil, Users, FlaskConical, Loader2, CheckCircle2, Search } from 'lucide-react';
import { useStore } from '../store/AppStore';
import { useToast } from '../components/ui/Toast';
import { useRouter } from '../lib/router';
import { LEAD_SOURCES, LEAD_STATUSES, PRIORITIES } from '../data/constants';
import { generateCampaignContent, renderTemplate } from '../logic/messaging';
import { cx, formatDateTime, timeAgo, EMAIL_RE } from '../lib/utils';
import Button, { IconButton } from '../components/ui/Button';
import { Field, Input, Select, Textarea } from '../components/ui/Field';
import { Badge } from '../components/ui/Badge';
import { EmptyState, PageHeader } from '../components/ui/misc';
import { Modal, ConfirmDialog } from '../components/ui/Modal';

const GOALS = { nurture: 'Nurture & educate', convert: 'Convert open deals', reengage: 'Re-engage quiet leads', announce: 'Product announcement' };
const TONES = { friendly: 'Friendly', professional: 'Professional', bold: 'Bold & direct' };

const STATUS_BADGE = {
  Draft: 'bg-ink-100 text-ink-700 ring-ink-200',
  Simulating: 'bg-amber-50 text-amber-700 ring-amber-200',
  Simulated: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
};

const blank = () => ({
  name: '',
  goal: 'nurture',
  tone: 'friendly',
  audience: { mode: 'filter', status: 'All', source: 'All', priority: 'All' },
  leadIds: [],
  subject: '',
  body: '',
});

function resolveAudience(c, leads) {
  if (c.audience.mode === 'manual') return leads.filter((l) => c.leadIds.includes(l.id));
  const a = c.audience;
  return leads.filter((l) => (a.status === 'All' || l.status === a.status) && (a.source === 'All' || l.source === a.source) && (a.priority === 'All' || l.priority === a.priority));
}

function Editor({ initial, onClose }) {
  const { state, actions } = useStore();
  const toast = useToast();
  const [c, setC] = useState(() => structuredClone(initial || blank()));
  const [errors, setErrors] = useState({});
  const [generating, setGenerating] = useState(false);
  const [previewId, setPreviewId] = useState('');
  const [search, setSearch] = useState('');

  const audience = useMemo(() => resolveAudience(c, state.leads), [c, state.leads]);
  const reachable = audience.filter((l) => EMAIL_RE.test(l.email || ''));
  const previewLead = audience.find((l) => l.id === previewId) || audience[0];
  const set = (patch) => {
    setC((x) => ({ ...x, ...patch }));
    setErrors({});
  };
  const setAud = (patch) => set({ audience: { ...c.audience, ...patch } });

  const generate = () => {
    setGenerating(true);
    setTimeout(() => {
      const g = generateCampaignContent({ goal: c.goal, tone: c.tone, name: c.name }, state.settings);
      set({ subject: g.subject, body: g.body });
      setGenerating(false);
      toast.success('Campaign copy generated', `${GOALS[c.goal]} · ${TONES[c.tone]} tone. Edit freely before saving.`);
    }, 700);
  };

  const save = () => {
    const e = {};
    if (!c.name.trim()) e.name = 'Name your campaign.';
    if (!audience.length) e.audience = 'Select at least one recipient.';
    if (!c.subject.trim()) e.subject = 'Add a subject line (or generate one).';
    if (c.body.trim().length < 20) e.body = 'Write the email body (at least 20 characters).';
    setErrors(e);
    if (Object.keys(e).length) return toast.error('Draft not saved', Object.values(e)[0]);
    const saved = actions.saveCampaign({ ...c, leadIds: audience.map((l) => l.id), status: 'Draft' });
    toast.success(initial ? 'Campaign draft updated' : 'Campaign draft saved', `${saved.name} · ${audience.length} recipients.`);
    onClose();
  };

  const manualList = state.leads.filter((l) => !search || `${l.name} ${l.company}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={initial ? `Edit “${initial.name}”` : 'New campaign'}
      description="Build a personalised email campaign. Saving creates a draft — nothing is sent."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={Save} onClick={save}>Save draft</Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Campaign name" required error={errors.name} className="sm:col-span-3">
            <Input value={c.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Peak-season automation offer" error={errors.name} />
          </Field>
          <Field label="Goal">
            <Select options={Object.keys(GOALS)} labels={GOALS} value={c.goal} onChange={(e) => set({ goal: e.target.value })} />
          </Field>
          <Field label="Tone">
            <Select options={Object.keys(TONES)} labels={TONES} value={c.tone} onChange={(e) => set({ tone: e.target.value })} />
          </Field>
          <Field label="Audience">
            <Select options={['filter', 'manual']} labels={{ filter: 'By filters', manual: 'Pick leads' }} value={c.audience.mode} onChange={(e) => setAud({ mode: e.target.value })} />
          </Field>
        </div>

        <div className={cx('rounded-xl border p-4', errors.audience ? 'border-rose-300' : 'border-ink-200')}>
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-sm font-bold text-ink-900"><Users className="size-4 text-brand-500" /> Target leads</p>
            <span className="text-xs text-ink-500"><b className="text-ink-900">{audience.length}</b> selected · {reachable.length} with valid email</span>
          </div>
          {c.audience.mode === 'filter' ? (
            <div className="grid gap-2 sm:grid-cols-3">
              <Select aria-label="Status" options={['All', ...LEAD_STATUSES]} labels={{ All: 'Any status' }} value={c.audience.status} onChange={(e) => setAud({ status: e.target.value })} />
              <Select aria-label="Source" options={['All', ...LEAD_SOURCES]} labels={{ All: 'Any source' }} value={c.audience.source} onChange={(e) => setAud({ source: e.target.value })} />
              <Select aria-label="Priority" options={['All', ...PRIORITIES]} labels={{ All: 'Any priority' }} value={c.audience.priority} onChange={(e) => setAud({ priority: e.target.value })} />
            </div>
          ) : (
            <div>
              <div className="relative mb-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search leads…" className="input pl-9" />
              </div>
              <div className="max-h-44 space-y-0.5 overflow-y-auto scrollbar-thin">
                {manualList.map((l) => (
                  <label key={l.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] hover:bg-ink-50">
                    <input
                      type="checkbox"
                      className="size-4 accent-brand-600"
                      checked={c.leadIds.includes(l.id)}
                      onChange={(e) => set({ leadIds: e.target.checked ? [...c.leadIds, l.id] : c.leadIds.filter((x) => x !== l.id) })}
                    />
                    <span className="flex-1 truncate font-medium text-ink-800">{l.name}</span>
                    <span className="truncate text-xs text-ink-400">{l.company} · {l.status}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {errors.audience && <p className="mt-2 text-xs font-medium text-rose-600">{errors.audience}</p>}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-ink-900">Email content</p>
              <Button size="xs" variant="soft" icon={Sparkles} loading={generating} onClick={generate}>Generate with AI</Button>
            </div>
            <Field label="Subject" error={errors.subject}>
              <Input value={c.subject} onChange={(e) => set({ subject: e.target.value })} placeholder="Subject line — merge tags allowed" error={errors.subject} />
            </Field>
            <Field label="Body" error={errors.body} hint="Merge tags: {{first_name}} {{company}} {{industry}} {{sender_name}}">
              <Textarea value={c.body} onChange={(e) => set({ body: e.target.value })} className="min-h-[220px] font-mono text-[12.5px]" error={errors.body} placeholder="Write or generate your email…" />
            </Field>
          </div>
          <div>
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-sm font-bold text-ink-900"><Eye className="size-4 text-brand-500" /> Preview</p>
              {audience.length > 0 && (
                <Select aria-label="Preview recipient" options={audience.map((l) => l.id)} labels={Object.fromEntries(audience.map((l) => [l.id, l.name]))} value={previewLead?.id || ''} onChange={(e) => setPreviewId(e.target.value)} className="h-8 max-w-[200px] py-1 text-xs" />
              )}
            </div>
            <div className="rounded-xl border border-ink-200 bg-ink-50/60 p-4">
              {previewLead && (c.subject || c.body) ? (
                <>
                  <p className="text-[11px] text-ink-500">To: {previewLead.name} &lt;{previewLead.email || 'no email'}&gt;</p>
                  <p className="mt-1 text-sm font-bold text-ink-900">{renderTemplate(c.subject, previewLead, state.settings)}</p>
                  <pre className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-ink-700 scrollbar-thin">{renderTemplate(c.body, previewLead, state.settings)}</pre>
                </>
              ) : (
                <p className="py-10 text-center text-xs text-ink-400">{audience.length ? 'Add or generate content to preview it for each recipient.' : 'Select recipients to preview personalised messages.'}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function Campaigns() {
  const { state, actions } = useStore();
  const toast = useToast();
  const { navigate } = useRouter();
  const [editing, setEditing] = useState(null);
  const [confirmSim, setConfirmSim] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const simulate = (cmp) => {
    setConfirmSim(null);
    actions.simulateCampaign(cmp.id, ({ total, delivered }) =>
      toast.success('Simulation complete (demo)', `${delivered} of ${total} recipients would receive this email. No emails were sent.`, { action: { label: 'View logs', onClick: () => navigate('/logs') } }),
    );
    toast.info('Simulation started', 'Queued recipients appear as pending in Activity Logs.');
  };

  return (
    <div>
      <PageHeader
        eyebrow="Outreach"
        title="Campaigns"
        description="Create targeted, personalised email campaigns. Sending is simulated in this demo — connect an email provider to send for real."
        actions={<Button variant="primary" icon={Plus} onClick={() => setEditing('new')}>New campaign</Button>}
      />

      <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
        <FlaskConical className="mt-0.5 size-4 shrink-0" />
        <p><strong>Demo mode:</strong> “Simulate send” renders each personalised email and records the outcome in Activity Logs, but does not deliver any email. Real delivery requires connecting and authorising Gmail (or another provider) in Settings.</p>
      </div>

      {state.campaigns.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {state.campaigns.map((c) => {
            const sim = c.status === 'Simulating';
            return (
              <div key={c.id} className="card flex flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-[15px] font-bold text-ink-900">{c.name}</h3>
                    <p className="mt-0.5 text-xs text-ink-500">{GOALS[c.goal]} · {TONES[c.tone]}</p>
                  </div>
                  <Badge className={STATUS_BADGE[c.status]}>
                    {sim && <Loader2 className="size-3 animate-spin" />}
                    {c.status === 'Simulated' ? 'Simulated (demo)' : c.status}
                  </Badge>
                </div>
                <div className="mt-4 rounded-xl bg-ink-50 p-3">
                  <p className="truncate text-[13px] font-semibold text-ink-800">{c.subject}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-ink-500">{c.body.replace(/\n+/g, ' ')}</p>
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-ink-500">
                  <span className="flex items-center gap-1"><Users className="size-3.5" /> {c.leadIds.length} recipients</span>
                  <span>Updated {timeAgo(c.updatedAt)}</span>
                </div>
                {c.results && c.status === 'Simulated' && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                    <CheckCircle2 className="size-3.5" /> {c.results.delivered}/{c.results.total} would be delivered · simulated {formatDateTime(c.simulatedAt)}
                  </div>
                )}
                <div className="mt-auto flex items-center justify-end gap-1 pt-4">
                  <IconButton icon={Pencil} label="Edit campaign" size="sm" disabled={sim} onClick={() => setEditing(c)} />
                  <IconButton icon={Trash2} label="Delete campaign" size="sm" disabled={sim} className="hover:!bg-rose-50 hover:!text-rose-600" onClick={() => setDeleting(c)} />
                  <Button size="sm" variant="primary" icon={Send} loading={sim} disabled={!c.leadIds.length} onClick={() => setConfirmSim(c)} className="ml-1">
                    {sim ? 'Simulating…' : 'Simulate send'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card">
          <EmptyState icon={Megaphone} title="No campaigns yet" message="Target a segment of leads and generate personalised copy in seconds." action={<Button variant="primary" icon={Plus} onClick={() => setEditing('new')}>New campaign</Button>} />
        </div>
      )}

      {editing && <Editor initial={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!confirmSim}
        onClose={() => setConfirmSim(null)}
        tone="brand"
        confirmLabel="Run simulation"
        title={`Simulate “${confirmSim?.name}”?`}
        message={`This is a DEMO simulation for ${confirmSim?.leadIds.length} recipients. Each email is personalised and logged, but no real emails will be sent.`}
        onConfirm={() => simulate(confirmSim)}
      />
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} title={`Delete “${deleting?.name}”?`} message="The campaign draft will be removed. Logs from past simulations are kept." onConfirm={() => { actions.deleteCampaign(deleting.id); toast.success('Campaign deleted'); }} />
    </div>
  );
}
