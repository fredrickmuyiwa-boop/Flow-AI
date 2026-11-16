// Tiny, safe markdown renderer for Copilot replies (no HTML injection).
// Supports: ### headings, **bold**, _italic_, `code`, - bullets, 1. lists, ``` blocks.
import { Fragment } from 'react';

function inline(text, keyBase) {
  const parts = [];
  const re = /(\*\*[^*]+\*\*|_[^_]+_|`[^`]+`)/g;
  let last = 0;
  let m;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const tok = m[0];
    const k = `${keyBase}-${i++}`;
    if (tok.startsWith('**')) parts.push(<strong key={k} className="font-semibold text-ink-900">{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith('`')) parts.push(<code key={k} className="rounded bg-ink-100 px-1 py-0.5 font-mono text-[12px]">{tok.slice(1, -1)}</code>);
    else parts.push(<em key={k} className="text-ink-500">{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export default function Markdown({ text = '' }) {
  const lines = text.split('\n');
  const out = [];
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('```')) {
      const buf = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) buf.push(lines[i++]);
      i++;
      out.push(
        <pre key={key++} className="my-2 whitespace-pre-wrap rounded-xl border border-ink-200 bg-ink-50 p-3.5 font-sans text-[13px] leading-relaxed text-ink-800">
          {buf.join('\n')}
        </pre>,
      );
      continue;
    }
    if (/^\s*-\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*-\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*-\s+/, ''));
      out.push(
        <ul key={key++} className="my-1.5 space-y-1 pl-1">
          {items.map((it, j) => (
            <li key={j} className="flex gap-2">
              <span className="mt-2 size-1 shrink-0 rounded-full bg-brand-400" />
              <span>{inline(it, `${key}-${j}`)}</span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) items.push(lines[i++].replace(/^\d+\.\s+/, ''));
      out.push(
        <ol key={key++} className="my-1.5 space-y-1.5">
          {items.map((it, j) => (
            <li key={j} className="flex gap-2.5">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md bg-brand-50 text-[11px] font-bold text-brand-700">{j + 1}</span>
              <span>{inline(it, `${key}-${j}`)}</span>
            </li>
          ))}
        </ol>,
      );
      continue;
    }
    if (line.startsWith('### ')) {
      out.push(<p key={key++} className="mb-1 mt-2 first:mt-0 text-[15px] font-bold text-ink-900">{inline(line.slice(4), key)}</p>);
    } else if (line.trim() === '') {
      out.push(<div key={key++} className="h-2" />);
    } else {
      out.push(<p key={key++}>{inline(line, key)}</p>);
    }
    i++;
  }
  return <div className="text-sm leading-relaxed text-ink-700">{out.map((n, idx) => <Fragment key={idx}>{n}</Fragment>)}</div>;
}
