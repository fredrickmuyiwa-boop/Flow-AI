# FlowPilot AI

**Automate the busywork. Focus on growth.**

FlowPilot AI is a working prototype of an AI-powered business automation platform — a lightweight blend of a CRM (HubSpot), a workflow engine (Zapier) and an AI business assistant. It runs entirely in the browser with realistic demo data, needs **no API keys**, and is structured so real integrations (Claude, Gmail, Supabase…) can be plugged in later without touching the UI.

---

## Features

| Area | What works |
|---|---|
| **Overview** | Live KPIs (total / qualified leads, active workflows, follow-ups completed, conversion rate, automation success), lead-acquisition chart, pipeline breakdown, activity feed, active automations, needs-attention list, quick actions. All derived from state — updates instantly. |
| **Contacts & Leads** | Add / edit / delete leads with validation, search, filter by status / source / priority, sort, inline status changes, CSV export, lead profiles with notes timeline, priority, follow-up tasks, AI-drafted emails and automation history. |
| **AI qualification** | Explainable fit model scoring authority, company fit, budget, source quality, contactability, buying intent and recency → score, category, reasoning and recommended next action. |
| **Automation Studio** | Visual builder (trigger → conditions → actions) with inspector, reordering and validation. Activate / deactivate / duplicate / delete / run on demand. Event triggers fire automatically; scan triggers run via “Run scheduled checks”. Per-run results with timestamps. |
| **FlowPilot Copilot** | Conversational assistant grounded in live CRM data: pipeline analysis, top prospects, email drafting (save to CRM), conversion recommendations, today’s summary, leads needing attention, lead summaries, workflow and source reports. |
| **Campaigns** | Create campaigns, target leads by filters or manual pick, generate copy (goal × tone), per-recipient preview with merge tags, save drafts, **simulated** send with live pending → success/failed logs. |
| **Activity Logs** | Full audit trail: workflow, trigger, actions, status (success / pending / skipped / failed), timestamp, duration, related lead. Filterable; detail drawer with step-by-step results and raw record. |
| **Settings** | Workspace & sender details (used in generated copy), integration cards (Claude, GoHighLevel, Zapier, Make, Gmail, Google Sheets, Supabase) with honest connection states, JSON export, reset demo data. |
| **Guided demo** | “Run Demo” walks through the 11-step journey in ~2 minutes by driving the real app. |

Preconfigured workflows: **New Lead Welcome**, **High-Value Lead Qualification** (score > 75), **Dormant Lead Recovery** (7 days without contact) and **Proposal Follow-through**.

---

## Run locally

Requires Node.js 18.18+.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build → dist/
npm run preview    # serve the build locally
```

Data persists in `localStorage` (key `flowpilot.state.v1`). Use **Settings → Reset demo data** to start fresh.

## Deploy to Vercel

1. Push this folder to a GitHub repository.
2. In Vercel: **Add New → Project → Import** the repo. The framework is auto-detected as Vite; `vercel.json` sets the build command (`npm run build`) and output (`dist`).
3. Click **Deploy**. No environment variables are required.

CLI alternative:

```bash
npm i -g vercel
vercel          # preview deployment
vercel --prod   # production URL to share
```

Routing uses URL hashes (`/#/leads`), so deep links work on any static host.

## Environment variables (all optional)

See `.env.example`.

| Variable | Where | Purpose |
|---|---|---|
| `VITE_AI_MODE` | Build / frontend | `local` (default) or `claude`. Only a mode switch — never a secret. |
| `ANTHROPIC_API_KEY` | **Server only** (Vercel env) | Read exclusively by `api/copilot.js`. Never bundled into the frontend. |
| `ANTHROPIC_MODEL` | Server only | Optional model override for the Copilot backend. |

To enable Claude for Copilot: set `ANTHROPIC_API_KEY` (and optionally `ANTHROPIC_MODEL`) in Vercel → Project → Settings → Environment Variables, set `VITE_AI_MODE=claude`, and redeploy. If the backend is unreachable or unconfigured, Copilot automatically falls back to local intelligence and says so.

