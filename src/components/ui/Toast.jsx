import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import { cx } from '../../lib/utils';

const ToastContext = createContext(null);
const ICONS = { success: CheckCircle2, error: XCircle, warning: AlertTriangle, info: Info };
const TONES = {
  success: 'text-emerald-600',
  error: 'text-rose-600',
  warning: 'text-amber-600',
  info: 'text-brand-600',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback(
    (type, title, message, opts = {}) => {
      const id = ++idRef.current;
      setToasts((t) => [...t.slice(-3), { id, type, title, message, action: opts.action }]);
      setTimeout(() => dismiss(id), opts.duration ?? 4200);
      return id;
    },
    [dismiss],
  );

  const api = useMemo(
    () => ({
      success: (t, m, o) => push('success', t, m, o),
      error: (t, m, o) => push('error', t, m, o),
      warning: (t, m, o) => push('warning', t, m, o),
      info: (t, m, o) => push('info', t, m, o),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 left-1/2 z-[70] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-col gap-2 sm:left-auto sm:right-4 sm:translate-x-0" aria-live="polite">
        {toasts.map((t) => {
          const Icon = ICONS[t.type];
          return (
            <div key={t.id} className="pointer-events-auto flex items-start gap-3 rounded-xl border border-ink-200 bg-white p-3.5 shadow-pop animate-slide-up">
              <Icon className={cx('mt-0.5 size-5 shrink-0', TONES[t.type])} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink-900">{t.title}</p>
                {t.message && <p className="mt-0.5 text-[13px] leading-snug text-ink-500">{t.message}</p>}
                {t.action && (
                  <button
                    className="mt-1.5 text-[13px] font-semibold text-brand-600 hover:text-brand-700"
                    onClick={() => {
                      t.action.onClick();
                      dismiss(t.id);
                    }}
                  >
                    {t.action.label} →
                  </button>
                )}
              </div>
              <button onClick={() => dismiss(t.id)} className="text-ink-300 hover:text-ink-600" aria-label="Dismiss">
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
