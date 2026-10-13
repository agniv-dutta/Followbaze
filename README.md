# Followbaze

A lightweight CRM for sales representatives to **manage leads, track discussions,
update lead status, and schedule follow-ups** — on a single screen.

Built as the Pravar AI full-stack assessment: a real, working end-to-end
application (FastAPI + Next.js), with server-side validation, persisted data,
automated tests, migrations, seed data and Docker support.

> Everything runs locally with no external services. There is **no LLM or
> third-party dependency** in the product — AI was used only as a development aid.

---

## 1. Key features

- **Single-screen dashboard** — leads are never a separate route; clicking a lead
  opens an accessible dialog.
- **Follow-up intelligence** — leads are grouped into mutually exclusive
  **Overdue**, **Due today**, **Upcoming** and **Unscheduled** states, with
  overdue follow-ups called out in red.
- **Pipeline status** badges with the six canonical statuses: `New`, `Contacted`,
  `Qualified`, `Proposal Sent`, `Won`, `Lost`.
- **Search + status filter** that work together, preserving grouping/order.
- **Timeline dialog** — full discussion history (newest first), a composer to add
  a note, an optional next follow-up, and inline status changes.
- **Atomic writes** — a discussion and its follow-up update commit in one
  transaction. Adding a note without a follow-up **keeps** the existing reminder.
- **Add lead dialog**, loading skeletons, empty/no-results states and error
  handling with **no false success messages** (input is preserved on failure).
- **Backend** with validation, consistent error envelopes, CORS, N+1-free queries,
  UTC storage, and Alembic migrations.
- **Tests**: backend (pytest), frontend (Vitest + Testing Library), and true
  end-to-end (Playwright) against a real API.

---

## 2. Architecture and technology choices

| Layer     | Choice | Notes |
|-----------|--------|-------|
| Frontend  | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 3 | Reusable components, centralised typed API client, dialogs via portal |
| Backend   | FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic | Services separated from HTTP routes; centralised error handling |
| Database  | SQLite (dev) | Any SQLAlchemy URL works; UTC storage via a custom `UTCDateTime` column type |
| Testing   | pytest + TestClient, Vitest + React Testing Library, Playwright | E2E uses an isolated `e2e.db`, never mocked |

**Separation of concerns:** HTTP routers → services (business logic + persistence)
→ models. The frontend keeps presentation components separate from API calls
(`lib/api.ts`) and business logic (`lib/followUp.ts`, `lib/dates.ts`).

**Timezone & correctness:** timestamps are stored and exchanged in **UTC** and
displayed in the configured app timezone (default `Asia/Kolkata`). "Due today"
uses local calendar boundaries; "overdue" compares real instants, so a future
appointment is never flagged overdue.

---

## 3. Repository structure

```
Followbaze/
├── backend/
│   ├── app/
│   │   ├── api/routes/          # health, leads, discussions routers
│   │   ├── core/                # config, errors, timezone, logging
│   │   ├── db/                  # base, session, UTCDateTime type
│   │   ├── models/              # Lead, Discussion, statuses
│   │   ├── schemas/             # Pydantic request/response models
│   │   ├── services/            # lead_service, discussion_service
│   │   └── main.py              # app factory
│   ├── alembic/                 # migration environment + versions
│   ├── scripts/                 # seed.py, serve_e2e.py
│   ├── tests/                   # pytest suite
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/                 # layout, page, globals.css
│   │   ├── components/          # AppHeader, ui primitives (Modal, badges…)
│   │   ├── features/
│   │   │   ├── leads/           # dashboard, dialogs, hooks, sections
│   │   │   └── discussions/     # timeline, composer
│   │   ├── lib/                 # api client, followUp, dates, config, useNow
│   │   └── types/               # shared domain types
│   ├── e2e/                     # Playwright specs
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

## 4. Prerequisites

- **Python 3.11+**
- **Node.js 20+** (developed on 22) and npm
- **Docker** (optional, for the Compose workflow)
- (Optional) Playwright browsers for E2E: `npx playwright install chromium`

---

## 5. Environment configuration

Copy `.env.example` to `.env` and adjust. Key variables:

| Variable | Default | Purpose |
|----------|---------|---------|
| `APP_ENV` | `development` | Runtime environment |
| `DATABASE_URL` | `sqlite:///./followbaze.db` | Database connection |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated allowed browser origins |
| `APP_TIMEZONE` | `Asia/Kolkata` | Timezone for "today" grouping / seed |
| `LOG_LEVEL` | `INFO` | Logging level |
| `AUTO_CREATE_TABLES` | `true` | Dev convenience; set `false` to rely on migrations |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8000` | API base URL used by the browser |
| `NEXT_PUBLIC_APP_TIMEZONE` | `Asia/Kolkata` | Frontend timezone for grouping/display |

> `NEXT_PUBLIC_*` values are inlined **at build time** and must be reachable from
> the **browser** (never a Docker-internal hostname).

---

## 6. Local setup

```powershell
# From the repository root
# --- Backend ---
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1        # Windows PowerShell
# source .venv/bin/activate         # macOS / Linux
pip install -r requirements.txt
alembic upgrade head                # create the schema (source of truth)
python -m scripts.seed              # load demo data (idempotent)

