// Deterministic lead-qualification model.
//
// This is transparent, rule-based scoring (a BANT-style fit model) so the demo
// works offline with explainable results. The same function signature can be
// backed by a Claude call later (see src/ai/provider.js) without UI changes.
import { EMAIL_RE, daysBetween } from '../lib/utils';
import { FREE_EMAIL_DOMAINS } from '../data/constants';

const SENIORITY = [
  { re: /\b(ceo|coo|cfo|cmo|cto|chief|founder|co-founder|owner|president|managing partner|partner)\b/i, pts: 22, label: 'Executive decision-maker' },
  { re: /\b(vp|vice president|head of|director|general manager)\b/i, pts: 18, label: 'Senior leader with budget influence' },
  { re: /\b(manager|lead|principal)\b/i, pts: 13, label: 'Manager-level stakeholder' },
];

const SIZE_PTS = { '1-10': 5, '11-50': 12, '51-200': 18, '201-1000': 20, '1000+': 17 };
const SOURCE_PTS = { Referral: 18, Webinar: 14, 'Web Form': 13, 'Trade Show': 10, LinkedIn: 10, Website: 8, 'Cold Outreach': 4 };
const STAGE_PTS = { New: 0, Contacted: 2, Qualified: 5, Proposal: 7, Converted: 8 };
const INTENT_WORDS = ['demo', 'pricing', 'budget', 'timeline', 'urgent', 'proposal', 'approved', 'rollout', 'this month', 'q1'];

export function scoreLead(lead) {
  const reasons = [];
  const gaps = [];
  let score = 0;

  // 1. Authority
  const seniority = SENIORITY.find((s) => s.re.test(lead.jobTitle || ''));
  if (seniority) {
    score += seniority.pts;
    reasons.push(`${seniority.label} (${lead.jobTitle}).`);
  } else if (lead.jobTitle) {
    score += 6;
    gaps.push(`Role "${lead.jobTitle}" may not own the buying decision.`);
  } else {
    gaps.push('No job title — authority unknown.');
  }

  // 2. Company fit
  if (lead.companySize && SIZE_PTS[lead.companySize]) {
    score += SIZE_PTS[lead.companySize];
    if (SIZE_PTS[lead.companySize] >= 17) reasons.push(`Company size ${lead.companySize} fits the ideal customer profile.`);
    else gaps.push(`Small team (${lead.companySize}) — lower contract potential.`);
  } else gaps.push('Company size unknown.');

  // 3. Budget
  const value = Number(lead.dealValue) || 0;
  if (value >= 40000) { score += 20; reasons.push(`High estimated deal value ($${value.toLocaleString()}).`); }
  else if (value >= 15000) { score += 14; reasons.push(`Healthy estimated deal value ($${value.toLocaleString()}).`); }
  else if (value >= 5000) { score += 8; }
  else if (value > 0) { score += 3; gaps.push('Low estimated deal value.'); }
  else gaps.push('No budget signal captured yet.');

  // 4. Source quality
  const srcPts = SOURCE_PTS[lead.source] ?? 5;
  score += srcPts;
  if (srcPts >= 13) reasons.push(`${lead.source} leads convert above average.`);
  else if (srcPts <= 5) gaps.push(`${lead.source} leads typically need longer nurturing.`);

  // 5. Contactability
  const email = (lead.email || '').trim().toLowerCase();
  if (EMAIL_RE.test(email)) {
    score += 5;
    const domain = email.split('@')[1];
    if (FREE_EMAIL_DOMAINS.includes(domain)) gaps.push('Personal email address — confirm business context.');
    else score += 4;
  } else gaps.push('No valid email address.');
  if (lead.phone) score += 3;
  if (!lead.company) { score -= 6; gaps.push('No company on record.'); }

  // 6. Intent & engagement
  const text = (lead.notes || []).map((n) => n.text).join(' ').toLowerCase();
  const hits = INTENT_WORDS.filter((w) => text.includes(w));
  if (hits.length) {
    const pts = Math.min(hits.length * 2, 6);
    score += pts;
    reasons.push(`Buying intent in notes (${hits.slice(0, 3).map((h) => `"${h}"`).join(', ')}).`);
  }
  score += STAGE_PTS[lead.status] ?? 0;

  // 7. Recency decay
  const idle = daysBetween(lead.lastContactedAt || lead.createdAt);
  if (lead.status !== 'Converted' && idle > 14) {
    score -= 5;
    gaps.push(`No contact for ${idle} days — interest may be cooling.`);
  }

  score = Math.max(5, Math.min(97, Math.round(score)));
  const category = categorise(score);
  return {
    score,
    category: category.name,
    tier: category.tier,
    reasoning: [...reasons, ...gaps].slice(0, 6),
    strengths: reasons,
    gaps,
    nextAction: nextAction(lead, category.tier, gaps),
    model: 'FlowPilot Fit Model v1 (local, deterministic)',
  };
}

function categorise(score) {
  if (score >= 75) return { tier: 'hot', name: 'Hot — sales-ready' };
  if (score >= 55) return { tier: 'warm', name: 'Warm — nurture to opportunity' };
  if (score >= 35) return { tier: 'cool', name: 'Cool — long-term nurture' };
  return { tier: 'cold', name: 'Low fit — deprioritise' };
}

function nextAction(lead, tier, gaps) {
  if (lead.status === 'Converted') return 'Schedule a success check-in and explore upsell or referral opportunities.';
  if (!EMAIL_RE.test(lead.email || '')) return 'Capture a valid business email before adding to any sequence.';
  if (tier === 'hot') {
    if (lead.status === 'Proposal') return 'Book a decision call within 48 hours to close out open questions on the proposal.';
    return 'Call within 24 hours and offer a tailored demo; move to Qualified after discovery.';
  }
  if (tier === 'warm') {
    if (gaps.some((g) => g.includes('budget'))) return 'Run a discovery call focused on budget and timeline, then send a case study.';
    return 'Send a personalised case study and propose a 20-minute discovery call.';
  }
  if (tier === 'cool') return 'Add to a monthly nurture campaign and re-score after the next engagement.';
  return 'Keep in a low-touch newsletter; do not spend rep time until new intent appears.';
}

/** Score used by automation conditions: stored qualification if present, else live score. */
export const getLeadScore = (lead) => lead?.qualification?.score ?? scoreLead(lead).score;
