// Personalised message generation (local, template + signal based).
// Output is always a DRAFT stored in the CRM — nothing is sent anywhere.
import { firstName, daysBetween, formatDate } from '../lib/utils';
import { getLeadScore } from './qualification';

export const EMAIL_TEMPLATES = {
  welcome: 'Welcome email',
  outreach: 'High-value outreach',
  reengagement: 'Re-engagement',
  followup: 'Follow-up nudge',
};

const SOURCE_HOOK = {
  Referral: (l) => `Thanks for being introduced to us${l._referrer ? ` by ${l._referrer}` : ''} — referrals are how most of our best partnerships start.`,
  Webinar: () => 'Thanks for joining our automation webinar — I hope it sparked a few ideas.',
  'Web Form': () => 'Thanks for reaching out through our website form — I read your note personally.',
  'Trade Show': () => 'It was great connecting at the event — thanks for stopping by our booth.',
  LinkedIn: () => 'Thanks for connecting on LinkedIn.',
  Website: () => 'Thanks for checking out what we do.',
  'Cold Outreach': () => "I'll keep this short and relevant.",
};

const INDUSTRY_PAIN = {
  SaaS: 'turning trials into paying customers without adding headcount',
  'E-commerce': 'recovering abandoned carts and following up on wholesale enquiries',
  'Professional Services': 'responding to new enquiries before competitors do',
  Healthcare: 'reducing no-shows and keeping patient follow-ups consistent',
  'Real Estate': 'following up on every viewing and enquiry within minutes',
  'Financial Services': 'onboarding clients quickly while staying compliant',
  Logistics: 'keeping reps out of spreadsheets and on the phone',
  Education: 'keeping applicants engaged between enquiry and enrolment',
  Manufacturing: 'speeding up quote follow-ups and distributor communication',
  Hospitality: 'turning one-time guests and event enquiries into repeat bookings',
};

