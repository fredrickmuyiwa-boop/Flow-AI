import { ChevronRight } from 'lucide-react';
import { ACTIONS, CONDITIONS, TRIGGERS, describeTrigger } from '../../engine/catalog';
import { blockIcon } from './blockIcons';

/** Compact horizontal rendering of trigger → conditions → actions. */
export default function FlowChips({ workflow }) {
  const TIcon = blockIcon(TRIGGERS[workflow.trigger.type]?.icon);
  const chip = 'inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11.5px] font-semibold whitespace-nowrap';
  const arrow = <ChevronRight className="size-3.5 shrink-0 text-ink-300" />;
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className={`${chip} bg-sky-50 text-sky-700 ring-1 ring-sky-100`}>
        <TIcon className="size-3.5" /> {describeTrigger(workflow.trigger)}
      </span>
      {workflow.conditions.map((c) => {
        const Icon = blockIcon(CONDITIONS[c.type]?.icon);
        return (
          <span key={c.id} className="contents">
            {arrow}
            <span className={`${chip} bg-amber-50 text-amber-800 ring-1 ring-amber-100`}>
              <Icon className="size-3.5" /> {CONDITIONS[c.type]?.describe(c.config || {})}
            </span>
          </span>
        );
      })}
      {workflow.actions.map((a) => {
        const Icon = blockIcon(ACTIONS[a.type]?.icon);
        return (
          <span key={a.id} className="contents">
            {arrow}
            <span className={`${chip} bg-brand-50 text-brand-700 ring-1 ring-brand-100`}>
              <Icon className="size-3.5" /> {ACTIONS[a.type]?.describe(a.config || {})}
            </span>
          </span>
        );
      })}
    </div>
  );
}