# --- Frontend (new terminal) ---
cd frontend
npm install
```

## 7. Database migrations

```powershell
cd backend
alembic upgrade head                # apply migrations
alembic revision --autogenerate -m "message"   # create a new migration
alembic downgrade -1                # roll back one revision
```

## 8. Seeding

```powershell
cd backend
python -m scripts.seed              # idempotent: skips existing seed leads
python -m scripts.seed --reset      # delete ALL leads, then reseed
```

The seed creates 6 leads covering every status, a lead with no discussions, a lead
with multiple discussions, and follow-ups that are **due today, overdue, in the
future, and unscheduled**. Dates are relative to the run time so the demo stays
valid on any day. Re-running without `--reset` never duplicates records.

## 9. Backend startup

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
# Interactive docs: http://localhost:8000/docs
```

## 10. Frontend startup

```powershell
cd frontend
npm run dev            # http://localhost:3000
```

## 11. Docker Compose

```powershell
# From the repository root
docker compose up --build
# Frontend: http://localhost:3000   Backend: http://localhost:8000
```

- Backend applies migrations on start and stores SQLite in the `followbaze-data`
  volume (persistent).
- Frontend waits for the backend health check (`condition: service_healthy`)
  rather than a fixed sleep.
- To load demo data: `docker compose exec backend python -m scripts.seed`.

---

## 12. Tests

```powershell
# Backend
cd backend
.\.venv\Scripts\python.exe -m pytest

# Frontend
cd frontend
npm run test           # Vitest + React Testing Library
npm run typecheck      # tsc --noEmit
npm run lint           # next lint
npm run build          # production build

# End-to-end (starts an isolated backend + frontend automatically)
npx playwright install chromium
npm run e2e
```

---

## 13. API endpoint summary

Base prefix: `/api/v1`

| Method | Path | Description |
|--------|------|-------------|
| GET  | `/health` | Service health (`200` when healthy) |
| GET  | `/leads` | List leads; supports `?status=` and `?search=` (case-insensitive name) |
| POST | `/leads` | Create a lead (name required, defaults to `New`) → `201` |
| GET  | `/leads/{lead_id}` | Lead detail incl. full discussion history → `404` if missing |
| PATCH| `/leads/{lead_id}` | Update permitted fields (incl. status) → `404` if missing |
| GET  | `/leads/{lead_id}/discussions` | Discussion history, newest first → `404` if missing |
| POST | `/leads/{lead_id}/discussions` | Add a note + optional follow-up (atomic) → `201` |

Errors use a consistent envelope:

```json
{ "error": { "code": "not_found", "message": "Lead 42 was not found.", "details": null } }
```

Statuses: `validation_error` (422), `not_found` (404), `conflict` (409),
`internal_error` (500), `network_error` (client-side). Stack traces, SQL and
secrets are never returned.

---

## 14. Important implementation decisions & assumptions

- **Follow-up classification** (mutually exclusive, one bucket per lead):
  - `overdue` — scheduled instant is **strictly before now** (real comparison).
  - `due_today` — scheduled in the future and within **today's local calendar day**.
  - `upcoming` — after today's local day.
  - `unscheduled` — no (or unparseable) timestamp.
  Overdue and Due-today are rendered as **separate pinned sections** and pinned
  leads are **excluded from the main list** to avoid duplication. The same logic
  lives in `backend/app/core/timezone.py` and `frontend/src/lib/followUp.ts`
  (each unit-tested).
- **Status = pipeline stage, not completion.** `Won`/`Lost` do **not** silently
  clear a scheduled follow-up; that policy is deliberate and documented.
