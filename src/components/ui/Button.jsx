import { Loader2 } from 'lucide-react';
import { cx } from '../../lib/utils';

const VARIANTS = {
  primary:
    'bg-brand-600 text-white shadow-sm shadow-brand-600/20 hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-300',
  secondary: 'bg-white text-ink-800 border border-ink-200 shadow-card hover:bg-ink-50 hover:border-ink-300 disabled:text-ink-400',
  ghost: 'text-ink-600 hover:bg-ink-100 hover:text-ink-900 disabled:text-ink-300',
  danger: 'bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 disabled:opacity-50',
  dark: 'bg-ink-900 text-white hover:bg-ink-800 disabled:bg-ink-400',
  soft: 'bg-brand-50 text-brand-700 hover:bg-brand-100 disabled:opacity-50',
};
const SIZES = {
  xs: 'h-7 px-2.5 text-xs gap-1.5 rounded-md',
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-9 px-3.5 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-5 text-sm gap-2 rounded-xl',
};

export default function Button({ variant = 'secondary', size = 'md', icon: Icon, iconRight: IconRight, loading, className, children, ...rest }) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex items-center justify-center font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : Icon ? <Icon className={size === 'xs' ? 'size-3.5' : 'size-4'} /> : null}
      {children}
      {IconRight && <IconRight className="size-4" />}
    </button>
  );
}

export function IconButton({ icon: Icon, label, className, size = 'md', ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex items-center justify-center rounded-lg text-ink-500 transition hover:bg-ink-100 hover:text-ink-900 disabled:opacity-40',
        size === 'sm' ? 'size-7' : 'size-9',
        className,
      )}
      {...rest}
    >
      <Icon className="size-4" />
    </button>
  );
}
