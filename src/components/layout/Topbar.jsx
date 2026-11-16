import { useEffect, useRef, useState } from 'react';
import { Menu, PlayCircle, Search, Plus, Cpu } from 'lucide-react';
import { useRouter } from '../../lib/router';
import { useStore } from '../../store/AppStore';
import { AI_MODE_LABEL } from '../../ai/provider';
import { Avatar } from '../ui/misc';
import { StatusBadge } from '../ui/Badge';
import Button from '../ui/Button';
import Logo from './Logo';

export default function Topbar({ onMenu, onRunDemo, onAddLead, demoActive }) {
  const { navigate } = useRouter();
  const { state } = useStore();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => boxRef.current && !boxRef.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const results = q.trim()
    ? state.leads
        .filter((l) => `${l.name} ${l.company} ${l.email}`.toLowerCase().includes(q.trim().toLowerCase()))
        .slice(0, 6)
    : [];

  return (
    <header className="sticky top-0 z-30 border-b border-ink-200/70 bg-white/85 backdrop-blur-md">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <button className="rounded-lg p-2 text-ink-500 hover:bg-ink-100 lg:hidden" onClick={onMenu} aria-label="Open menu">
          <Menu className="size-5" />
        </button>
        <div className="lg:hidden">
          <Logo compact />
        </div>

        <div className="relative hidden max-w-md flex-1 md:block" ref={boxRef}>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && results[0]) {
                navigate(`/leads/${results[0].id}`);
                setQ('');
                setOpen(false);
              }
            }}
            placeholder="Search leads, companies, emails…"
            className="input h-9 rounded-xl bg-ink-50 pl-9"
            aria-label="Search leads"
          />
          {open && q.trim() && (
            <div className="absolute left-0 right-0 top-11 overflow-hidden rounded-xl border border-ink-200 bg-white shadow-pop">
              {results.length ? (
                results.map((l) => (
                  <button
                    key={l.id}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-ink-50"
                    onClick={() => {
                      navigate(`/leads/${l.id}`);
                      setQ('');
                      setOpen(false);
                    }}
                  >
                    <Avatar name={l.name} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink-900">{l.name}</span>
                      <span className="block truncate text-xs text-ink-500">{l.company || l.email}</span>
                    </span>
                    <StatusBadge status={l.status} />
                  </button>
                ))
              ) : (
                <p className="px-3 py-3 text-sm text-ink-500">No leads match “{q}”.</p>
              )}
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-ink-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-ink-600 xl:inline-flex" title="Copilot and qualification run on deterministic local logic. See Settings → Integrations.">
            <Cpu className="size-3.5 text-brand-500" /> {AI_MODE_LABEL}
          </span>
          <Button size="sm" variant="secondary" icon={Plus} onClick={onAddLead} className="hidden sm:inline-flex">
            Add lead
          </Button>
          <Button size="sm" variant="primary" icon={PlayCircle} onClick={onRunDemo} className={demoActive ? 'ring-2 ring-brand-300' : ''}>
            {demoActive ? 'Demo running' : 'Run Demo'}
          </Button>
          <Avatar name={state.settings.senderName} size="sm" className="ml-1 hidden sm:grid" />
        </div>
      </div>
    </header>
  );
}
