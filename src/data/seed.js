// Realistic demo dataset. Dates are generated relative to "now" on first load
// so the dashboard always looks current, then persisted to LocalStorage.
import { DAY } from '../lib/utils';
import { scoreLead } from '../logic/qualification';

// [name, email, company, phone, source, status, priority, daysAgo, lastContactDaysAgo|null, jobTitle, size, industry, dealValue, note]
const LEADS = [
  ['Amaka Eze', 'amaka.eze@kestrelpay.io', 'KestrelPay', '+234 803 412 7781', 'Referral', 'Proposal', 'High', 34, 2, 'Chief Operating Officer', '51-200', 'Financial Services', 48000, 'Wants to automate merchant onboarding follow-ups. Asked for pricing on 3 seats + onboarding.'],
  ['Daniel Whitford', 'd.whitford@harborlinelogistics.com', 'Harborline Logistics', '+44 20 7946 0391', 'Trade Show', 'Qualified', 'High', 27, 5, 'VP Operations', '201-1000', 'Logistics', 62000, 'Met at Supply Chain Expo. 40+ reps manually logging calls. Timeline: Q1 rollout.'],
  ['Priya Raman', 'priya@lumenclinics.com', 'Lumen Clinics', '+1 415 555 0142', 'Webinar', 'Contacted', 'Medium', 18, 9, 'Practice Manager', '11-50', 'Healthcare', 14000, 'Attended "Automating patient intake" webinar. Interested in reminder workflows.'],
  ['Marcus Bell', 'marcus.bell@gmail.com', 'Bell & Co Renovations', '+1 312 555 0198', 'Website', 'New', 'Low', 3, null, 'Owner', '1-10', 'Professional Services', 3500, 'Downloaded the lead-tracking checklist.'],
  ['Sofia Laurent', 's.laurent@atelier-nord.fr', 'Atelier Nord', '+33 1 70 18 22 41', 'LinkedIn', 'Qualified', 'Medium', 22, 4, 'Head of Growth', '11-50', 'E-commerce', 21000, 'Replied to LinkedIn post. Running abandoned-cart emails manually in spreadsheets.'],
  ['Tunde Bakare', 'tunde@brightpathacademy.ng', 'BrightPath Academy', '+234 809 221 5530', 'Web Form', 'New', 'Medium', 1, null, 'Director of Admissions', '51-200', 'Education', 18000, 'Form: "We lose applicants between enquiry and campus tour." Requested a demo.'],
  ['Elena Petrova', 'elena.petrova@vantorsoft.com', 'Vantor Software', '+49 30 2209 1187', 'Referral', 'Converted', 'High', 52, 6, 'CEO', '51-200', 'SaaS', 54000, 'Signed annual plan. Referral from Amaka Eze.'],
  ['James Okafor', 'jokafor@okaforrealty.com', 'Okafor Realty Group', '+234 802 774 1902', 'Cold Outreach', 'Contacted', 'Low', 15, 11, 'Sales Manager', '11-50', 'Real Estate', 7500, 'Opened 3 emails, no reply yet. Possible budget constraints.'],
  ['Hannah Cole', 'hannah.cole@meridianhotels.co', 'Meridian Hotels', '+44 161 555 0177', 'Webinar', 'Proposal', 'High', 30, 3, 'Director of Revenue', '201-1000', 'Hospitality', 39000, 'Proposal sent for guest follow-up automation across 6 properties.'],
  ['Kenji Watanabe', 'k.watanabe@fujiparts.jp', 'Fuji Precision Parts', '+81 3 5555 0110', 'Trade Show', 'New', 'Medium', 6, null, 'Procurement Lead', '1000+', 'Manufacturing', 26000, 'Scanned badge at booth. Asked about ERP integration.'],
  ['Grace Mensah', 'grace@ashantiorganics.com', 'Ashanti Organics', '+233 24 555 0133', 'Website', 'Contacted', 'Medium', 12, 8, 'Founder', '11-50', 'E-commerce', 9800, 'Chatted on site about wholesale order follow-ups.'],
  ['Oliver Grant', 'oliver.grant@outlook.com', '', '+1 646 555 0101', 'Cold Outreach', 'New', 'Low', 9, null, 'Consultant', '1-10', 'Professional Services', 0, ''],
  ['Fatima Al-Sayed', 'fatima@crescentfinance.ae', 'Crescent Finance', '+971 4 555 0166', 'LinkedIn', 'Qualified', 'High', 20, 2, 'Chief Marketing Officer', '201-1000', 'Financial Services', 58000, 'Budget approved for Q1. Needs SOC 2 documentation and a demo for the CFO.'],
  ['Lucas Moreira', 'lucas@pixelforge.studio', 'PixelForge Studio', '+55 11 5555 0144', 'Referral', 'Converted', 'Medium', 44, 13, 'Managing Partner', '11-50', 'Professional Services', 16000, 'Converted on monthly plan. Upsell opportunity: client-reporting automation.'],
  ['Chloe Adams', 'chloe.adams@northstarhealth.org', 'Northstar Health', '+1 617 555 0123', 'Web Form', 'Contacted', 'High', 8, 10, 'Operations Director', '201-1000', 'Healthcare', 33000, 'Form: "Need to cut no-show rate." Missed scheduled call last week.'],
  ['Ibrahim Sule', 'ibrahim.sule@kanoagro.com', 'Kano Agro Exports', '+234 806 990 4421', 'Trade Show', 'Proposal', 'Medium', 25, 7, 'General Manager', '51-200', 'Logistics', 22000, 'Reviewing proposal with partners. Asked about payment in two instalments.'],
  ['Rachel Kim', 'rachel@sproutlearning.co', 'Sprout Learning', '+1 206 555 0187', 'Webinar', 'New', 'Medium', 2, null, 'Head of Marketing', '11-50', 'Education', 12000, 'Registered for next webinar, asked if a pricing tier fits teams of 5.'],
  ['Thomas Müller', 't.mueller@alpenbau.de', 'AlpenBau GmbH', '+49 89 5555 0129', 'Cold Outreach', 'Contacted', 'Low', 40, 21, 'IT Manager', '201-1000', 'Manufacturing', 15000, 'Said "maybe next quarter".'],
  ['Zainab Bello', 'zainab@lagosbites.ng', 'Lagos Bites', '+234 817 334 0091', 'Website', 'Converted', 'Medium', 48, 15, 'Owner', '11-50', 'Hospitality', 6200, 'Uses FlowPilot for catering enquiry follow-ups.'],
  ['Noah Fischer', 'noah@cloudnest.dev', 'CloudNest', '+1 512 555 0150', 'LinkedIn', 'Qualified', 'Medium', 16, 6, 'Founder & CEO', '11-50', 'SaaS', 19000, 'Wants trial-to-paid nurture sequence. Timeline: this month.'],
  ['Aisha Diallo', 'aisha.diallo@sahelpharma.sn', 'Sahel Pharma', '+221 33 555 0175', 'Referral', 'New', 'High', 0, null, 'VP Commercial', '201-1000', 'Healthcare', 45000, 'Referred by Elena Petrova. Urgent: new sales team starting next month.'],
  ['Ben Carter', 'ben.carter@carterlaw.com', 'Carter Legal', '+1 202 555 0112', 'Web Form', 'Contacted', 'Medium', 11, 12, 'Partner', '11-50', 'Professional Services', 11000, 'Form: intake automation for new client enquiries.'],
];

