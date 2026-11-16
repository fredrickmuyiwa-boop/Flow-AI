import { LayoutDashboard, Users, Workflow, Sparkles, Megaphone, ScrollText, Settings, PlayCircle, X } from 'lucide-react';
import { useRouter } from '../../lib/router';
import { useStore } from '../../store/AppStore';
import { cx } from '../../lib/utils';
import Logo from './Logo';

export const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/leads', label: 'Contacts & Leads', icon: Users },
  { to: '/automations', label: 'Automation Studio', icon: Workflow },
  { to: '/assistant', label: 'AI Assistant', icon: Sparkles },
  { to: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { to: '/logs', label: 'Activity Logs', icon: ScrollText },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function isActive(path, to) {
  return to === '/' ? path === '/' : path === to || path.startsWith(`${to}/`);
}

export default function Sidebar({ open, onClose, onRunDemo }) {
  const { path, navigate } = useRouter();
  const { state } = useStore();
  const counts = {
    '/leads': state.leads.length,
    '/automations': state.workflows.filter((w) => w.active).length,
    '/logs': state.logs.filter((l) => l.status === 'failed').length || null,
  };

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-ink-950/30 lg:hidden animate-fade-in" onClick={onClose} />}
      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-ink-200/80 bg-white transition-transform lg:translate-x-0',
          open ? 'translate-x-0 shadow-pop' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Logo />
          <button className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 lg:hidden" onClick={onClose} aria-label="Close menu">
            <X className="size-4" />
          </button>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2" aria-label="Main">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = isActive(path, to);
            return (
              <button
                key={to}
                onClick={() => {
                  navigate(to);
                  onClose();
                }}
                className={cx(
                  'group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-semibold transition',
                  active ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className={cx('size-[18px]', active ? 'text-brand-600' : 'text-ink-400 group-hover:text-ink-600')} />
                <span className="flex-1 text-left">{label}</span>
                {counts[to] != null && (
                  <span className={cx('rounded-md px-1.5 text-[11px] font-bold tabular-nums', to === '/logs' ? 'bg-rose-50 text-rose-600' : active ? 'bg-brand-100 text-brand-700' : 'bg-ink-100 text-ink-500')}>
                    {counts[to]}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="m-3 rounded-xl border border-brand-100 bg-gradient-to-br from-brand-50 to-sky-50 p-4">
          <p className="text-[13px] font-bold text-ink-900">Guided demo</p>
          <p className="mt-0.5 text-xs leading-snug text-ink-500">See lead capture → AI qualification → automation in about 2 minutes.</p>
          <button
            onClick={() => {
              onClose();
              onRunDemo();
            }}
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-ink-900 py-2 text-xs font-semibold text-white hover:bg-ink-800"
          >
            <PlayCircle className="size-4" /> Run Demo
          </button>
        </div>
        <div className="border-t border-ink-100 px-5 py-3 text-[11px] text-ink-400">
          {state.settings.businessName} · Demo workspace
        </div>
      </aside>
    </>
  );
}
