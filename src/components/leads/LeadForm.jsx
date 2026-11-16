import { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import Button from '../ui/Button';
import { Field, Input, Select, Textarea } from '../ui/Field';
import { COMPANY_SIZES, INDUSTRIES, LEAD_SOURCES, LEAD_STATUSES, PRIORITIES } from '../../data/constants';
import { EMAIL_RE, PHONE_RE } from '../../lib/utils';

const EMPTY = {
  name: '',
  email: '',
  company: '',
  phone: '',
  jobTitle: '',
  source: 'Website',
  status: 'New',
  priority: 'Medium',
  companySize: '',
  industry: '',
  dealValue: '',
  followUpDate: '',
  note: '',
};

export function validateLead(v) {
  const e = {};
  if (!v.name.trim() || v.name.trim().length < 2) e.name = 'Enter the lead’s full name.';
  if (v.email.trim() && !EMAIL_RE.test(v.email.trim())) e.email = 'That doesn’t look like a valid email address.';
  if (v.phone.trim() && !PHONE_RE.test(v.phone.trim())) e.phone = 'Use digits, spaces and + ( ) - only.';
  if (!v.email.trim() && !v.phone.trim()) e.email = 'Add an email or a phone number so the lead can be contacted.';
  if (!v.source) e.source = 'Choose a lead source.';
  if (v.dealValue !== '' && (Number.isNaN(Number(v.dealValue)) || Number(v.dealValue) < 0)) e.dealValue = 'Enter a positive number.';
  return e;
}

export default function LeadForm({ open, onClose, onSubmit, initial, title = 'Add new lead', submitLabel = 'Add lead' }) {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const editing = !!initial;

  useEffect(() => {
    if (open) {
      setValues(
        initial
          ? {
              ...EMPTY,
              ...initial,
              dealValue: initial.dealValue ? String(initial.dealValue) : '',
              followUpDate: initial.followUpDate ? initial.followUpDate.slice(0, 10) : '',
              note: '',
            }
          : EMPTY,
      );
      setErrors({});
      setSubmitting(false);
    }
  }, [open, initial]);

  const set = (k) => (e) => {
    setValues((v) => ({ ...v, [k]: e.target.value }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const submit = (e) => {
    e.preventDefault();
    const errs = validateLead(values);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSubmitting(true);
    onSubmit({
      ...values,
      followUpDate: values.followUpDate ? new Date(`${values.followUpDate}T10:00:00`).toISOString() : null,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={editing ? 'Update contact details, pipeline stage and fit signals.' : 'Active “New lead created” workflows will run automatically.'}
      size="lg"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="lead-form" loading={submitting}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <form id="lead-form" onSubmit={submit} noValidate className="space-y-5">
        <div>
          <p className="eyebrow mb-2.5">Contact</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name" required error={errors.name}>
              <Input value={values.name} onChange={set('name')} placeholder="e.g. Ngozi Adeyemi" error={errors.name} autoFocus />
            </Field>
            <Field label="Email address" error={errors.email}>
              <Input type="email" value={values.email} onChange={set('email')} placeholder="name@company.com" error={errors.email} />
            </Field>
            <Field label="Company">
              <Input value={values.company} onChange={set('company')} placeholder="Company name" />
            </Field>
            <Field label="Phone number" error={errors.phone}>
              <Input value={values.phone} onChange={set('phone')} placeholder="+234 800 000 0000" error={errors.phone} />
            </Field>
            <Field label="Job title" hint="Used by AI qualification to gauge authority">
              <Input value={values.jobTitle} onChange={set('jobTitle')} placeholder="e.g. Head of Operations" />
            </Field>
            <Field label="Lead source" required error={errors.source}>
              <Select options={LEAD_SOURCES} value={values.source} onChange={set('source')} error={errors.source} />
            </Field>
          </div>
        </div>
        <div>
          <p className="eyebrow mb-2.5">Pipeline</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Status">
              <Select options={LEAD_STATUSES} value={values.status} onChange={set('status')} />
            </Field>
            <Field label="Priority">
              <Select options={PRIORITIES} value={values.priority} onChange={set('priority')} />
            </Field>
            <Field label="Follow-up date">
              <Input type="date" value={values.followUpDate} onChange={set('followUpDate')} />
            </Field>
          </div>
        </div>
        <div>
          <p className="eyebrow mb-2.5">Fit signals (optional)</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Company size">
              <Select options={COMPANY_SIZES} value={values.companySize} onChange={set('companySize')} placeholder="Unknown" />
            </Field>
            <Field label="Industry">
              <Select options={INDUSTRIES} value={values.industry} onChange={set('industry')} placeholder="Unknown" />
            </Field>
            <Field label="Est. deal value (USD)" error={errors.dealValue}>
              <Input inputMode="numeric" value={values.dealValue} onChange={set('dealValue')} placeholder="25000" error={errors.dealValue} />
            </Field>
          </div>
        </div>
        {!editing && (
          <Field label="First note" hint="Context from the conversation — referenced in AI-generated emails">
            <Textarea value={values.note} onChange={set('note')} placeholder="What did they ask for? Timeline, budget, pain points…" />
          </Field>
        )}
      </form>
    </Modal>
  );
}
