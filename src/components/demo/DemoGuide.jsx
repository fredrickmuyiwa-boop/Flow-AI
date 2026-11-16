import { ArrowLeft, ArrowRight, CheckCircle2, ChevronUp, Minus, PlayCircle, RotateCcw, X } from 'lucide-react';
import { useDemo } from './DemoContext';
import { cx } from '../../lib/utils';
import { useRouter } from '../../lib/router';

export default function DemoGuide() {
  const demo = useDemo();
  const { navigate } = useRouter();
  if (!demo.active) return null;

  const { step, total, steps, busy } = demo;
  const done = step >= total;
  const cur = steps[step];
  const nextStep = steps[step + 1];
  const progress = Math.min(((step + 1) / total) * 100, 100);

  if (demo.minimised) {
    return (
      <button
        onClick={() => demo.setMinimised(false)}
        className="fixed bottom-4 right-4 z-[60] inline-flex items-center gap-2 rounded-full bg-ink-900 py-2.5 pl-3 pr-4 text-sm font-semibold text-white shadow-pop hover:bg-ink-800"
      >
        <PlayCircle className="size-4 text-brand-300" />
        Demo · {done ? 'Complete' : `Step ${step + 1}/${total}`}
        <ChevronUp className="size-4" />
      </button>
    );
  }

  return (
    <div className="fixed inset-x-3 bottom-3 z-[60] sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[380px] animate-slide-up" role="dialog" aria-label="Guided demo">
      <div className="overflow-hidden rounded-2xl border border-ink-800 bg-ink-900 text-white shadow-pop">
        <div className="h-1 bg-white/10">
          <div className="h-full bg-gradient-to-r from-brand-400 to-sky-400 transition-all duration-500" style={{ width: `${done ? 100 : progress}%` }} />
        </div>
        <div className="flex items-center justify-between px-4 pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-brand-200">
            Guided demo · {done ? 'Complete' : `Step ${step + 1} of ${total}`}
          </p>
          <div className="flex items-center gap-0.5">
            <button onClick={() => demo.setMinimised(true)} className="rounded-md p-1 text-white/50 hover:bg-white/10 hover:text-white" aria-label="Minimise demo">
              <Minus className="size-4" />
            </button>
            <button onClick={demo.exit} className="rounded-md p-1 text-white/50 hover:bg-white/10 hover:text-white" aria-label="Exit demo">
              <X className="size-4" />
            </button>
          </div>
        </div>

        {done ? (
          <div className="px-4 pb-4 pt-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-400" />
              <p className="text-base font-bold">That’s the full loop.</p>
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-white/70">
              Lead captured → qualified by AI → automated welcome email and follow-up → audited in logs → summarised by Copilot. Everything you saw is real application state and persists after refresh.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={demo.restart} className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/15">
                <RotateCcw className="size-3.5" /> Replay
              </button>
              <button
                onClick={() => {
                  demo.exit();
                  navigate('/automations/new');
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold hover:bg-brand-400"
              >
                Build your own workflow <ArrowRight className="size-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="px-4 pb-4 pt-2">
            <p className="text-base font-bold leading-snug">{cur.title}</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-white/70">{typeof cur.body === 'function' ? cur.body() : cur.body}</p>
            <ol className="mt-3 flex gap-1" aria-hidden="true">
              {steps.map((s, i) => (
                <li key={s.key} className={cx('h-1 flex-1 rounded-full', i < step ? 'bg-brand-400' : i === step ? 'bg-white' : 'bg-white/15')} />
              ))}
            </ol>
            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                onClick={demo.back}
                disabled={step === 0 || busy}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-semibold text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-30"
              >
                <ArrowLeft className="size-3.5" /> Back
              </button>
              <button
                onClick={demo.next}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-400 disabled:opacity-60"
              >
                {nextStep ? nextStep.cta : 'Finish demo'} <ArrowRight className="size-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