---

## Simulated vs real — integration boundaries

FlowPilot is explicit about what is real and what is simulated.

**Real (fully functional in the browser)**
- CRM data, validation, search/filter, persistence (LocalStorage).
- The automation engine: triggers, condition evaluation, actions, audit logs.
- Qualification scoring, email/summary generation and Copilot answers — computed deterministically from your data.

**Simulated / not connected**
- **Email sending.** Workflows and Copilot create *drafts* stored in the CRM, labelled “Draft · not sent”. Campaign “Simulate send” renders each personalised email and logs the outcome, but delivers nothing.
- **Third-party integrations.** “Connected (demo)” is a label inside the workspace only; no credentials are used and no data leaves the browser. Each card lists what a real connection needs (API keys, OAuth scopes, webhooks).
- **Scheduler.** Scan triggers (no contact for N days, follow-up due) run when you click **Run scheduled checks** or **Run now** — a production deployment would invoke the same engine from a cron job (e.g. Vercel Cron).
- **AI.** Local mode is a transparent rule-based model, not an LLM, and the UI labels it “Local intelligence (demo)”. Claude mode is available via the secure backend described above.

---

## Architecture

```
api/
  copilot.js              Vercel serverless function — secure Claude proxy (key stays server-side)
src/
  main.jsx, App.jsx       Entry, providers, hash routes, app shell
  index.css               Tailwind v4 theme (navy ink scale, violet→blue brand, shadows)
  data/
    constants.js          Statuses, sources, priorities, style maps
    seed.js               Realistic demo dataset generated relative to “now”
  store/
    AppStore.jsx          Single persisted store + all actions (CRUD, runs, campaigns, chat)
    UIContext.jsx         Global “Add lead” form and run notifications
  engine/
    catalog.js            Trigger / condition / action definitions & config schemas
    automationEngine.js   Pure execution engine: targets, conditions, actions, logs, validation
  logic/
    qualification.js      Explainable lead-scoring model
    messaging.js          Personalised email, campaign copy and lead summaries
    metrics.js            Dashboard analytics and “needs attention” ranking
  ai/
    copilot.js            Local intent router over live CRM state
    provider.js           AI boundary: local ↔ Claude backend (no keys in frontend)
  components/
    ui/                   Button, Badge, Modal/Drawer, Toast, Field, Markdown, misc
    layout/               Sidebar, Topbar, Logo, ErrorBoundary
    leads/                LeadForm (shared add/edit with validation)
    automation/           FlowChips, RunDialog, RunResult, block icons
    demo/                 DemoContext (scripted tour driving real actions), DemoGuide panel
  pages/                  Overview, Leads, LeadDetail, AutomationStudio, WorkflowBuilder,
                          Copilot, Campaigns, ActivityLogs, Settings, NotFound
```

Key design choices:
- **Pure engine.** `executeWorkflow(state, workflow, ctx) → { state, logs }` has no side effects, which makes it testable and portable to a server or queue worker.
- **Provider boundary.** The UI only calls `askCopilot()` / `qualifyLead()`; swapping in Claude is a configuration change, not a rewrite.
- **Event-driven automation.** Creating a lead or changing status dispatches events to every active workflow listening for them; manual runs use the same code path.
- **Duplicate protection.** Scan triggers skip leads the workflow already processed successfully within the window.

## Guided demo script (2–3 minutes)

Click **Run Demo** (top bar or sidebar). Each “Next” performs the step for you:

1. Dashboard overview → 2. Existing leads → 3. Add *Ngozi Adeyemi* (High-Value workflow fires automatically) → 4. Run AI qualification → 5. Open Automation Studio → 6. Activate *New Lead Welcome* → 7. Execute it for Ngozi → 8. View the generated personalised email → 9. View the follow-up task → 10. Inspect the execution log → 11. Ask Copilot to summarise Ngozi.

Replay at any time; the demo reuses the same lead rather than duplicating it.
