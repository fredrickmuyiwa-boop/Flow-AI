import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Pencil, Trash2, Users, FilterX, ChevronRight, Download } from 'lucide-react';
import { useStore } from '../store/AppStore';
import { useRouter } from '../lib/router';
import { useUI } from '../store/UIContext';
import { useToast } from '../components/ui/Toast';
import { LEAD_SOURCES, LEAD_STATUSES, PRIORITIES, STATUS_STYLES } from '../data/constants';
import { getLeadScore } from '../logic/qualification';
import { cx, formatDate, timeAgo, currency } from '../lib/utils';
import { downloadFile, copyText } from '../lib/download';
import Button, { IconButton } from '../components/ui/Button';
import { Select } from '../components/ui/Field';
import { PriorityBadge, ScorePill, StatusBadge } from '../components/ui/Badge';
import { Avatar, EmptyState, PageHeader } from '../components/ui/misc';
import { ConfirmDialog } from '../components/ui/Modal';
import LeadForm from '../components/leads/LeadForm';

const SORTS = { newest: 'Newest first', oldest: 'Oldest first', score: 'Highest score', value: 'Highest value', name: 'Name A–Z', idle: 'Longest without contact' };

export default function Leads() {
  const { state, actions } = useStore();
  const { navigate, query } = useRouter();
  const ui = useUI();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState(query.status && LEAD_STATUSES.includes(query.status) ? query.status : 'All');
  const [source, setSource] = useState('All');
  const [priority, setPriority] = useState('All');
  const [sort, setSort] = useState('newest');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    if (query.status && LEAD_STATUSES.includes(query.status)) setStatus(query.status);
  }, [query.status]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = state.leads.filter(
      (l) =>
        (status === 'All' || l.status === status) &&
        (source === 'All' || l.source === source) &&
        (priority === 'All' || l.priority === priority) &&
        (!term || `${l.name} ${l.email} ${l.company} ${l.phone} ${l.jobTitle}`.toLowerCase().includes(term)),
    );
    const by = {
      newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      oldest: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      score: (a, b) => getLeadScore(b) - getLeadScore(a),
      value: (a, b) => (Number(b.dealValue) || 0) - (Number(a.dealValue) || 0),
      name: (a, b) => a.name.localeCompare(b.name),
      idle: (a, b) => new Date(a.lastContactedAt || a.createdAt) - new Date(b.lastContactedAt || b.createdAt),
    }[sort];
    return [...list].sort(by);
  }, [state.leads, q, status, source, priority, sort]);

  const filtered = q || status !== 'All' || source !== 'All' || priority !== 'All';
  const clear = () => {
    setQ('');
    setStatus('All');
    setSource('All');
    setPriority('All');
    if (query.status) navigate('/leads');
  };

  const changeStatus = (lead, to) => {
    const { logs } = actions.updateLead(lead.id, { status: to });
    toast.success('Status updated', `${lead.name} → ${to}`);
    if (logs.length) setTimeout(() => ui.notifyRuns(logs), 300);
  };

  const exportCsv = () => {
    const cols = ['name', 'email', 'company', 'phone', 'jobTitle', 'source', 'status', 'priority', 'dealValue', 'createdAt'];
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
    const name = `flowpilot-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadFile(name, csv, 'text/csv');
    toast.success('CSV export started', `${rows.length} leads → ${name}. If your browser blocked the download, copy the CSV instead.`, {
      duration: 8000,
      action: { label: 'Copy CSV', onClick: async () => ((await copyText(csv)) ? toast.success('CSV copied to clipboard') : toast.error('Clipboard unavailable', 'Your browser blocked clipboard access.')) },
    });
  };

  const counts = Object.fromEntries(LEAD_STATUSES.map((s) => [s, state.leads.filter((l) => l.status === s).length]));

  return (
    <div>
      <PageHeader
        eyebrow="CRM"
        title="Contacts & Leads"
        description="Every prospect, their stage and fit — with AI qualification and automation built in."
        actions={
          <>
            <Button icon={Download} onClick={exportCsv} disabled={!rows.length}>Export CSV</Button>
            <Button variant="primary" icon={Plus} onClick={ui.openLeadForm}>Add lead</Button>
          </>
        }
      />

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {['All', ...LEAD_STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={cx(
              'flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition',
              status === s ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300',
            )}
          >
            {s !== 'All' && <span className={cx('size-2 rounded-full', STATUS_STYLES[s].dot)} />}
            {s}
            <span className={cx('tabular-nums text-xs', status === s ? 'text-white/60' : 'text-ink-400')}>{s === 'All' ? state.leads.length : counts[s]}</span>
          </button>
        ))}
      </div>

      <div className="card">
        <div className="flex flex-col gap-2 border-b border-ink-100 p-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, company, phone…" className="input pl-9" aria-label="Search leads" />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex [&>select:last-child]:col-span-2">
            <Select aria-label="Filter by source" options={['All', ...LEAD_SOURCES]} labels={{ All: 'All sources' }} value={source} onChange={(e) => setSource(e.target.value)} className="sm:w-36" />
            <Select aria-label="Filter by priority" options={['All', ...PRIORITIES]} labels={{ All: 'All priorities' }} value={priority} onChange={(e) => setPriority(e.target.value)} className="sm:w-36" />
            <Select aria-label="Sort leads" options={Object.keys(SORTS)} labels={SORTS} value={sort} onChange={(e) => setSort(e.target.value)} className="sm:w-48" />
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-2.5 text-xs text-ink-500">
          <span>
            Showing <span className="font-semibold text-ink-800">{rows.length}</span> of {state.leads.length} leads
          </span>
          {filtered && (
            <button onClick={clear} className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:text-brand-700">
              <FilterX className="size-3.5" /> Clear filters
            </button>
          )}
        </div>

        {!rows.length ? (
          state.leads.length ? (
            <EmptyState icon={FilterX} title="No leads match these filters" message="Try a different search term or clear the filters." action={<Button onClick={clear}>Clear filters</Button>} />
          ) : (
            <EmptyState icon={Users} title="Your CRM is empty" message="Add your first lead — active workflows will run automatically." action={<Button variant="primary" icon={Plus} onClick={ui.openLeadForm}>Add lead</Button>} />
          )
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-y border-ink-100 bg-ink-50/70 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                    <th className="px-4 py-2.5">Lead</th>
                    <th className="px-3 py-2.5">Company</th>
                    <th className="px-3 py-2.5">Source</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Priority</th>
                    <th className="px-3 py-2.5 text-center">Score</th>
                    <th className="px-3 py-2.5">Added</th>
                    <th className="px-3 py-2.5"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {rows.map((l) => (
                    <tr key={l.id} className="group cursor-pointer hover:bg-brand-50/30" onClick={() => navigate(`/leads/${l.id}`)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={l.name} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-ink-900">{l.name}</p>
                            <p className="truncate text-xs text-ink-500">{l.email || l.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <p className="truncate font-medium text-ink-800">{l.company || <span className="text-ink-400">—</span>}</p>
                        <p className="truncate text-xs text-ink-400">{l.dealValue ? currency(l.dealValue) : l.industry || ''}</p>
                      </td>
                      <td className="px-3 py-3 text-ink-600">{l.source}</td>
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <select
                          aria-label={`Change status for ${l.name}`}
                          value={l.status}
                          onChange={(e) => changeStatus(l, e.target.value)}
                          className={cx('cursor-pointer rounded-full border-0 py-0.5 pl-2 pr-6 text-[11px] font-semibold ring-1 ring-inset focus:ring-2 focus:ring-brand-300', STATUS_STYLES[l.status].badge)}
                        >
                          {LEAD_STATUSES.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-3"><PriorityBadge priority={l.priority} /></td>
                      <td className="px-3 py-3 text-center">
                        <span title={l.qualification ? 'AI-qualified score' : 'Estimated — not yet qualified'} className={l.qualification ? '' : 'opacity-60'}>
                          <ScorePill score={getLeadScore(l)} />
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-ink-500 whitespace-nowrap">
                        {formatDate(l.createdAt)}
                        <span className="block text-ink-400">Contacted {timeAgo(l.lastContactedAt)}</span>
                      </td>
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-0.5 opacity-60 transition group-hover:opacity-100">
                          <IconButton icon={Pencil} label={`Edit ${l.name}`} size="sm" onClick={() => setEditing(l)} />
                          <IconButton icon={Trash2} label={`Delete ${l.name}`} size="sm" className="hover:!bg-rose-50 hover:!text-rose-600" onClick={() => setDeleting(l)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-ink-100 md:hidden">
              {rows.map((l) => (
                <li key={l.id}>
                  <button className="flex w-full items-center gap-3 px-4 py-3 text-left" onClick={() => navigate(`/leads/${l.id}`)}>
                    <Avatar name={l.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ink-900">{l.name}</span>
                      <span className="block truncate text-xs text-ink-500">{l.company || l.email}</span>
                      <span className="mt-1.5 flex flex-wrap gap-1.5">
                        <StatusBadge status={l.status} />
                        <PriorityBadge priority={l.priority} />
                      </span>
                    </span>
                    <ScorePill score={getLeadScore(l)} />
                    <ChevronRight className="size-4 text-ink-300" />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <LeadForm
        open={!!editing}
        initial={editing}
        title={`Edit ${editing?.name || 'lead'}`}
        submitLabel="Save changes"
        onClose={() => setEditing(null)}
        onSubmit={(v) => {
          const { note, ...patch } = v;
          const { logs } = actions.updateLead(editing.id, { ...patch, dealValue: v.dealValue ? Number(v.dealValue) : 0 });
          toast.success('Lead updated', `${v.name}'s details were saved.`);
          setEditing(null);
          if (logs.length) setTimeout(() => ui.notifyRuns(logs), 300);
        }}
      />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title={`Delete ${deleting?.name}?`}
        message="This removes the lead along with their tasks and drafted messages. Automation logs are kept for audit purposes."
        onConfirm={() => {
          actions.deleteLead(deleting.id);
          toast.success('Lead deleted', `${deleting.name} was removed from the CRM.`);
        }}
      />
    </div>
  );
}
