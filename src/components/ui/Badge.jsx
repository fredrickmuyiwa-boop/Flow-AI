import { cx } from '../../lib/utils';
import { LOG_STATUS_STYLES, PRIORITY_STYLES, STATUS_STYLES } from '../../data/constants';

export function Badge({ className, children, dot }) {
  return (
    <span className={cx('inline-flex h-fit shrink-0 items-center gap-1.5 self-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset whitespace-nowrap', className)}>
      {dot && <span className={cx('size-1.5 rounded-full', dot)} />}
      {children}
    </span>
  );
}

export const StatusBadge = ({ status }) => (
  <Badge className={STATUS_STYLES[status]?.badge} dot={STATUS_STYLES[status]?.dot}>
    {status}
  </Badge>
);

export const PriorityBadge = ({ priority }) => <Badge className={PRIORITY_STYLES[priority]}>{priority}</Badge>;

export const LogBadge = ({ status }) => {
  const s = LOG_STATUS_STYLES[status] || LOG_STATUS_STYLES.skipped;
  return (
    <Badge className={s.badge} dot={s.dot}>
      {s.label}
    </Badge>
  );
};

export const DemoBadge = ({ children = 'Demo' }) => (
  <Badge className="bg-amber-50 text-amber-800 ring-amber-200">{children}</Badge>
);

export function ScorePill({ score, size = 'md' }) {
  if (score == null) return <span className="text-xs text-ink-400">—</span>;
  const tone = score >= 75 ? 'text-emerald-700 bg-emerald-50 ring-emerald-200' : score >= 55 ? 'text-brand-700 bg-brand-50 ring-brand-200' : score >= 35 ? 'text-amber-700 bg-amber-50 ring-amber-200' : 'text-ink-600 bg-ink-100 ring-ink-200';
  return (
    <span className={cx('inline-flex items-center justify-center rounded-md font-bold tabular-nums ring-1 ring-inset', tone, size === 'lg' ? 'h-9 min-w-12 px-2 text-lg' : 'h-6 min-w-8 px-1.5 text-xs')}>
      {score}
    </span>
  );
}
