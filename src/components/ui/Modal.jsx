import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cx } from '../../lib/utils';

function useEscape(open, onClose) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
}

export function Modal({ open, onClose, title, description, children, footer, size = 'md' }) {
  useEscape(open, onClose);
  if (!open) return null;
  const width = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink-950/40 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div className={cx('relative w-full bg-white sm:rounded-2xl rounded-t-2xl shadow-pop animate-slide-up flex flex-col max-h-[92vh]', width)}>
        <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
          <div>
            <h2 className="text-base font-bold text-ink-900">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-ink-500">{description}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-800" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-5 scrollbar-thin">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-ink-100 px-5 py-3.5 bg-ink-50/60 sm:rounded-b-2xl">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, title, subtitle, children, footer, width = 'max-w-lg' }) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink-950/30 animate-fade-in" onClick={onClose} />
      <aside className={cx('absolute right-0 top-0 h-full w-full bg-white shadow-pop flex flex-col animate-slide-in-right', width)}>
        <div className="flex items-start justify-between gap-3 border-b border-ink-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-ink-900">{title}</h2>
            {subtitle && <div className="mt-0.5 text-sm text-ink-500">{subtitle}</div>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-800" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-ink-100 px-5 py-3.5">{footer}</div>}
      </aside>
    </div>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Delete', tone = 'danger' }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button className="h-9 rounded-lg border border-ink-200 bg-white px-3.5 text-sm font-semibold text-ink-700 hover:bg-ink-50" onClick={onClose}>
            Cancel
          </button>
          <button
            className={cx('h-9 rounded-lg px-3.5 text-sm font-semibold text-white', tone === 'danger' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-brand-600 hover:bg-brand-700')}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-ink-600">{message}</p>
    </Modal>
  );
}
