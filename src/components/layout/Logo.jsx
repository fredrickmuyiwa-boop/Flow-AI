export default function Logo({ compact }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden="true">
        <defs>
          <linearGradient id="fp-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#6d5cf6" />
            <stop offset="1" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="9" fill="url(#fp-g)" />
        <path d="M9 21.5 15 10l3.2 6.2L20.5 13 24 21.5" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {!compact && (
        <div className="leading-none">
          <p className="text-[15px] font-extrabold tracking-tight text-ink-900">
            FlowPilot <span className="text-brand-600">AI</span>
          </p>
          <p className="mt-1 text-[10.5px] font-medium text-ink-400">Automate the busywork.</p>
        </div>
      )}
    </div>
  );
}
