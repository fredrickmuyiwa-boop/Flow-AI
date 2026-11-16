import { useState } from 'react';
import { Save, Download, RotateCcw, ShieldAlert, KeyRound, Plug, Check, Info, Database, Building2 } from 'lucide-react';
import { useStore } from '../store/AppStore';
import { useToast } from '../components/ui/Toast';
import { AI_MODE, AI_MODE_LABEL } from '../ai/provider';
import Button from '../components/ui/Button';
import { Field, Input } from '../components/ui/Field';
import { Badge } from '../components/ui/Badge';
import { PageHeader, SectionTitle } from '../components/ui/misc';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { cx } from '../lib/utils';
import { downloadFile, copyText } from '../lib/download';

const INTEGRATIONS = [
  { key: 'anthropic', name: 'Claude / Anthropic', mono: 'AI', color: 'from-[#d97757] to-[#c2613f]', desc: 'Power Copilot, qualification and email drafting with Claude via the secure /api/copilot backend.', needs: 'Server-side ANTHROPIC_API_KEY environment variable on Vercel, plus VITE_AI_MODE=claude. Keys are never placed in frontend code.' },
  { key: 'gohighlevel', name: 'GoHighLevel', mono: 'GH', color: 'from-[#1fb56f] to-[#0e8a52]', desc: 'Sync contacts, pipelines and opportunities with your GoHighLevel sub-account.', needs: 'A GoHighLevel Private Integration token or OAuth app with contacts.write and opportunities.write scopes.' },
  { key: 'zapier', name: 'Zapier', mono: 'Z', color: 'from-[#ff6a2b] to-[#e24d0f]', desc: 'Trigger Zaps from FlowPilot workflow events and push data into 6,000+ apps.', needs: 'A Zapier account and a Catch Hook URL, or a published FlowPilot Zapier app with API-key auth.' },
  { key: 'make', name: 'Make', mono: 'M', color: 'from-[#8b3dff] to-[#6a1fe0]', desc: 'Send workflow events to Make scenarios via webhooks for complex multi-step automations.', needs: 'A Make scenario with a Custom Webhook module and its webhook URL.' },
  { key: 'gmail', name: 'Gmail', mono: 'G', color: 'from-[#ea4335] to-[#c5221f]', desc: 'Send approved drafts and campaign emails from your Google Workspace mailbox.', needs: 'Google OAuth consent with the gmail.send scope, a verified Google Cloud project and a server to store refresh tokens securely.' },
  { key: 'sheets', name: 'Google Sheets', mono: 'S', color: 'from-[#34a853] to-[#188038]', desc: 'Mirror leads and execution logs to a spreadsheet for reporting.', needs: 'Google OAuth consent with the spreadsheets scope and a target spreadsheet ID.' },
  { key: 'supabase', name: 'Supabase', mono: 'SB', color: 'from-[#3ecf8e] to-[#249361]', desc: 'Replace LocalStorage with a shared Postgres database, auth and row-level security.', needs: 'A Supabase project URL and anon key, plus tables and RLS policies for leads, workflows and logs.' },
];

const STATE_META = {
  demo: { label: 'Connected (demo)', cls: 'bg-amber-50 text-amber-800 ring-amber-200', dot: 'bg-amber-500' },
  none: { label: 'Not connected', cls: 'bg-ink-100 text-ink-600 ring-ink-200', dot: 'bg-ink-400' },
  available: { label: 'Available for integration', cls: 'bg-brand-50 text-brand-700 ring-brand-200', dot: 'bg-brand-500' },
};

