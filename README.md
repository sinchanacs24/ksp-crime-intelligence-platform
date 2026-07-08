# KSP Crime Intelligence Platform
### Karnataka State Police — Datathon 2026 | Problem Statement 1

**Live app:** https://ksp-crime-intel-web-thybuzxq.onslate.in

An agentic, bilingual (English/Kannada), conversational AI and crime analytics platform for investigators, analysts, and senior officers of the Karnataka State Police — built to run entirely on Zoho Catalyst per the hackathon's mandatory deployment requirement.

**Status: All 11 modules functional, including a working end-to-end AI Assistant (text + voice, English/Kannada) against a live seeded dataset of 250 synthetic FIR cases.**

---

## What's in this repository

    ksp-datathon-2026/
    ├── catalyst.json                  # Root Catalyst project config (functions, client, slate)
    ├── .env.example                   # Environment variables you need to fill in
    ├── database/
    │   ├── schema.sql                 # Full DDL reference — ER-diagram tables + extended schema
    │   └── seed-data-generator/       # Synthetic FIR data generator (no real KSP data used)
    ├── functions/
    │   ├── api/                       # Main Catalyst Advanced I/O function (Express app, 30s limit)
    │   │   └── src/
    │   │       ├── config/            # Constants, DB helpers
    │   │       ├── middleware/        # Auth, RBAC, audit, rate-limit, validation, errors
    │   │       ├── repositories/      # ZCQL data access layer
    │   │       ├── services/          # Business logic (case, accused, victim, network, financial, risk, forecast, chat)
    │   │       ├── ai/                # QuickML LLM client, RAG client (unconfigured), prompts
    │   │       └── routes/            # Express route handlers, one file per module
    │   ├── seed-job/                  # Job Function — seeds the database (15-min budget)
    │   ├── forecast-job/              # Job Function — crime forecast (cron not yet scheduled in console)
    │   └── chat-job/                  # Job Function — runs the AI Assistant's LLM call async
    │                                   # (duplicated, not shared, from functions/api/src — see Design notes)
    ├── client/                        # React + TypeScript + Vite + Tailwind frontend (Catalyst Slate)
    │   └── src/
    │       ├── pages/                 # One page per module (Dashboard, FIR Search, AI Assistant, etc.)
    │       ├── components/            # Shared UI (Layout, Sidebar, Navbar, RiskBadge, StatCard)
    │       ├── contexts/              # AuthContext, LanguageContext
    │       └── services/api.ts        # Typed API client
    └── docs/
        ├── deployment-guide.md
        └── api-spec.md

## How the problem statement maps to this codebase

| Problem statement requirement | Where it lives |
|---|---|
| Conversational AI in English/Kannada with memory | `functions/chat-job/src/services/chat.service.js` + `ai/prompts.js` |
| Voice interaction | Browser-native Web Speech API, wired directly into `client/src/pages/AiAssistant.tsx` (`handleVoiceToggle`, `speakText`) — see Design notes on why this replaced the originally-planned Zia voice pipeline |
| Save conversation as PDF | `utils/pdfExport.js` + `reports.routes.js` (HTML handed to Catalyst SmartBrowz) |
| Criminal network analysis | `network.repository.js`, `network.service.js`, `client/src/pages/NetworkAnalysis.tsx` |
| Crime pattern & trend analytics | `caseMaster.service.js` trend/heatmap methods, `client/src/pages/Analytics.tsx` |
| Sociological crime insights | `victim.service.js`, `client/src/pages/VictimSearch.tsx` |
| Offender profiling & risk scoring | `accused.service.js`, `riskScoring.service.js` |
| Investigator decision support (summaries, timelines) | `timeline.service.js` |
| Financial crime / money trail | `financial.repository.js`, `financial.service.js`, `client/src/pages/FinancialCrime.tsx` |
| Crime forecasting | `forecast.service.js` + `functions/forecast-job` |
| Explainable AI | `SourceRefsJSON` on every chat message; `ExplanationJSON` on every risk score; `_explanation` on every forecast |
| RBAC + audit logs | `rbac.middleware.js`, `audit.middleware.js`, `Permission`/`AuditLog` tables |

## Getting started (local + Catalyst)

### 1. Prerequisites
- Node.js 20
- A Zoho Catalyst account and project (create one at https://catalyst.zoho.com)
- Catalyst CLI: `npm install -g zcatalyst-cli`

### 2. Set up the Catalyst project

    catalyst init
    # select: this repo's root as project directory
    # select components: Functions (Advanced I/O + Job), Data Store, Authentication, Slate

After running `catalyst functions:add` for any new function, always run `cat catalyst.json` to confirm the `functions.targets` array actually includes it — the CLI sometimes reports success without updating this file.

### 3. Create the database tables
Run the DDL in `database/schema.sql` against your Catalyst Data Store via the console's table builder — Catalyst Data Store doesn't accept raw SQL DDL directly, so use this file as the column/type reference while creating tables manually in the console.

### 4. Configure environment variables
Copy `.env.example` to `.env` and fill in:
- Catalyst project ID / org ID (Catalyst Console → Project Settings)
- QuickML LLM endpoint URL, and a Self Client's `client_id`/`client_secret`/`refresh_token` from `api-console.zoho.in` (Catalyst's newer console-managed "Connections" feature is not compatible with this SDK version — see Design notes)

