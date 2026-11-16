// Small, dependency-free helpers shared across the app.

export const uid = (prefix = 'id') =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export const DAY = 86_400_000;

export const cx = (...parts) => parts.filter(Boolean).join(' ');

export const firstName = (name = '') => name.trim().split(/\s+/)[0] || 'there';

export const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('') || '?';

export const daysBetween = (a, b = Date.now()) => Math.floor((new Date(b) - new Date(a)) / DAY);

export function formatDate(value, opts = {}) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', ...opts });
}

export function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, ${d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

export function timeAgo(value) {
  if (!value) return 'never';
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

export const isSameDay = (a, b = Date.now()) => new Date(a).toDateString() === new Date(b).toDateString();

export const currency = (n) =>
  typeof n === 'number' && !Number.isNaN(n)
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
    : '—';

export const pct = (n) => `${Math.round(n * 10) / 10}%`;

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PHONE_RE = /^[+()\d\s.-]{7,20}$/;

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
