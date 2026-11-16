import { useEffect, useRef, useState } from 'react';
import { Sparkles, Send, Trash2, Bot, ArrowRight, Save, Cpu, Database, ShieldCheck, Users, Workflow, ListTodo } from 'lucide-react';
import { useStore } from '../store/AppStore';
import { useRouter } from '../lib/router';
import { useToast } from '../components/ui/Toast';
import { useDemoSignal } from '../components/demo/DemoContext';
import { askCopilot, AI_MODE, AI_MODE_LABEL } from '../ai/provider';
import { SUGGESTED_PROMPTS } from '../ai/copilot';
import { computeStats } from '../logic/metrics';
import { cx, timeAgo } from '../lib/utils';
import Button from '../components/ui/Button';
import Markdown from '../components/ui/Markdown';
import { Avatar } from '../components/ui/misc';

let lastAuto = { q: null, at: 0 }; // de-dupe ?q= auto-asks across StrictMode double effects

export default function Copilot() {
  const { state, actions } = useStore();
  const { query, navigate } = useRouter();
  const toast = useToast();
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const stats = computeStats(state);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [state.chat.length, thinking]);

  const ask = async (text) => {
    const q = text.trim();
    if (!q || thinking) return;
    setInput('');
    actions.addChat({ role: 'user', text: q });
    setThinking(true);
    try {
      const res = await askCopilot(q, actions.getState(), actions.getState().chat);
      actions.addChat({ role: 'assistant', text: res.text, actions: res.actions || [], source: res.source, notice: res.notice });
    } catch (e) {
      actions.addChat({ role: 'assistant', text: `Sorry — something went wrong: ${e.message}`, error: true });
    } finally {
      setThinking(false);
      inputRef.current?.focus();
    }
  };

  useEffect(() => {
    if (query.q && !(lastAuto.q === query.q && Date.now() - lastAuto.at < 1500)) {
      lastAuto = { q: query.q, at: Date.now() };
      ask(query.q);
      navigate('/assistant');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.q]);

  useDemoSignal('ask', (p) => ask(p.text));

  const runAction = (a) => {
    if (a.kind === 'navigate') navigate(a.to);
    if (a.kind === 'save_draft') {
      actions.saveMessage({ leadId: a.leadId, kind: a.template, subject: a.subject, body: a.body });
      toast.success('Draft saved to CRM', 'Find it on the lead’s Emails tab. Nothing was sent.', { action: { label: 'Open lead', onClick: () => navigate(`/leads/${a.leadId}?tab=messages`) } });
    }
  };

  const empty = state.chat.length === 0;

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
      <div className="card flex h-[calc(100vh-9rem)] min-h-[520px] flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-sky-500 text-white shadow-sm"><Sparkles className="size-4" /></span>
            <div>
              <h1 className="text-[15px] font-bold text-ink-900">FlowPilot Copilot</h1>
              <p className="flex items-center gap-1 text-[11px] text-ink-500"><Cpu className="size-3" /> {AI_MODE_LABEL} · reads your live CRM data</p>
            </div>
          </div>
          {!empty && (
            <Button size="sm" variant="ghost" icon={Trash2} onClick={() => { actions.clearChat(); toast.success('Conversation cleared'); }}>Clear</Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 scrollbar-thin">
          {empty ? (
            <div className="mx-auto max-w-2xl py-6 text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-sky-500 text-white shadow-lift"><Bot className="size-6" /></span>
              <h2 className="mt-4 text-xl font-bold text-ink-900">How can I help you grow today?</h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-ink-500">I analyse your {stats.total} leads, {stats.totalWorkflows} workflows and activity history to give specific, actionable answers.</p>
              <div className="mt-6 grid gap-2 text-left sm:grid-cols-2">
                {SUGGESTED_PROMPTS.map((p) => (
                  <button key={p} onClick={() => ask(p)} className="group flex items-center justify-between gap-2 rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm font-semibold text-ink-800 transition hover:border-brand-300 hover:bg-brand-50/50">
                    {p}
                    <ArrowRight className="size-4 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-5">
              {state.chat.map((m) =>
                m.role === 'user' ? (
                  <div key={m.id} className="flex justify-end gap-2.5">
                    <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-ink-900 px-4 py-2.5 text-sm text-white">{m.text}</div>
                    <Avatar name={state.settings.senderName} size="sm" className="hidden sm:grid" />
                  </div>
                ) : (
                  <div key={m.id} className="flex gap-2.5">
                    <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-sky-500 text-white"><Sparkles className="size-3.5" /></span>
                    <div className="min-w-0 max-w-[92%]">
                      <div className={cx('rounded-2xl rounded-tl-md border px-4 py-3', m.error ? 'border-rose-200 bg-rose-50' : 'border-ink-200 bg-white')}>
                        <Markdown text={m.text} />
                        {m.notice && <p className="mt-2 text-[11px] text-amber-700">{m.notice}</p>}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {(m.actions || []).map((a, i) => (
                          <button key={i} onClick={() => runAction(a)} className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100">
                            {a.kind === 'save_draft' ? <Save className="size-3" /> : <ArrowRight className="size-3" />} {a.label}
                          </button>
                        ))}
                        <span className="text-[11px] text-ink-400">{m.source === 'claude' ? 'Claude' : 'Local intelligence'} · {timeAgo(m.at)}</span>
                      </div>
                    </div>
                  </div>
                ),
              )}
              {thinking && (
                <div className="flex gap-2.5" aria-live="polite">
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-sky-500 text-white"><Sparkles className="size-3.5" /></span>
                  <div className="flex items-center gap-2 rounded-2xl rounded-tl-md border border-ink-200 bg-white px-4 py-3 text-sm text-ink-500">
                    <span className="flex gap-1">
                      {[0, 1, 2].map((i) => <span key={i} className="size-1.5 animate-bounce rounded-full bg-brand-400" style={{ animationDelay: `${i * 0.15}s` }} />)}
                    </span>
                    Analysing CRM data…
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
          )}
        </div>

        <div className="border-t border-ink-100 p-3 sm:p-4">
          {!empty && (
            <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {SUGGESTED_PROMPTS.map((p) => (
                <button key={p} onClick={() => ask(p)} disabled={thinking} className="shrink-0 rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-semibold text-ink-600 hover:border-brand-300 hover:text-brand-700 disabled:opacity-50">
                  {p}
                </button>
              ))}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!input.trim()) return toast.warning('Type a question first');
              ask(input);
            }}
            className="flex items-end gap-2"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (input.trim()) ask(input);
                }
              }}
              rows={1}
              maxLength={2000}
              placeholder="Ask about your leads, pipeline or workflows… e.g. “Summarise Amaka Eze”"
              className="input max-h-32 min-h-[42px] flex-1 resize-none py-2.5"
              aria-label="Message Copilot"
            />
            <Button type="submit" variant="primary" icon={Send} loading={thinking} className="h-[42px]" aria-label="Send">
              <span className="hidden sm:inline">Send</span>
            </Button>
          </form>
        </div>
      </div>

      <aside className="hidden space-y-4 xl:block">
        <div className="card p-5">
          <p className="mb-3 flex items-center gap-1.5 text-sm font-bold text-ink-900"><Database className="size-4 text-brand-500" /> Context Copilot can see</p>
          <ul className="space-y-2 text-[13px] text-ink-600">
            <li className="flex items-center justify-between"><span className="flex items-center gap-2"><Users className="size-3.5 text-ink-400" /> Leads</span><b className="text-ink-900">{stats.total}</b></li>
            <li className="flex items-center justify-between"><span className="flex items-center gap-2"><Workflow className="size-3.5 text-ink-400" /> Workflows</span><b className="text-ink-900">{stats.totalWorkflows}</b></li>
            <li className="flex items-center justify-between"><span className="flex items-center gap-2"><ListTodo className="size-3.5 text-ink-400" /> Open tasks</span><b className="text-ink-900">{stats.openTasks}</b></li>
            <li className="flex items-center justify-between"><span className="flex items-center gap-2"><Sparkles className="size-3.5 text-ink-400" /> Execution logs</span><b className="text-ink-900">{state.logs.length}</b></li>
          </ul>
        </div>
        <div className="card p-5">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-ink-900"><ShieldCheck className="size-4 text-emerald-500" /> How it works</p>
          <p className="text-[13px] leading-relaxed text-ink-600">
            {AI_MODE === 'claude'
              ? 'Questions are sent with a compact CRM snapshot to a secure serverless function that calls Claude. The API key lives only on the server.'
              : 'Running in local mode: a deterministic engine routes your question to analyses over live CRM data. No data leaves your browser and no API key is needed.'}
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-ink-500">To connect Claude, deploy with <code className="font-mono">ANTHROPIC_API_KEY</code> set server-side and <code className="font-mono">VITE_AI_MODE=claude</code>. See Settings → Integrations.</p>
        </div>
      </aside>
    </div>
  );
}