Set these same values in **both** the Catalyst Console (Serverless → Functions → [function] → Configuration) **and** each function's local `catalyst-config.json` — the local file overwrites the console on every deploy, so keep them in sync manually. Each function folder has a `catalyst-config.json.example` showing the required shape.

### 5. Seed the database

    cd functions/seed-job
    npm install
    catalyst job:execute seed-job   # or trigger from the Catalyst console

This inserts all lookup tables, synthetic FIRs (default 250, tuned to stay under Catalyst's dev-environment record caps), and a baseline RBAC permission matrix.

### 6. Set up your own AppUser
The seed job does not create a Catalyst-authenticated login for you. After enabling Embedded Authentication in the console and signing up once, insert a matching `Employee` row and an `AppUser` row linking `CatalystAuthID` to your Catalyst Auth user_id, with `RoleID = 7` (Admin).

### 7. Run the backend locally

    cd functions/api
    npm install
    catalyst serve

### 8. Run the frontend locally

    cd client
    npm install
    cp ../.env.example .env
    npm run dev

### 9. Deploy

    catalyst deploy --only functions:api,functions:chat-job,functions:seed-job,functions:forecast-job
    catalyst deploy slate

## Design notes worth knowing before you extend this

- **The AI Assistant's LLM call runs in a dedicated Job Function (`chat-job`), not inside `api`.** QuickML's response time can exceed the Advanced I/O function's hard, non-configurable 30-second limit. The `api` function saves the user's message and returns immediately (202); `chat-job` (15-minute budget) does the actual LLM call and saves the reply; the frontend polls `GET /chat/conversations/:id/messages` until it appears. Job parameters must be read inside the job via `jobRequest.getAllJobParams()` — not `jobRequest.params`, which is a client-SDK-only shape that doesn't exist at job-execution time.
- **`functions/chat-job/src/` is a full duplicate of the relevant `functions/api/src/` files, not a shared import.** Catalyst functions can't share a `node_modules`/`src` tree across function directories. Any change to `chat.service.js`, `quickml.js`, or related AI modules must be manually applied to both copies or the two functions will silently drift out of sync.
- **QuickML's raw response shape is `{ response: "...", usage: {...} }`, not an OpenAI-style `choices[0].message.content`.** The model also emits its reasoning inline, terminated by a literal `</think>` tag before the final answer — strip everything up to and including `</think>` before saving/displaying the reply, or you'll show raw reasoning text to the user.
- **Voice interaction uses the browser's native Web Speech API (`SpeechRecognition` + `speechSynthesis`), not Catalyst Zia.** Catalyst Zia's SDK (`zcatalyst-sdk-node`, `lib/zia/zia.d.ts`) only exposes object detection, OCR, barcode scanning, face analysis, AutoML, and text analytics (sentiment/keywords/NER) — it does not offer speech-to-text, translation, or text-to-speech as a Catalyst platform capability. An earlier design assumed otherwise; the working implementation lives entirely client-side in `AiAssistant.tsx` (`handleVoiceToggle`, `speakText`), reusing the existing `/chat/message` endpoint with no backend changes.
- **All ZCQL queries are hand-built with `zcqlBuilder.js`'s `escapeValue`.** Never string-concatenate user input directly into a query.
- **ZCQL has no real `JOIN` support** across this schema (no columns are defined as Lookup-type). Cross-table data is fetched via separate single-table queries combined in JS using `fetchByIds()` in `config/db.js`.
- **Any Catalyst row lookup or update must use the row's real `ROWID`**, never a custom ID-looking column — passing anything else to `updateRow()` silently inserts a duplicate row instead of updating, and passing a non-existent custom column to a `WHERE` filter (e.g. searching a `ConversationID` column that was never populated) silently returns no results rather than erroring.
- **Risk scores and forecasts are deterministic weighted-factor / trend-slope models**, not neural nets — a deliberate choice to satisfy the Explainable AI requirement without a separate "explain the black box" layer.
- **The chat agent's intent classification is plain regex, not an LLM-driven router** — keeps latency low and behavior auditable, at the cost of flexibility (e.g. general "show me repeat offenders" phrasing may retrieve zero rows if it doesn't match a specific accused name).

## Known limitations (honest status, as of last testing)

- The `case_lookup` intent without a specific crime number sometimes returns an empty result set even though matching cases exist — worth revisiting `caseMaster.repository.js`'s `searchCases({}, ...)` path.
- Longer AI Assistant answers (especially in Kannada, which tokenizes less efficiently than English) can occasionally truncate if they exceed the configured `max_tokens` budget.
- `forecast-job`'s cron trigger has never been scheduled in the console — only the synchronous "Recompute Now" path (inside `api`) has been exercised.
- QuickML RAG (`ai/ragClient.js`) is unconfigured — the two required env vars are empty, and no Knowledge Base document has been created.
- Notification bell and user profile icons in the navbar are visual only — no backend or interaction is wired up behind either.
- Native Catalyst session-cookie authentication doesn't work across the Slate/API domain split; a documented `DEMO_MODE_SECRET` header bypass is used instead (see `auth.middleware.js` comments) — acceptable for a hackathon demo, not production-grade.

## What's NOT included (and why)

- Real KSP data — the briefing explicitly states none will be provided; `database/seed-data-generator` produces schema-accurate synthetic data instead.
- A working Catalyst embedded-auth script in `Login.tsx` with your own client ID/org domain — must be copied from your own Catalyst Console once you enable Embedded Authentication.