export function buildSeed(now = Date.now()) {
  const at = (daysAgo, hour = 10, min = 0) => {
    const d = new Date(now - daysAgo * DAY);
    if (daysAgo > 0) d.setHours(hour, min, 0, 0);
    return d.toISOString();
  };

  const leads = LEADS.map((row, i) => {
    const [name, email, company, phone, source, status, priority, daysAgo, contacted, jobTitle, companySize, industry, dealValue, note] = row;
    const createdAt = daysAgo === 0 ? new Date(now - 45 * 60000).toISOString() : at(daysAgo, 9 + (i % 7), (i * 13) % 60);
    const lead = {
      id: `lead_${String(i + 1).padStart(3, '0')}`,
      name,
      email,
      company,
      phone,
      source,
      status,
      priority,
      createdAt,
      lastContactedAt: contacted == null ? null : at(contacted, 11 + (i % 5), (i * 7) % 60),
      jobTitle,
      companySize,
      industry,
      dealValue,
      notes: note ? [{ id: `note_seed_${i}`, text: note, createdAt, author: 'Alex Morgan' }] : [],
      qualification: null,
      followUpDate: null,
    };
    // Pre-qualify the more mature leads so the CRM looks lived-in.
    if (['Qualified', 'Proposal', 'Converted'].includes(status)) {
      lead.qualification = { ...scoreLead(lead), at: at(Math.max(daysAgo - 2, 1)) };
    }
    return lead;
  });

  const byName = Object.fromEntries(leads.map((l) => [l.name, l]));

  const workflows = [
    {
      id: 'wf_welcome',
      name: 'New Lead Welcome',
      description: 'Greets every new lead with a personalised welcome email and books a follow-up call task.',
      active: false,
      trigger: { type: 'new_lead', config: {} },
      conditions: [],
      actions: [
        { id: 'a1', type: 'generate_email', config: { template: 'welcome' } },
        { id: 'a2', type: 'create_task', config: { title: 'Welcome call with {{first_name}} ({{company}})', dueInDays: 2 } },
      ],
      createdAt: at(60),
      lastRunAt: at(21, 14, 5),
      runCount: 9,
    },
    {
      id: 'wf_high_value',
      name: 'High-Value Lead Qualification',
      description: 'Fast-tracks strong-fit leads: flags them high priority and drafts a tailored outreach message.',
      active: true,
      trigger: { type: 'new_lead', config: {} },
      conditions: [{ id: 'c1', type: 'score_gt', config: { value: 75 } }],
      actions: [
        { id: 'a1', type: 'assign_priority', config: { priority: 'High' } },
        { id: 'a2', type: 'generate_email', config: { template: 'outreach' } },
      ],
      createdAt: at(58),
      lastRunAt: at(0, 0, 0),
      runCount: 14,
    },
    {
      id: 'wf_dormant',
      name: 'Dormant Lead Recovery',
      description: 'Finds open leads nobody has contacted in 7+ days and queues a re-engagement message and task.',
      active: true,
      trigger: { type: 'no_contact', config: { days: 7 } },
      conditions: [],
      actions: [
        { id: 'a1', type: 'generate_email', config: { template: 'reengagement' } },
        { id: 'a2', type: 'create_task', config: { title: 'Re-engage {{first_name}} — check if priorities changed', dueInDays: 1 } },
      ],
      createdAt: at(55),
      lastRunAt: at(3, 8, 0),
      runCount: 6,
    },
    {
      id: 'wf_proposal',
      name: 'Proposal Follow-through',
      description: 'When a deal moves to Proposal, logs a CRM note and schedules a check-in so no proposal goes cold.',
      active: true,
      trigger: { type: 'status_changed', config: { toStatus: 'Proposal' } },
      conditions: [{ id: 'c1', type: 'email_exists', config: {} }],
      actions: [
        { id: 'a1', type: 'add_note', config: { text: 'Proposal stage reached — check-in scheduled automatically.' } },
        { id: 'a2', type: 'create_task', config: { title: 'Check in on proposal with {{first_name}}', dueInDays: 3 } },
      ],
      createdAt: at(40),
      lastRunAt: at(7, 16, 20),
      runCount: 4,
    },
  ];

  const wfName = Object.fromEntries(workflows.map((w) => [w.id, w.name]));

  const log = (id, wf, triggerLabel, lead, status, daysAgo, hour, steps, mode = 'automatic', note) => ({
    id,
    workflowId: wf,
    workflowName: wf ? wfName[wf] : 'Campaign: Q4 Webinar Recap',
    trigger: triggerLabel,
    mode,
    leadId: lead?.id || null,
    leadName: lead?.name || '—',
    status,
    actionSummary: steps.map((s) => s.label).join(' → '),
    steps,
    conditions: [],
    note: note || steps.find((x) => x.status === 'failed' || x.status === 'pending')?.detail,
    startedAt: at(daysAgo, hour, (daysAgo * 17) % 60),
    durationMs: 180 + ((daysAgo * 97) % 900),
  });
  const ok = (label, detail) => ({ label, status: 'success', detail });

  const logs = [
    log('log_s01', 'wf_high_value', 'New lead created', byName['Aisha Diallo'], 'success', 0, 0, [
      ok('Assign lead priority', 'Priority confirmed as High (score above 75).'),
      ok('Generate personalised email', 'Outreach draft created: "A faster ramp for Sahel Pharma\'s new sales team".'),
    ]),
    log('log_s02', 'wf_dormant', 'No contact for 7+ days', byName['Thomas Müller'], 'success', 3, 8, [
      ok('Generate personalised email', 'Re-engagement draft created.'),
      ok('Create follow-up task', 'Task "Re-engage Thomas" due tomorrow.'),
    ]),
    log('log_s03', 'wf_dormant', 'No contact for 7+ days', byName['Grace Mensah'], 'success', 3, 8, [
      ok('Generate personalised email', 'Re-engagement draft created.'),
      ok('Create follow-up task', 'Task "Re-engage Grace" due tomorrow.'),
    ]),
    log('log_s04', 'wf_high_value', 'New lead created', byName['Rachel Kim'], 'skipped', 2, 15, [], 'automatic', 'Condition not met: lead score is not greater than 75.'),
    log('log_s05', null, 'Campaign simulation', byName['Priya Raman'], 'pending', 1, 17, [
      { label: 'Sync recipient to Google Sheets', status: 'pending', detail: 'Waiting for Google Sheets authorization. Connect the integration in Settings to complete.' },
    ], 'campaign'),
    log('log_s06', 'wf_proposal', 'Status changed → Proposal', byName['Ibrahim Sule'], 'success', 7, 16, [
      ok('Add CRM note', 'Note added to lead timeline.'),
      ok('Create follow-up task', 'Task "Check in on proposal with Ibrahim" due in 3 days.'),
    ]),
    log('log_s07', 'wf_high_value', 'New lead created', byName['Fatima Al-Sayed'], 'success', 20, 10, [
      ok('Assign lead priority', 'Priority set to High (score above 75).'),
      ok('Generate personalised email', 'Outreach draft created.'),
    ]),
    log('log_s08', 'wf_welcome', 'New lead created', byName['Chloe Adams'], 'success', 8, 12, [
      ok('Generate personalised email', 'Welcome draft created.'),
      ok('Create follow-up task', 'Task "Welcome call with Chloe" due in 2 days.'),
    ]),
    log('log_s09', 'wf_proposal', 'Status changed → Proposal', byName['Hannah Cole'], 'success', 26, 11, [
      ok('Add CRM note', 'Note added to lead timeline.'),
      ok('Create follow-up task', 'Task created.'),
    ]),
    log('log_s10', 'wf_welcome', 'New lead created', byName['Oliver Grant'], 'failed', 9, 9, [
      ok('Generate personalised email', 'Welcome draft created.'),
      { label: 'Create follow-up task', status: 'failed', detail: 'Template variable {{company}} has no value on this lead. Add it to the lead and re-run.' },
    ]),
    log('log_s11', 'wf_dormant', 'No contact for 7+ days', byName['James Okafor'], 'success', 4, 8, [
      ok('Generate personalised email', 'Re-engagement draft created.'),
      ok('Create follow-up task', 'Task created.'),
    ]),
  ];

  const task = (id, leadName, title, dueDays, status, source, createdDays) => ({
    id,
    leadId: byName[leadName].id,
    title,
    dueAt: new Date(now + dueDays * DAY).toISOString(),
    status,
    source,
    createdAt: at(createdDays),
    completedAt: status === 'done' ? at(Math.max(createdDays - 1, 0), 15) : null,
  });

  const tasks = [
    task('task_s01', 'Chloe Adams', 'Welcome call with Chloe (Northstar Health)', -6, 'done', 'New Lead Welcome', 8),
    task('task_s02', 'Thomas Müller', 'Re-engage Thomas — check if priorities changed', -2, 'open', 'Dormant Lead Recovery', 3),
    task('task_s03', 'Ibrahim Sule', 'Check in on proposal with Ibrahim', -4, 'done', 'Proposal Follow-through', 7),
    task('task_s04', 'Hannah Cole', 'Check in on proposal with Hannah', -23, 'done', 'Proposal Follow-through', 26),
    task('task_s05', 'Fatima Al-Sayed', 'Send SOC 2 pack and book CFO demo', 1, 'open', 'Manual', 2),
    task('task_s06', 'James Okafor', 'Re-engage James — check if priorities changed', -3, 'open', 'Dormant Lead Recovery', 4),
    task('task_s07', 'Daniel Whitford', 'Prepare Q1 rollout plan for Harborline', 3, 'open', 'Manual', 5),
    task('task_s08', 'Elena Petrova', 'Kick-off onboarding session', -40, 'done', 'Manual', 45),
    task('task_s09', 'Lucas Moreira', 'Pitch client-reporting add-on', -10, 'done', 'Manual', 14),
    task('task_s10', 'Amaka Eze', 'Follow up on pricing for 3 seats', 0, 'open', 'Manual', 2),
    task('task_s11', 'Zainab Bello', 'Quarterly success check-in', -14, 'done', 'Manual', 20),
  ];

  const messages = [
    {
      id: 'msg_s01',
      leadId: byName['Aisha Diallo'].id,
      kind: 'outreach',
      subject: "A faster ramp for Sahel Pharma's new sales team",
      body:
        "Hi Aisha,\n\nElena mentioned you have a new commercial team starting next month — congratulations. Most VP Commercial leaders we work with lose the first 4–6 weeks of a new team to manual follow-ups and messy handovers.\n\nFlowPilot automates the busywork from day one: every enquiry is scored, routed and followed up automatically, so your reps can focus on conversations.\n\nWould a 20-minute walkthrough this Thursday or Friday work?\n\nBest,\nAlex Morgan\nGrowth Lead, Meridian Growth Studio",
      createdAt: logs[0].startedAt,
      workflowName: 'High-Value Lead Qualification',
      status: 'draft',
    },
  ];

  const activity = [
    { id: 'act_s1', type: 'lead_created', text: 'New lead Aisha Diallo (Sahel Pharma) added from Referral', leadId: byName['Aisha Diallo'].id, at: byName['Aisha Diallo'].createdAt },
    { id: 'act_s2', type: 'lead_created', text: 'Tunde Bakare submitted the demo request form', leadId: byName['Tunde Bakare'].id, at: byName['Tunde Bakare'].createdAt },
    { id: 'act_s3', type: 'status_changed', text: 'Amaka Eze moved to Proposal', leadId: byName['Amaka Eze'].id, at: at(2, 13) },
    { id: 'act_s4', type: 'task_completed', text: 'Follow-up completed: Check in on proposal with Ibrahim', leadId: byName['Ibrahim Sule'].id, at: at(4, 15) },
    { id: 'act_s5', type: 'qualified', text: 'Fatima Al-Sayed qualified as Hot — sales-ready', leadId: byName['Fatima Al-Sayed'].id, at: at(18, 10) },
    { id: 'act_s6', type: 'status_changed', text: 'Elena Petrova converted — annual plan signed', leadId: byName['Elena Petrova'].id, at: at(6, 12) },
  ];

  const campaigns = [
    {
      id: 'cmp_s01',
      name: 'Q4 Webinar Recap',
      goal: 'nurture',
      tone: 'friendly',
      audience: { mode: 'filter', status: 'All', source: 'Webinar', priority: 'All' },
      leadIds: leads.filter((l) => l.source === 'Webinar').map((l) => l.id),
      subject: '{{first_name}}, your webinar recap + 3 automations to steal',
      body:
        "Hi {{first_name}},\n\nThanks for joining our automation webinar. Here are the three workflows teams like {{company}} set up first:\n\n1. Instant welcome + follow-up task for every new enquiry\n2. Auto-prioritising high-value leads\n3. Re-engaging anyone who goes quiet for 7 days\n\nWant me to set one up with you? Reply and I'll book 15 minutes.\n\nCheers,\n{{sender_name}}",
      status: 'Simulated',
      createdAt: at(5),
      updatedAt: at(1, 17),
      simulatedAt: at(1, 17),
      results: { total: 3, delivered: 3, skipped: 0 },
    },
    {
      id: 'cmp_s02',
      name: 'Proposal-stage nudge',
      goal: 'convert',
      tone: 'professional',
      audience: { mode: 'filter', status: 'Proposal', source: 'All', priority: 'All' },
      leadIds: leads.filter((l) => l.status === 'Proposal').map((l) => l.id),
      subject: 'Next steps for {{company}}',
      body:
        "Hi {{first_name}},\n\nI wanted to make sure you have everything you need to review the proposal for {{company}}. If it helps, I can walk your team through the rollout plan and answer any open questions.\n\nWould a short call this week be useful?\n\nKind regards,\n{{sender_name}}",
      status: 'Draft',
      createdAt: at(1),
      updatedAt: at(1),
      simulatedAt: null,
      results: null,
    },
  ];

  return {
    version: 1,
    seededAt: new Date(now).toISOString(),
    leads,
    workflows,
    logs,
    tasks,
    messages,
    activity,
    campaigns,
    chat: [],
    settings: {
      businessName: 'Meridian Growth Studio',
      senderName: 'Alex Morgan',
      senderRole: 'Growth Lead',
      offer: 'sales and marketing automation',
    },
    integrations: {
      anthropic: 'available',
      gohighlevel: 'none',
      zapier: 'available',
      make: 'available',
      gmail: 'none',
      sheets: 'demo',
      supabase: 'available',
    },
  };
}
