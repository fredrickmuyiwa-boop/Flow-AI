import { useMemo, useState } from 'react';
import { ArrowLeft, Plus, Trash2, ArrowUp, ArrowDown, Save, Play, AlertCircle, Zap, Filter, Bolt, X, MousePointerClick } from 'lucide-react';
import { useStore } from '../store/AppStore';
import { useRouter } from '../lib/router';
import { useToast } from '../components/ui/Toast';
import { ACTIONS, CONDITIONS, TRIGGERS, defaultConfig, describeTrigger } from '../engine/catalog';
import { validateWorkflow } from '../engine/automationEngine';
import { cx, uid } from '../lib/utils';
import Button, { IconButton } from '../components/ui/Button';
import { Field, Input, Select, Textarea } from '../components/ui/Field';
import { Toggle, EmptyState } from '../components/ui/misc';
import { Modal } from '../components/ui/Modal';
import { blockIcon } from '../components/automation/blockIcons';
import RunDialog from '../components/automation/RunDialog';
import RunResult from '../components/automation/RunResult';

const blank = () => ({
  id: uid('wf'),
  name: '',
  description: '',
  active: false,
  trigger: { type: 'new_lead', config: {} },
  conditions: [],
  actions: [],
  isNew: true,
});

const KIND_STYLE = {
  trigger: { ring: 'border-sky-200', chip: 'bg-sky-50 text-sky-700', label: 'Trigger', icon: Zap },
  condition: { ring: 'border-amber-200', chip: 'bg-amber-50 text-amber-800', label: 'Condition', icon: Filter },
  action: { ring: 'border-brand-200', chip: 'bg-brand-50 text-brand-700', label: 'Action', icon: Bolt },
};

function ConfigFields({ fields, config, onChange }) {
  if (!fields?.length) return <p className="text-xs text-ink-500">No configuration needed for this block.</p>;
  return (
    <div className="space-y-3">
      {fields.map((f) => {
        const v = config?.[f.key] ?? f.default ?? '';
        const set = (val) => onChange({ ...config, [f.key]: val });
        return (
          <Field key={f.key} label={f.label} hint={f.hint}>
            {f.type === 'select' ? (
              <Select options={f.options} labels={f.optionLabels} value={v} onChange={(e) => set(e.target.value)} />
            ) : f.type === 'number' ? (
              <Input type="number" min={f.min} max={f.max} value={v} onChange={(e) => set(e.target.value === '' ? '' : Number(e.target.value))} />
            ) : f.type === 'textarea' ? (
              <Textarea value={v} onChange={(e) => set(e.target.value)} />
            ) : (
              <Input value={v} onChange={(e) => set(e.target.value)} />
            )}
          </Field>
        );
      })}
    </div>
  );
}

function Node({ kind, icon, title, subtitle, selected, onSelect, controls }) {
  const s = KIND_STYLE[kind];
  const Icon = icon;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect())}
      className={cx(
        'group relative w-full max-w-md rounded-2xl border bg-white p-3.5 text-left shadow-card transition',
        s.ring,
        selected ? 'ring-4 ring-brand-200 border-brand-400' : 'hover:shadow-lift',
      )}
    >
      <div className="flex items-center gap-3">
        <span className={cx('grid size-9 shrink-0 place-items-center rounded-xl', s.chip)}>
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-400">{s.label}</p>
          <p className="truncate text-sm font-bold text-ink-900">{title}</p>
          {subtitle && <p className="truncate text-xs text-ink-500">{subtitle}</p>}
        </div>
        {controls && (
          <div className="flex items-center opacity-70 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
            {controls}
          </div>
        )}
      </div>
    </div>
  );
}

const Connector = ({ label }) => (
  <div className="flex flex-col items-center">
    <div className="h-5 w-px bg-ink-300" />
    {label && <span className="rounded-full border border-ink-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-400">{label}</span>}
    {label && <div className="h-3 w-px bg-ink-300" />}
  </div>
);

function AddButton({ onClick, children }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-ink-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-ink-600 transition hover:border-brand-400 hover:text-brand-700">
      <Plus className="size-3.5" /> {children}
    </button>
  );
}

