import { cx } from '../../lib/utils';

export function Field({ label, error, hint, children, className, required }) {
  return (
    <label className={cx('block', className)}>
      {label && (
        <span className="label">
          {label}
          {required && <span className="text-rose-500"> *</span>}
        </span>
      )}
      {children}
      {error ? <span className="mt-1 block text-xs font-medium text-rose-600">{error}</span> : hint ? <span className="mt-1 block text-xs text-ink-400">{hint}</span> : null}
    </label>
  );
}

export function Input({ error, className, ...rest }) {
  return <input className={cx('input', error && 'input-error', className)} aria-invalid={!!error} {...rest} />;
}

export function Textarea({ error, className, ...rest }) {
  return <textarea className={cx('input min-h-[84px] resize-y leading-relaxed', error && 'input-error', className)} aria-invalid={!!error} {...rest} />;
}

export function Select({ options, error, className, placeholder, labels, ...rest }) {
  return (
    <select className={cx('input pr-8', error && 'input-error', className)} aria-invalid={!!error} {...rest}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o} value={o}>
          {labels?.[o] ?? o}
        </option>
      ))}
    </select>
  );
}