/** Extract the most recent meaningful note to reference in copy. */
function contextFromNotes(lead) {
  const note = (lead.notes || []).filter((n) => !n.system).slice(-1)[0]?.text;
  if (!note) return null;
  const firstSentence = note.split(/(?<=[.!?])\s/)[0].replace(/^form:\s*/i, '').replace(/["“”]/g, '');
  return firstSentence.length > 140 ? `${firstSentence.slice(0, 137)}…` : firstSentence;
}

export function renderTemplate(text = '', lead = {}, settings = {}) {
  return text
    .replace(/{{\s*first_name\s*}}/g, firstName(lead.name))
    .replace(/{{\s*full_name\s*}}/g, lead.name || '')
    .replace(/{{\s*company\s*}}/g, lead.company || 'your team')
    .replace(/{{\s*industry\s*}}/g, lead.industry || 'your industry')
    .replace(/{{\s*job_title\s*}}/g, lead.jobTitle || '')
    .replace(/{{\s*sender_name\s*}}/g, settings.senderName || 'The FlowPilot team')
    .replace(/{{\s*business_name\s*}}/g, settings.businessName || 'FlowPilot');
}

/** Returns list of template variables that cannot be resolved for a lead. */
export function unresolvedVariables(text = '', lead = {}) {
  const missing = [];
  if (/{{\s*company\s*}}/.test(text) && !lead.company) missing.push('company');
  if (/{{\s*job_title\s*}}/.test(text) && !lead.jobTitle) missing.push('job_title');
  return missing;
}

const signature = (s) => `${s.senderName || 'Alex Morgan'}\n${s.senderRole || 'Growth Lead'}, ${s.businessName || 'FlowPilot'}`;

export function generateEmail(template, lead, settings = {}) {
  const first = firstName(lead.name);
  const company = lead.company || 'your team';
  const pain = INDUSTRY_PAIN[lead.industry] || 'automating the repetitive work that slows your team down';
  const ctx = contextFromNotes(lead);
  const hook = (SOURCE_HOOK[lead.source] || SOURCE_HOOK.Website)(lead);
  const sig = signature(settings);

  switch (template) {
    case 'welcome':
      return {
        subject: `Welcome, ${first} — a quick plan for ${company}`,
        body: [
          `Hi ${first},`,
          `${hook}`,
          ctx
            ? `You mentioned: "${ctx}" That's exactly the kind of busywork we help teams automate.`
            : `Teams in ${lead.industry || 'your space'} usually come to us for help with ${pain}.`,
          `Here's what I'd suggest as a next step: a 20-minute call where I map your current follow-up process and show you two automations you could have running the same day.`,
          `Does ${dayHint()} work for you?`,
          `Best,\n${sig}`,
        ].join('\n\n'),
      };
    case 'outreach':
      return {
        subject: `${company} × ${settings.businessName || 'FlowPilot'}: ${shortPain(lead)}`,
        body: [
          `Hi ${first},`,
          lead.jobTitle
            ? `As ${article(lead.jobTitle)} ${lead.jobTitle}, you're probably balancing growth targets with a team that's stretched thin.`
            : `I'll get straight to the point.`,
          ctx ? `I noted: "${ctx}"` : null,
          `We help ${lead.industry ? `${lead.industry.toLowerCase()} ` : ''}teams like ${company} with ${pain} — typically saving 6–10 hours per rep each week by automating follow-ups, qualification and handovers.`,
          `I've put together a short plan specific to ${company}. Could I walk you through it in a 20-minute call ${dayHint()}?`,
          `Kind regards,\n${sig}`,
        ]
          .filter(Boolean)
          .join('\n\n'),
      };
    case 'reengagement': {
      const idle = daysBetween(lead.lastContactedAt || lead.createdAt);
      return {
        subject: `Still worth a conversation, ${first}?`,
        body: [
          `Hi ${first},`,
          `It's been about ${idle} days since we last spoke, so I wanted to check in rather than let this drift.`,
          ctx ? `Last time you mentioned: "${ctx}" Is that still a priority for ${company}?` : `Is improving ${pain} still on the radar at ${company}?`,
          `If timing isn't right, just say so and I'll check back next quarter. If it is, I can share a 2-minute video of a workflow built for a team like yours.`,
          `Cheers,\n${sig}`,
        ].join('\n\n'),
      };
    }
    case 'followup':
    default:
      return {
        subject: `Following up — next steps for ${company}`,
        body: [
          `Hi ${first},`,
          `Just following up on my last note. I know things get busy, so here's the short version: we can help ${company} with ${pain}.`,
          `Would a quick 15-minute call ${dayHint()} be useful?`,
          `Best,\n${sig}`,
        ].join('\n\n'),
      };
  }
}

function dayHint() {
  const d = new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const a = (d.getDay() + 2) % 7;
  const b = (d.getDay() + 3) % 7;
  const fix = (i) => (i === 0 ? 1 : i === 6 ? 5 : i);
  return `${days[fix(a)]} or ${days[fix(b) === fix(a) ? fix(a) + 1 : fix(b)]}`;
}

const article = (word = '') => (/^[aeiou]/i.test(word) ? 'an' : 'a');
const shortPain = (lead) =>
  ({
    Healthcare: 'fewer no-shows, zero manual reminders',
    SaaS: 'more trials converted, automatically',
    'E-commerce': 'automated follow-ups that recover revenue',
    Logistics: 'reps on the phone, not in spreadsheets',
    'Financial Services': 'faster, compliant client onboarding',
    Hospitality: 'more repeat bookings on autopilot',
    Education: 'more enquiries turned into enrolments',
  })[lead.industry] || 'automating the busywork';

/** Short narrative summary of a lead — used by workflows and Copilot. */
export function generateLeadSummary(lead, state) {
  const q = lead.qualification;
  const score = getLeadScore(lead);
  const tasks = (state?.tasks || []).filter((t) => t.leadId === lead.id);
  const open = tasks.filter((t) => t.status === 'open');
  const msgs = (state?.messages || []).filter((m) => m.leadId === lead.id);
  const idle = daysBetween(lead.lastContactedAt || lead.createdAt);
  const parts = [
    `${lead.name}${lead.jobTitle ? `, ${lead.jobTitle}` : ''}${lead.company ? ` at ${lead.company}` : ''}${lead.industry ? ` (${lead.industry}${lead.companySize ? `, ${lead.companySize} employees` : ''})` : ''}.`,
    `Came in via ${lead.source} on ${formatDate(lead.createdAt)}; currently ${lead.status} with ${lead.priority.toLowerCase()} priority.`,
    q ? `Qualified at ${q.score}/100 — ${q.category}.` : `Estimated fit score ${score}/100 (not yet formally qualified).`,
    lead.dealValue ? `Estimated deal value $${Number(lead.dealValue).toLocaleString()}.` : null,
    lead.lastContactedAt ? `Last contacted ${idle} day${idle === 1 ? '' : 's'} ago.` : 'Not contacted yet.',
    open.length ? `${open.length} open follow-up${open.length > 1 ? 's' : ''}: "${open[0].title}".` : 'No open follow-ups.',
    msgs.length ? `${msgs.length} AI-drafted message${msgs.length > 1 ? 's' : ''} on file.` : null,
  ];
  return parts.filter(Boolean).join(' ');
}

/** Campaign copy generator. Uses merge tags so each recipient gets a personalised preview. */
export function generateCampaignContent({ goal = 'nurture', tone = 'friendly', name = '' }, settings = {}) {
  const greet = tone === 'professional' ? 'Hello {{first_name}},' : tone === 'bold' ? '{{first_name}} —' : 'Hi {{first_name}},';
  const close = tone === 'professional' ? 'Kind regards,' : tone === 'bold' ? 'Talk soon,' : 'Cheers,';
  const biz = settings.businessName || 'our team';
  const bodies = {
    nurture: {
      subject: tone === 'bold' ? '3 automations {{company}} should steal this week' : 'A few ideas for {{company}}',
      core: `Teams like {{company}} usually lose hours every week to manual follow-ups. Here are three automations that pay off fastest:\n\n1. Instant welcome email + follow-up task for every new enquiry\n2. Automatic prioritisation of high-value leads\n3. A re-engagement nudge for anyone who goes quiet for 7 days\n\nHappy to show you how any of these would work for your team.`,
    },
    convert: {
      subject: tone === 'bold' ? "Let's get {{company}} live this month" : 'Next steps for {{company}}',
      core: `I wanted to make it easy to move forward. If you can give me 20 minutes, I'll map out the first three workflows for {{company}} and a realistic go-live date.\n\nIf there are open questions on pricing or implementation, reply with them and I'll answer directly.`,
    },
    reengage: {
      subject: 'Still on your radar, {{first_name}}?',
      core: `It's been a little while, so I wanted to check in. A lot has changed on our side — including new automations built for {{industry}} teams.\n\nIf now isn't the right time, no problem. If it is, reply "yes" and I'll send a 2-minute walkthrough.`,
    },
    announce: {
      subject: `New at ${biz}: an AI copilot for your pipeline`,
      core: `We've just launched an AI copilot that summarises your pipeline, flags leads that need attention and drafts personalised follow-ups in seconds.\n\nI'd love to give {{company}} early access — want a quick tour?`,
    },
  };
  const b = bodies[goal] || bodies.nurture;
  return {
    subject: b.subject,
    body: `${greet}\n\n${b.core}\n\n${close}\n{{sender_name}}\n${biz}`,
    generatedFor: name,
  };
}