function Picker({ open, kind, onClose, onPick }) {
  const catalog = kind === 'condition' ? CONDITIONS : ACTIONS;
  return (
    <Modal open={open} onClose={onClose} title={kind === 'condition' ? 'Add a condition' : 'Add an action'} description={kind === 'condition' ? 'All conditions must pass for actions to run.' : 'Actions run in order. If one fails, the rest are skipped.'}>
      <div className="grid gap-2 sm:grid-cols-2">
        {Object.entries(catalog).map(([key, def]) => {
          const Icon = blockIcon(def.icon);
          return (
            <button key={key} onClick={() => onPick(key)} className="flex items-center gap-3 rounded-xl border border-ink-200 p-3 text-left transition hover:border-brand-300 hover:bg-brand-50/40">
              <span className={cx('grid size-9 shrink-0 place-items-center rounded-lg', KIND_STYLE[kind].chip)}><Icon className="size-4" /></span>
              <span className="text-sm font-semibold text-ink-900">{def.label}</span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

export default function WorkflowBuilder({ params }) {
  const { state, actions } = useStore();
  const { navigate, query } = useRouter();
  const toast = useToast();
  const existing = state.workflows.find((w) => w.id === params.id);
  const isNew = params.id === 'new';
  const [wf, setWf] = useState(() => (existing ? structuredClone(existing) : blank()));
  const [selected, setSelected] = useState({ kind: 'trigger' });
  const [picker, setPicker] = useState(null);
  const [errors, setErrors] = useState([]);
  const [dirty, setDirty] = useState(isNew);
  const [testing, setTesting] = useState(query.test === '1' && !!existing);
  const [result, setResult] = useState(null);

  const update = (fn) => {
    setWf((w) => fn(structuredClone(w)));
    setDirty(true);
    setErrors([]);
  };

  const selectedBlock = useMemo(() => {
    if (selected.kind === 'trigger') return { kind: 'trigger', block: wf.trigger };
    const list = selected.kind === 'condition' ? wf.conditions : wf.actions;
    const block = list.find((b) => b.id === selected.id);
    return block ? { kind: selected.kind, block } : null;
  }, [selected, wf]);

  if (!isNew && !existing)
    return (
      <div className="card">
        <EmptyState icon={AlertCircle} title="Workflow not found" message="It may have been deleted." action={<Button variant="primary" onClick={() => navigate('/automations')}>Back to Studio</Button>} />
      </div>
    );

  const addBlock = (kind, type) => {
    const def = (kind === 'condition' ? CONDITIONS : ACTIONS)[type];
    const block = { id: uid(kind === 'condition' ? 'c' : 'a'), type, config: defaultConfig(def.fields) };
    update((w) => {
      (kind === 'condition' ? w.conditions : w.actions).push(block);
      return w;
    });
    setSelected({ kind, id: block.id });
    setPicker(null);
  };

  const removeBlock = (kind, id) => {
    update((w) => {
      if (kind === 'condition') w.conditions = w.conditions.filter((b) => b.id !== id);
      else w.actions = w.actions.filter((b) => b.id !== id);
      return w;
    });
    setSelected({ kind: 'trigger' });
  };

  const move = (id, dir) =>
    update((w) => {
      const i = w.actions.findIndex((a) => a.id === id);
      const j = i + dir;
      if (j < 0 || j >= w.actions.length) return w;
      [w.actions[i], w.actions[j]] = [w.actions[j], w.actions[i]];
      return w;
    });

  const save = ({ thenTest = false } = {}) => {
    const errs = validateWorkflow(wf);
    setErrors(errs);
    if (errs.length) {
      toast.error('Workflow not saved', errs[0]);
      return null;
    }
    const { isNew: _n, ...clean } = wf;
    const saved = actions.saveWorkflow(clean);
    setDirty(false);
    toast.success(isNew ? 'Workflow created' : 'Workflow saved', clean.active ? 'It is active and will run automatically.' : 'It is inactive — toggle it on to run automatically.');
    if (isNew) navigate(`/automations/${saved.id}${thenTest ? '?test=1' : ''}`);
    return saved;
  };

  const test = () => {
    const saved = dirty ? save({ thenTest: true }) : wf;
    if (saved && !isNew) setTesting(true);
  };

  const TDef = TRIGGERS[wf.trigger.type];

  return (
    <div>
      <button onClick={() => navigate('/automations')} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-900">
        <ArrowLeft className="size-4" /> Automation Studio
      </button>

      <div className="card mb-4 flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
        <div className="grid flex-1 gap-2 sm:grid-cols-[1fr_1.4fr]">
          <Input value={wf.name} onChange={(e) => update((w) => ({ ...w, name: e.target.value }))} placeholder="Workflow name" className="font-semibold" aria-label="Workflow name" error={errors.some((e) => e.includes('name'))} />
          <Input value={wf.description} onChange={(e) => update((w) => ({ ...w, description: e.target.value }))} placeholder="What does this workflow do? (optional)" aria-label="Workflow description" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="mr-1 flex items-center gap-2 text-xs font-semibold text-ink-600">
            <Toggle checked={wf.active} onChange={(v) => update((w) => ({ ...w, active: v }))} label="Active" /> {wf.active ? 'Active' : 'Inactive'}
          </label>
          {dirty && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">Unsaved</span>}
          <Button icon={Play} onClick={test}>Test run</Button>
          <Button variant="primary" icon={Save} onClick={() => save()}>{isNew ? 'Create workflow' : 'Save'}</Button>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800">
          <p className="flex items-center gap-1.5 font-semibold"><AlertCircle className="size-4" /> Fix these before saving:</p>
          <ul className="mt-1 list-disc pl-6 text-[13px]">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="card dot-grid min-h-[540px] overflow-hidden p-5 sm:p-8">
          <div className="flex flex-col items-center">
            <span className="mb-3 rounded-full bg-ink-900 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">Start</span>
            <Node kind="trigger" icon={blockIcon(TDef?.icon)} title={describeTrigger(wf.trigger)} subtitle={TDef?.mode === 'scan' ? 'Scan trigger · runs on schedule or on demand' : 'Event trigger · runs instantly'} selected={selected.kind === 'trigger'} onSelect={() => setSelected({ kind: 'trigger' })} />

            {wf.conditions.map((c, i) => {
              const def = CONDITIONS[c.type];
              return (
                <div key={c.id} className="flex w-full flex-col items-center">
                  <Connector label={i === 0 ? 'only if' : 'and'} />
                  <Node kind="condition" icon={blockIcon(def.icon)} title={def.describe(c.config)} subtitle={def.label} selected={selected.id === c.id} onSelect={() => setSelected({ kind: 'condition', id: c.id })} controls={<IconButton icon={Trash2} size="sm" label="Remove condition" onClick={() => removeBlock('condition', c.id)} />} />
                </div>
              );
            })}
            <Connector />
            <AddButton onClick={() => setPicker('condition')}>Add condition</AddButton>

            {wf.actions.map((a, i) => {
              const def = ACTIONS[a.type];
              return (
                <div key={a.id} className="flex w-full flex-col items-center">
                  <Connector label={i === 0 ? 'then' : undefined} />
                  <Node
                    kind="action"
                    icon={blockIcon(def.icon)}
                    title={def.label}
                    subtitle={def.describe(a.config)}
                    selected={selected.id === a.id}
                    onSelect={() => setSelected({ kind: 'action', id: a.id })}
                    controls={
                      <>
                        <IconButton icon={ArrowUp} size="sm" label="Move up" disabled={i === 0} onClick={() => move(a.id, -1)} />
                        <IconButton icon={ArrowDown} size="sm" label="Move down" disabled={i === wf.actions.length - 1} onClick={() => move(a.id, 1)} />
                        <IconButton icon={Trash2} size="sm" label="Remove action" onClick={() => removeBlock('action', a.id)} />
                      </>
                    }
                  />
                </div>
              );
            })}
            <Connector />
            <AddButton onClick={() => setPicker('action')}>Add action</AddButton>
            {!wf.actions.length && <p className="mt-2 text-xs text-ink-500">Workflows need at least one action.</p>}
          </div>
        </div>

        <div className="card h-fit p-5 lg:sticky lg:top-20">
          {selectedBlock ? (
            selectedBlock.kind === 'trigger' ? (
              <div>
                <p className="eyebrow mb-1">Configure trigger</p>
                <p className="mb-4 text-sm text-ink-500">What should start this workflow?</p>
                <div className="space-y-2">
                  {Object.entries(TRIGGERS).map(([key, def]) => {
                    const Icon = blockIcon(def.icon);
                    const on = wf.trigger.type === key;
                    return (
                      <button
                        key={key}
                        onClick={() => update((w) => ({ ...w, trigger: { type: key, config: defaultConfig(def.fields) } }))}
                        className={cx('flex w-full items-start gap-3 rounded-xl border p-3 text-left transition', on ? 'border-brand-400 bg-brand-50/60' : 'border-ink-200 hover:border-ink-300')}
                        aria-pressed={on}
                      >
                        <Icon className={cx('mt-0.5 size-4 shrink-0', on ? 'text-brand-600' : 'text-ink-400')} />
                        <span>
                          <span className="block text-sm font-semibold text-ink-900">{def.label}</span>
                          <span className="block text-xs leading-snug text-ink-500">{def.description}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                {TDef?.fields?.length > 0 && (
                  <div className="mt-4 border-t border-ink-100 pt-4">
                    <ConfigFields fields={TDef.fields} config={wf.trigger.config} onChange={(cfg) => update((w) => ({ ...w, trigger: { ...w.trigger, config: cfg } }))} />
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <p className="eyebrow mb-1">Configure {selectedBlock.kind}</p>
                    <p className="text-sm font-bold text-ink-900">{(selectedBlock.kind === 'condition' ? CONDITIONS : ACTIONS)[selectedBlock.block.type].label}</p>
                  </div>
                  <IconButton icon={X} size="sm" label="Close" onClick={() => setSelected({ kind: 'trigger' })} />
                </div>
                <Field label="Type" className="mb-3">
                  <Select
                    options={Object.keys(selectedBlock.kind === 'condition' ? CONDITIONS : ACTIONS)}
                    labels={Object.fromEntries(Object.entries(selectedBlock.kind === 'condition' ? CONDITIONS : ACTIONS).map(([k, d]) => [k, d.label]))}
                    value={selectedBlock.block.type}
                    onChange={(e) =>
                      update((w) => {
                        const list = selectedBlock.kind === 'condition' ? w.conditions : w.actions;
                        const b = list.find((x) => x.id === selectedBlock.block.id);
                        b.type = e.target.value;
                        b.config = defaultConfig((selectedBlock.kind === 'condition' ? CONDITIONS : ACTIONS)[b.type].fields);
                        return w;
                      })
                    }
                  />
                </Field>
                <ConfigFields
                  fields={(selectedBlock.kind === 'condition' ? CONDITIONS : ACTIONS)[selectedBlock.block.type].fields}
                  config={selectedBlock.block.config}
                  onChange={(cfg) =>
                    update((w) => {
                      const list = selectedBlock.kind === 'condition' ? w.conditions : w.actions;
                      list.find((x) => x.id === selectedBlock.block.id).config = cfg;
                      return w;
                    })
                  }
                />
                <Button variant="danger" size="sm" icon={Trash2} className="mt-5 w-full" onClick={() => removeBlock(selectedBlock.kind, selectedBlock.block.id)}>
                  Remove {selectedBlock.kind}
                </Button>
              </div>
            )
          ) : (
            <EmptyState icon={MousePointerClick} title="Select a block" message="Click any block on the canvas to configure it." />
          )}
          <div className="mt-5 rounded-xl bg-ink-50 p-3 text-[11.5px] leading-relaxed text-ink-500">
            Merge tags: <code className="font-mono text-ink-700">{'{{first_name}}'}</code> <code className="font-mono text-ink-700">{'{{company}}'}</code>. Emails are generated as drafts in the CRM — FlowPilot never sends without a connected, authorised email integration.
          </div>
        </div>
      </div>

      <Picker open={!!picker} kind={picker || 'action'} onClose={() => setPicker(null)} onPick={(type) => addBlock(picker, type)} />
      {testing && (
        <RunDialog
          wf={state.workflows.find((w) => w.id === wf.id) || wf}
          onClose={() => setTesting(false)}
          onRun={(ids) => {
            setTesting(false);
            const res = actions.runWorkflow(wf.id, { leadIds: ids });
            if (res.error) return toast.error('Could not run', res.error);
            setResult({ ...res, workflowName: wf.name });
          }}
        />
      )}
      <RunResult open={!!result} result={result} onClose={() => setResult(null)} />
    </div>
  );
}
