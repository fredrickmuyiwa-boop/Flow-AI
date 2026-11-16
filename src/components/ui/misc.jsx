import { Loader2 } from 'lucide-react';
import { cx, initials } from '../../lib/utils';

export function Spinner({ className }) {
  return <Loader2 className={cx('size-4 animate-spin text-brand-500', className)} />;
}

export function EmptyState({ icon: Icon, title, message, action, className }) {
  return (
    <div className={cx('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      {Icon && (
        <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
          <Icon className="size-5" />
        </div>
      )}
      <p className="text-sm font-semibold text-ink-900">{title}</p>
      {message && <p className="mt-1 max-w-sm text-sm text-ink-500">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

const AVATAR_TONES = ['bg-violet-100 text-violet-700', 'bg-sky-100 text-sky-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-800', 'bg-rose-100 text-rose-700', 'bg-indigo-100 text-indigo-700'];

export function Avatar({ name, size = 'md', className }) {
  const tone = AVATAR_TONES[[...(name || '')].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_TONES.length];
  const dims = { sm: 'size-7 text-[11px]', md: 'size-9 text-xs', lg: 'size-14 text-lg' }[size];
  return <span className={cx('grid shrink-0 place-items-center rounded-full font-bold', tone, dims, className)}>{initials(name)}</span>;
}

export function PageHeader({ title, description, actions, eyebrow }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-ink-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Toggle({ checked, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx('relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors', checked ? 'bg-brand-600' : 'bg-ink-200', disabled && 'opacity-50')}
    >
      <span className={cx('inline-block size-4 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[18px]' : 'translate-x-0.5')} />
    </button>
  );
}

export function SectionTitle({ children, action, className }) {
  return (
    <div className={cx('mb-3 flex items-center justify-between gap-3', className)}>
      <h3 className="text-sm font-bold text-ink-900">{children}</h3>
      {action}
    </div>
  );
}
