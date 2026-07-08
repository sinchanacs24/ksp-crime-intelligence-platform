# Deployment Guide — Catalyst

This project deploys exclusively to Zoho Catalyst, per the hackathon's mandatory deployment requirement (no exceptions, per the supplied "Supported Features & Services" table).

## 1. Create the Catalyst project
1. Go to https://catalyst.zoho.com and create a new project (e.g. `ksp-crime-intel`).
2. Note the **Project ID** and **Org ID** from Project Settings — you'll need both for environment variables.

## 2. Install the CLI and initialize
```bash
npm install -g zcatalyst-cli
catalyst login
cd ksp-datathon-2026
catalyst init
```
When prompted, select:
- **Functions**: Advanced I/O (`api`) and Job (`seed-job`, `forecast-job`)
- **Client**: Slate, pointed at `client/`
- **Data Store**: enabled
- **Authentication**: enabled, Embedded mode

## 3. Create tables in Data Store
Catalyst Data Store tables are created through the console's table builder (or `catalyst functions:deploy` won't create them for you). Use `database/schema.sql` as your column-by-column reference:
1. Console → Data Store → Create Table
2. For each `CREATE TABLE` block in `schema.sql`, add matching columns with the closest Catalyst type (Text/Varchar for VARCHAR, BigInt for INT primary keys if you expect >2^31 rows — INT-equivalent otherwise, DateTime for DATE/DATETIME, Double for DECIMAL).
3. Recreate the foreign-key relationships as **Lookup** columns where Catalyst supports it, or leave as plain integer columns and enforce referential integrity at the application layer (this codebase's repositories already assume application-level integrity).
4. Create tables in dependency order: `State` → `District` → `Unit` → ... → `CaseMaster` → everything referencing `CaseMaster`.

## 4. Enable QuickML
1. Console → QuickML → LLM Serving → note the GLM 4.7 endpoint URL.
2. Console → QuickML → RAG → create a knowledge base, upload a reference document (e.g. standing orders or a mock case-law PDF), note its Document ID and the RAG query endpoint URL.
3. Console → Cloudscale → Connections → Create Connection → select Catalyst → QuickML, scope `quickml.deployment.READ`. Name it exactly `quickml` (or update `ai/quickml.js`'s `getConnection('quickml')` call to match whatever name you choose).

## 5. Enable Zia Services (voice)
1. Console → Zia Services → enable Speech-to-Text, Translation, and Text-to-Speech.
2. Note each endpoint URL for the `ZIA_*_ENDPOINT` environment variables used in `ai/voicePipeline.js`.

## 6. Set environment variables
Either via the console (Functions → api → Configuration → Environment Variables) or CLI:
```bash
catalyst functions:config:set api QUICKML_LLM_ENDPOINT=... QUICKML_RAG_ENDPOINT=... \
  QUICKML_RAG_DOCUMENT_ID=... QUICKML_PROJECT_ID=... QUICKML_ORG_ID=... \
  ZIA_SPEECH_TO_TEXT_ENDPOINT=... ZIA_TRANSLATE_ENDPOINT=... ZIA_TEXT_TO_SPEECH_ENDPOINT=...
```

## 7. Set up Embedded Authentication
1. Console → Authentication → Embedded → enable, add a social login provider (Zoho, Google, etc.) if desired, get the client ID/secret from that provider's console and paste into Catalyst's config.
2. Copy the generated `LoginWidget` initialization snippet into `client/src/pages/Login.tsx`'s `useEffect`, replacing the commented placeholder.

## 8. CORS / whitelisting
Console → Cloudscale → Authentication → Whitelisting → add your Slate frontend's URL, enable CORS. Without this step, the frontend's API calls will fail with a CORS error (this is the single most common issue reported in the hands-on session's Q&A).

## 9. Seed the database
```bash
cd functions/seed-job && npm install
catalyst job:execute seed-job
```
Watch the job logs in the console; it should report row counts for each table on success.

## 10. Bootstrap your own admin account
1. Sign up once through the deployed Slate frontend's login page (uses the Embedded Authentication you configured in step 7).
2. Console → Authentication → Users → copy your `user_id`.
3. Console → Data Store → Employee → insert a row for yourself.
4. Console → Data Store → AppUser → insert a row: `EmployeeID` = the row you just created, `CatalystAuthID` = your `user_id`, `RoleID` = 7 (Admin).

## 11. Deploy everything
```bash
catalyst deploy
```
This builds `client/` (via its `npm run build`), uploads the built `dist/` to Slate, and deploys both functions.

## 12. Schedule the nightly forecast job
Console → Cloudscale → Job Scheduling → Create Schedule → function `forecast-job`, cron `0 2 * * *` (matches `catalyst.json`'s `job_scheduling` block, which is a documentation reference — the actual schedule must be created in the console or via `catalyst job:schedule` CLI command).

## Troubleshooting
- **"No privileges to perform this action"** on any write → check Cloudscale → Data Store → Scopes and Permissions for that table; the demo Catalyst app in the hands-on session required explicitly granting Insert/Update to Application Users before seeding worked.
- **CORS errors** → revisit step 8; this was the most common issue raised live in the Q&A.
- **QuickML 401/403 errors** → the Connection (step 4.3) may be missing or misnamed; re-check `getConnection('quickml')` in `ai/quickml.js` matches your connection's exact name.
- **Function timeout at 30s** → you're likely calling something that should be a Job Function instead (see README's "Design notes" section).
