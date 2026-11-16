export const LEAD_STATUSES = ['New', 'Contacted', 'Qualified', 'Proposal', 'Converted'];

export const LEAD_SOURCES = ['Website', 'Web Form', 'Referral', 'LinkedIn', 'Webinar', 'Trade Show', 'Cold Outreach'];

export const PRIORITIES = ['Low', 'Medium', 'High'];

export const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-1000', '1000+'];

export const INDUSTRIES = [
  'SaaS',
  'E-commerce',
  'Professional Services',
  'Healthcare',
  'Real Estate',
  'Financial Services',
  'Logistics',
  'Education',
  'Manufacturing',
  'Hospitality',
];

export const STATUS_STYLES = {
  New: { badge: 'bg-sky-50 text-sky-700 ring-sky-200', dot: 'bg-sky-500', chart: '#38bdf8' },
  Contacted: { badge: 'bg-indigo-50 text-indigo-700 ring-indigo-200', dot: 'bg-indigo-500', chart: '#6366f1' },
  Qualified: { badge: 'bg-violet-50 text-violet-700 ring-violet-200', dot: 'bg-violet-500', chart: '#8b5cf6' },
  Proposal: { badge: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500', chart: '#f59e0b' },
  Converted: { badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500', chart: '#10b981' },
};

export const PRIORITY_STYLES = {
  High: 'bg-rose-50 text-rose-700 ring-rose-200',
  Medium: 'bg-amber-50 text-amber-700 ring-amber-200',
  Low: 'bg-ink-100 text-ink-600 ring-ink-200',
};

export const LOG_STATUS_STYLES = {
  success: { label: 'Success', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  pending: { label: 'Pending', badge: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500' },
  failed: { label: 'Failed', badge: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500' },
  skipped: { label: 'Skipped', badge: 'bg-ink-100 text-ink-600 ring-ink-200', dot: 'bg-ink-400' },
};

export const FREE_EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com', 'proton.me'];
