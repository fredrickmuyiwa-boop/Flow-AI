// The building blocks available in Automation Studio. Each entry describes how
// a block is labelled, configured and rendered. Execution lives in automationEngine.js.
import { LEAD_SOURCES, LEAD_STATUSES, PRIORITIES } from '../data/constants';
import { EMAIL_TEMPLATES } from '../logic/messaging';

export const TRIGGERS = {
  new_lead: {
    label: 'New lead created',
    description: 'Runs when a lead is added manually, imported or captured.',
    icon: 'UserPlus',
    mode: 'event',
    fields: [],
  },
  status_changed: {
    label: 'Lead status changed',
    description: 'Runs when a lead moves to a new pipeline stage.',
    icon: 'GitBranch',
    mode: 'event',
    fields: [{ key: 'toStatus', label: 'To status', type: 'select', options: ['Any', ...LEAD_STATUSES], default: 'Any' }],
  },
  form_submitted: {
    label: 'Form submitted',
    description: 'Runs when the website demo-request form is submitted.',
    icon: 'ClipboardList',
    mode: 'event',
    fields: [],
  },
  followup_due: {
    label: 'Follow-up date reached',
    description: 'Scans for leads whose follow-up date or task is due today or overdue.',
    icon: 'CalendarClock',
    mode: 'scan',
    fields: [],
  },
  no_contact: {
    label: 'Lead not contacted for N days',
    description: 'Scans open leads with no recorded contact for the chosen number of days.',
    icon: 'Hourglass',
    mode: 'scan',
    fields: [{ key: 'days', label: 'Days without contact', type: 'number', min: 1, max: 90, default: 7 }],
  },
};

export const CONDITIONS = {
  score_gt: {
    label: 'Lead score greater than',
    icon: 'Gauge',
    fields: [{ key: 'value', label: 'Score', type: 'number', min: 0, max: 100, default: 75 }],
    describe: (c) => `Lead score > ${c.value ?? 75}`,
  },
  source_eq: {
    label: 'Lead source equals',
    icon: 'Radio',
    fields: [{ key: 'value', label: 'Source', type: 'select', options: LEAD_SOURCES, default: 'Referral' }],
    describe: (c) => `Source is ${c.value ?? 'Referral'}`,
  },
  status_eq: {
    label: 'Lead status matches',
    icon: 'ListChecks',
    fields: [{ key: 'value', label: 'Status', type: 'select', options: LEAD_STATUSES, default: 'New' }],
    describe: (c) => `Status is ${c.value ?? 'New'}`,
  },
  email_exists: {
    label: 'Email address exists',
    icon: 'AtSign',
    fields: [],
    describe: () => 'Lead has a valid email',
  },
};

export const ACTIONS = {
  generate_email: {
    label: 'Generate personalised email',
    icon: 'Mail',
    fields: [
      {
        key: 'template',
        label: 'Email type',
        type: 'select',
        options: Object.keys(EMAIL_TEMPLATES),
        optionLabels: EMAIL_TEMPLATES,
        default: 'welcome',
      },
    ],
    describe: (c) => `Draft ${(EMAIL_TEMPLATES[c.template] || 'email').toLowerCase()}`,
  },
  create_task: {
    label: 'Create follow-up task',
    icon: 'CheckSquare',
    fields: [
      { key: 'title', label: 'Task title', type: 'text', default: 'Follow up with {{first_name}}', hint: 'Supports {{first_name}}, {{company}}' },
      { key: 'dueInDays', label: 'Due in (days)', type: 'number', min: 0, max: 60, default: 2 },
    ],
    describe: (c) => `Task due in ${c.dueInDays ?? 2}d`,
  },
  update_status: {
    label: 'Update lead status',
    icon: 'ArrowRightCircle',
    fields: [{ key: 'status', label: 'New status', type: 'select', options: LEAD_STATUSES, default: 'Contacted' }],
    describe: (c) => `Set status → ${c.status ?? 'Contacted'}`,
  },
  assign_priority: {
    label: 'Assign lead priority',
    icon: 'Flag',
    fields: [{ key: 'priority', label: 'Priority', type: 'select', options: PRIORITIES, default: 'High' }],
    describe: (c) => `Set priority → ${c.priority ?? 'High'}`,
  },
  add_note: {
    label: 'Add CRM note',
    icon: 'StickyNote',
    fields: [{ key: 'text', label: 'Note', type: 'textarea', default: 'Automated note from FlowPilot.', hint: 'Supports {{first_name}}, {{company}}' }],
    describe: () => 'Add note to timeline',
  },
  generate_summary: {
    label: 'Generate AI lead summary',
    icon: 'Sparkles',
    fields: [],
    describe: () => 'Summarise lead into a note',
  },
};

export function defaultConfig(fields = []) {
  return Object.fromEntries(fields.map((f) => [f.key, f.default]));
}

export function describeTrigger(trigger) {
  const def = TRIGGERS[trigger?.type];
  if (!def) return 'Unknown trigger';
  if (trigger.type === 'status_changed' && trigger.config?.toStatus && trigger.config.toStatus !== 'Any')
    return `Status changed → ${trigger.config.toStatus}`;
  if (trigger.type === 'no_contact') return `No contact for ${trigger.config?.days ?? 7}+ days`;
  return def.label;
}