- **Follow-up preservation:** submitting a note with no follow-up keeps the
  existing `next_follow_up_at`.
- **Filters respected by pinned sections:** when a status/search filter is active,
  the pinned sections reflect the filtered set for predictable behaviour.
- **Pinned section ordering:** soonest follow-up first. Main list ordering:
  most recently updated lead first, `id` as a deterministic tiebreaker.
- **No delete feature** — deletion behaviour is defined (`ON DELETE CASCADE` from
  discussions to leads) but exposed only via the seed `--reset` flag.
- **SQLite timezone limitation** handled with a `UTCDateTime` type that normalises
  to UTC on write and re-attaches UTC on read.
- **No authentication** — intentionally omitted to protect the core workflow.
- **N+1 avoided:** the leads list resolves the latest discussion and count with
  two aggregated queries (window function + group-by) for the whole page.

## 15. Known limitations

- SQLite is intended for local/dev use; for production set `DATABASE_URL` to
  Postgres (models are portable) and run migrations.
- `AUTO_CREATE_TABLES=true` is a development convenience; migrations remain the
  source of truth and are used in Docker/CI.
- The E2E config assumes a local virtualenv at `backend/.venv` (see
  `frontend/playwright.config.ts`).
- `datetime-local` inputs are interpreted in the **app timezone** regardless of
  the browser's timezone (documented, consistent behaviour for the demo).

---

## 16. Demonstration video / screenshots

Record a short (2–3 min) screen capture demonstrating the required flow:

1. Start the app (`docker compose up --build`, or the local steps above) and run
   `python -m scripts.seed` if needed.
2. Show the dashboard: **Overdue** section in red, **Today's follow-ups**, status
   badges, relative times and the summary counters.
3. Use **search** and the **status filter** together.
4. Click **Add Lead** → create a lead → it appears on the dashboard.
5. Open the lead → **Add a discussion** with a **next follow-up** → it appears at
   the top of the timeline and on the dashboard.
6. Change the **status** → close → reopen the lead to show it persisted.
7. Show a lead with an **overdue** follow-up vs. one **due today** in its section.

Suggested screenshots: dashboard (full), overdue section, timeline dialog,
add-lead dialog, API docs (`/docs`), and passing test output.

> No screenshots, video, public URL or test results are fabricated in this repo;
> the steps above are the ones to capture.

---

## 17. Demo checklist (mapped to the evaluation matrix)

| # | Requirement | Where |
|---|-------------|-------|
| 1 | Single-screen app; lead opens in dialog (no route change) | `features/leads/LeadDashboard.tsx`, `ui/Modal.tsx` |
| 2 | Dashboard shows name, company, status badge, latest note, relative time, follow-up | `features/leads/LeadRow.tsx` |
| 3 | Due-today section derived from persisted data | `features/leads/FollowUpSection.tsx` |
| 4 | Overdue follow-ups prominent in red | `components/ui/FollowUpIndicator.tsx` |
| 5 | No duplication between pinned and main list | `LeadDashboard.tsx` (rest excludes pinned) |
| 6 | Status filter (All + 6) and case-insensitive name search, combined | `features/leads/FilterBar.tsx`, `useLeads.ts` |
| 7 | Loading / empty / no-results / API-error states | `components/ui/Feedback.tsx` |
| 8 | Timeline dialog: history (newest first), composer, optional follow-up | `features/leads/LeadTimelineDialog.tsx` |
| 9 | Atomic discussion + follow-up; preserve existing reminder | `backend/app/services/discussion_service.py` |
| 10 | Inline status update persisted and reflected | `LeadTimelineDialog.tsx`, `PATCH /leads/{id}` |
| 11 | Add lead dialog with client + server validation, no false success | `features/leads/AddLeadDialog.tsx` |
| 12 | Timezone-correct follow-up classification (testable) | `backend/app/core/timezone.py`, `frontend/src/lib/followUp.ts` |
| 13 | REST API contract, error envelopes, CORS, docs | `backend/app/api/**`, `/docs` |
| 14 | Migrations, indexes, FK integrity | `backend/alembic/**`, `backend/app/models/__init__.py` |
| 15 | Deterministic, idempotent seed covering all cases | `backend/scripts/seed.py` |
| 16 | Backend + frontend + E2E tests | `backend/tests`, `frontend/src/**/*.test.tsx`, `frontend/e2e` |
| 17 | Docker Compose, `.env.example`, persistent SQLite, health checks | `docker-compose.yml`, `.env.example` |