export default function Settings() {
  const { state, actions } = useStore();
  const toast = useToast();
  const [form, setForm] = useState(state.settings);
  const [errors, setErrors] = useState({});
  const [setup, setSetup] = useState(null);
  const [resetting, setResetting] = useState(false);

  const save = (e) => {
    e.preventDefault();
    const er = {};
    if (!form.businessName?.trim()) er.businessName = 'Business name is required.';
    if (!form.senderName?.trim()) er.senderName = 'Sender name is required.';
    setErrors(er);
    if (Object.keys(er).length) return;
    actions.updateSettings({ ...form, businessName: form.businessName.trim(), senderName: form.senderName.trim() });
    toast.success('Settings saved', 'New emails and drafts will use these details.');
  };

  const exportData = () => {
    const json = JSON.stringify(actions.getState(), null, 2);
    const name = `flowpilot-workspace-${new Date().toISOString().slice(0, 10)}.json`;
    downloadFile(name, json, 'application/json');
    toast.success('Workspace export started', `${name}. If your browser blocked the download, copy the JSON instead.`, {
      duration: 8000,
      action: { label: 'Copy JSON', onClick: async () => ((await copyText(json)) ? toast.success('JSON copied to clipboard') : toast.error('Clipboard unavailable', 'Your browser blocked clipboard access.')) },
    });
  };

  const integ = INTEGRATIONS.find((i) => i.key === setup);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Workspace" title="Settings & Integrations" description="Configure your workspace, manage integrations and control demo data." />

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <form onSubmit={save} className="card p-5" noValidate>
          <SectionTitle><span className="flex items-center gap-2"><Building2 className="size-4 text-brand-500" /> Workspace & sender</span></SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Business name" required error={errors.businessName}>
              <Input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} error={errors.businessName} />
            </Field>
            <Field label="What you sell" hint="Used to frame AI-generated copy">
              <Input value={form.offer} onChange={(e) => setForm({ ...form, offer: e.target.value })} />
            </Field>
            <Field label="Sender name" required error={errors.senderName}>
              <Input value={form.senderName} onChange={(e) => setForm({ ...form, senderName: e.target.value })} error={errors.senderName} />
            </Field>
            <Field label="Sender role">
              <Input value={form.senderRole} onChange={(e) => setForm({ ...form, senderRole: e.target.value })} />
            </Field>
          </div>
          <div className="mt-4 flex justify-end">
            <Button type="submit" variant="primary" icon={Save}>Save settings</Button>
          </div>
        </form>

        <div className="card p-5">
          <SectionTitle><span className="flex items-center gap-2"><Database className="size-4 text-brand-500" /> Demo data</span></SectionTitle>
          <p className="text-[13px] leading-relaxed text-ink-600">All data is stored in this browser’s LocalStorage and survives refreshes. Nothing is sent to a server.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button icon={Download} onClick={exportData}>Export JSON</Button>
            <Button variant="danger" icon={RotateCcw} onClick={() => setResetting(true)}>Reset demo data</Button>
          </div>
          <div className="mt-4 rounded-xl bg-ink-50 p-3 text-xs text-ink-500">
            AI mode: <b className="text-ink-800">{AI_MODE_LABEL}</b>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-[13px] text-sky-900">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          <p>
            <strong>Integration boundaries.</strong> External integrations require real credentials and user authorisation (API keys, OAuth consent, webhooks). In this demo, <em>no external service is connected</em>. “Connected (demo)” only marks an integration as configured inside FlowPilot so you can explore the flow — it does not transmit any data.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {INTEGRATIONS.map((i) => {
            const st = i.key === 'anthropic' && AI_MODE === 'claude' ? 'demo' : state.integrations[i.key] || 'available';
            const meta = STATE_META[st];
            return (
              <div key={i.key} className="card flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={cx('grid size-10 place-items-center rounded-xl bg-gradient-to-br text-sm font-extrabold text-white shadow-sm', i.color)}>{i.mono}</span>
                    <p className="text-[15px] font-bold text-ink-900">{i.name}</p>
                  </div>
                  <Badge className={meta.cls} dot={meta.dot}>{i.key === 'anthropic' && AI_MODE === 'claude' ? 'Backend configured' : meta.label}</Badge>
                </div>
                <p className="mt-3 text-[13px] leading-snug text-ink-600">{i.desc}</p>
                <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                  <button onClick={() => setSetup(i.key)} className="inline-flex items-center gap-1 text-xs font-semibold text-ink-500 hover:text-ink-900">
                    <KeyRound className="size-3.5" /> Requirements
                  </button>
                  {st === 'demo' ? (
                    <Button size="sm" onClick={() => { actions.setIntegration(i.key, 'available'); toast.success(`${i.name} disconnected`); }} disabled={i.key === 'anthropic' && AI_MODE === 'claude'}>Disconnect</Button>
                  ) : (
                    <Button size="sm" variant="primary" icon={Plug} onClick={() => setSetup(i.key)}>Connect</Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal
        open={!!integ}
        onClose={() => setSetup(null)}
        title={`Connect ${integ?.name || ''}`}
        description="What a production connection requires"
        footer={
          integ && (
            <>
              <Button onClick={() => setSetup(null)}>Close</Button>
              {(state.integrations[integ.key] || 'available') !== 'demo' && (
                <Button
                  variant="primary"
                  icon={Check}
                  onClick={() => {
                    actions.setIntegration(integ.key, 'demo');
                    setSetup(null);
                    toast.success(`${integ.name} marked as connected (demo)`, 'No credentials were used and no data is transmitted.');
                  }}
                >
                  Mark connected (demo)
                </Button>
              )}
            </>
          )
        }
      >
        {integ && (
          <div className="space-y-3 text-[13px] leading-relaxed text-ink-700">
            <p>{integ.desc}</p>
            <div className="rounded-xl border border-ink-200 bg-ink-50 p-3">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-bold text-ink-800"><KeyRound className="size-3.5" /> Required for a real connection</p>
              <p>{integ.needs}</p>
            </div>
            {integ.key === 'anthropic' && (
              <pre className="overflow-x-auto rounded-xl bg-ink-950 p-3 font-mono text-[11.5px] leading-relaxed text-emerald-200">{`# Vercel → Project → Settings → Environment Variables
ANTHROPIC_API_KEY=sk-ant-…        # server-only, read by /api/copilot.js
ANTHROPIC_MODEL=claude-sonnet-5-5 # optional
VITE_AI_MODE=claude               # tells the UI to use the backend`}</pre>
            )}
            <p className="flex items-start gap-1.5 text-xs text-ink-500"><Info className="mt-0.5 size-3.5 shrink-0" /> “Mark connected (demo)” only changes the label inside this demo workspace. It does not authenticate with {integ.name} or send any data.</p>
          </div>
        )}
      </Modal>
      <ConfirmDialog
        open={resetting}
        onClose={() => setResetting(false)}
        title="Reset all demo data?"
        message="This restores the original sample leads, workflows, logs and campaigns. Anything you added will be lost."
        confirmLabel="Reset data"
        onConfirm={() => {
          actions.resetDemo();
          setForm(actions.getState().settings);
          toast.success('Demo data reset', 'The workspace is back to its original sample state.');
        }}
      />
    </div>
  );
}
