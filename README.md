# QVANTA — Quantum Computing Education SaaS (MVP)

QVANTA is a production-grade, multi-tenant SaaS platform for interactive quantum computing education. Build 3D quantum circuits, run real Qiskit Aer simulations, chat with an AI tutor with 3D lip-sync, and manage Free/Pro subscriptions via Stripe.

---

## Table of Contents

1. [Features](#features)
2. [Monorepo Structure](#monorepo-structure)
3. [Prerequisites](#prerequisites)
4. [Quick Start (10 Steps)](#quick-start-10-steps-510-minutes)
5. [Default Credentials](#default-credentials)
6. [Authentication Endpoints](#authentication-endpoints)
7. [Tiered Plans](#tiered-plans)
8. [AI Tutor — Dual-Path Mode](#ai-tutor--dual-path-mode)
9. [Infrastructure & Docker](#infrastructure--docker)
10. [Troubleshooting](#troubleshooting)
11. [MVP Acceptance Criteria](#mvp-acceptance-criteria-checklist)

---

## Features

The MVP ships with the following production-ready capabilities:

| Area | Capabilities |
|------|-------------|
| **Auth** | Email/password register/login, JWT access + refresh tokens, httpOnly cookies, Google OAuth 2.0, role-based guards, server-side logout |
| **Circuit Builder** | 3D drag-drop builder (React Three Fiber), 2D SVG lite fallback, gate snap-to-grid, keyboard shortcuts, synced Monaco Qiskit editor ↔ 3D scene |
| **Simulation** | Qiskit Aer microservice (FastAPI + Redis job queue), measurement histograms (Recharts), per-qubit Bloch sphere visualization with step-through animation |
| **AI Tutor** | 3D virtual human avatar, lip-sync + TTS viseme animation, dual mode: Claude 3 RAG (pgvector) or keyword-driven demo mode, conversation persistence |
| **Billing** | Stripe Free / Pro / Institution tiers, usage guard (402 at tier cap), Stripe checkout sessions, webhook-driven tier updates |
| **Admin** | Institution tier admin panel, role-based access, admin user auto-seeded on first boot |

---

## Monorepo Structure

```
.
├── apps/
│   ├── web/          # React + Vite + Tailwind frontend (3D builder, Monaco, tutor)
│   ├── api/          # Node.js Express platform API (auth, billing, circuits, tutor dispatch)
│   └── simulator/    # Python FastAPI quantum simulation microservice (Qiskit Aer + Redis)
├── packages/
│   ├── types/        # Shared TypeScript types (Circuit, GateOp, TutorMessage, etc.)
│   └── ui/           # Shared React component library + Tailwind preset
├── infra/
│   ├── docker-compose.yml     # Postgres 16 + pgvector + Redis 7
│   ├── api/Dockerfile         # API service image
│   ├── simulator/Dockerfile   # Simulator microservice image
│   └── web/Dockerfile         # Web frontend image
└── .github/workflows/ci.yml   # CI pipeline
```

### Service Ports

| Service | Port | URL |
|---------|------|-----|
| Web (Vite) | 5173 | http://localhost:5173 |
| API (Express) | 3000 | http://localhost:3000 |
| Simulator (FastAPI) | 8000 | http://localhost:8000 |
| PostgreSQL | 5432 | localhost:5432 |
| Redis | 6379 | localhost:6379 |

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| **Docker + Docker Compose** | latest | Required for Postgres + Redis |
| **Node.js** | 20+ | Check with `node --version` |
| **npm** | 9+ | Check with `npm --version` |
| **Python** | 3.11+ | *Optional* — only needed for the simulator microservice |

---

## Quick Start (10 Steps, 5–10 minutes)

### Step 1 — Start Infrastructure (Postgres + Redis)

```bash
docker compose -f infra/docker-compose.yml up -d
```

This starts **pgvector/pgvector:pg16** (Postgres 16 with vector extension) and **redis:7-alpine**.

### Step 2 — Install npm Dependencies

Run at the monorepo root:

```bash
npm install
```

### Step 3 — Configure Environment Files

Copy the env templates. You can leave third-party keys blank for demo mode:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/simulator/.env.example apps/simulator/.env
```

> **Demo-mode notes**: The platform runs fully without `GOOGLE_*`, `STRIPE_*`, or `ANTHROPIC_API_KEY`. Google sign-in buttons show a "not configured" message, Stripe checkout can be mocked, and the AI tutor falls back to a keyword-driven canned-reply path.

### Step 4 — Initialize the Database

Generate the Prisma Client and run migrations:

```bash
npm --workspace api run prisma:generate
npm --workspace api run prisma:migrate
```

> **Note**: The `pgvector` extension must be enabled in Postgres first. The extension is auto-enabled if using the official `pgvector/pgvector` Docker image; otherwise run `CREATE EXTENSION vector;` inside the `qvanta` database.

### Step 5 — Install Python Simulator (Optional)

*Skip for a quick smoke-test — the API boots without the simulator, and simulator requests simply return 503 (handled cleanly in the UI).*

```bash
cd apps/simulator
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS / Linux:
# source .venv/bin/activate
pip install -r requirements.txt
```

### Step 6 — Start the API Server

Terminal 1 (or background):

```bash
npm --workspace api run dev
```

- Listens on `http://localhost:3000`
- Seeds the default **admin user** on first boot (see [Default Credentials](#default-credentials))
- Logs `WEB_ORIGIN` and port at startup

### Step 7 — Start the Python Simulator (Optional)

Terminal 2 (if you installed Python deps):

```bash
# From apps/simulator with venv active:
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Step 8 — Start the Web Frontend

Terminal 3:

```bash
npm --workspace web run dev
```

Vite proxies `/api` → `http://localhost:3000`. Open **http://localhost:5173**.

### Step 9 — Register a User & Log In

1. Visit http://localhost:5173/register
2. Create an account with any email + password (min 8 chars)
3. You are automatically logged in and redirected to the Dashboard

> **Or use the default admin account** — see [Default Credentials](#default-credentials) below.

### Step 10 — Smoke-Test the MVP Happy-Path

1. **Dashboard loads** → modules list (initially empty) + usage meter (0/50 Free tier).
2. **Open Circuit Builder** → drag **H** onto q0·t0, drag **CNOT(q0→q1)** to t1 → add **Measure** on both at t2 → click **Simulate** (1024 shots). Bell histogram should show ~50% `00` and ~50% `11`.
3. **Open AI Tutor** → ask "What does H do?" → reply should include the keyword "superposition" → TTS plays → 3D mouth visemes animate between closed/A/O → refresh the page → conversation history persists.
4. **Billing page** shows the Free tier. Clicking Upgrade opens the Stripe checkout (mocked in test mode).

---

## Default Credentials

An admin user is automatically seeded on first API boot from the values in `apps/api/.env`:

| Field | Value |
|-------|-------|
| **Email** | `admin@qvanta.com` |
| **Password** | `admin1234` |
| **Role** | `admin` |
| **Tier** | `institution` |

> You can change `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH` in `apps/api/.env` before the first boot. To generate a new bcrypt hash:
> ```bash
> node -e "require('bcrypt').hash('your-password', 12).then(h => console.log(h))"
> ```

---

## Authentication Endpoints

All auth routes live under the `/auth` prefix (proxied via Vite as `/api/auth/*`).

| Method | Route | Public | Description |
|--------|-------|--------|-------------|
| `POST` | `/auth/register` | ✅ | Register a new user. Body: `{email, password}` (min 8 chars). Returns user + tokens, sets `refreshToken` cookie. |
| `POST` | `/auth/login` | ✅ | Log in with email/password. Body: `{email, password}`. Returns user + tokens, sets `refreshToken` cookie. |
| `POST` | `/auth/refresh` | ✅ | Exchange refresh token for new token pair. Accepts `refreshToken` from cookie **or** body. |
| `POST` | `/auth/logout` | 🔒 | Invalidate refresh token server-side and clear the cookie. Requires Bearer auth. |
| `GET` | `/auth/google` | ✅ | Initiate Google OAuth 2.0 flow (only active if `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` configured). |
| `GET` | `/auth/google/callback` | ✅ | Google OAuth callback — redirects back to web with tokens in query params. |

### Protected Routes

All non-auth routes require a valid **Bearer access token** in the `Authorization` header, or a valid `refreshToken` httpOnly cookie as a fallback. The `@/lib/api-client.ts` interceptor in the web app automatically attaches the token and refreshes it on 401.

### Token Lifecycle

| Token | Expiry | Storage |
|-------|--------|---------|
| Access Token | 15 minutes | `localStorage` (key: `qvanta_token`) |
| Refresh Token | 7 days | `localStorage` + httpOnly cookie |

---

## Tiered Plans

| Tier | Sims / month | Max shots | Builder | Tutor | Instructor panels |
|------|--------------|-----------|---------|-------|-------------------|
| **Free** | 50 | 1024 | 3D + 2D | Demo mode | — |
| **Pro** | Unlimited | 65536 | 3D + 2D | Claude RAG | — |
| **Institution** | Per seat | 65536 | 3D + 2D | Claude RAG | ✅ Classroom dash |

Usage resets monthly; `usageMonth` stored on each user's row in the format `YYYY-MM`. The usage guard in `apps/api/src/lib/billing/usage-guard.ts` throws `402 Payment Required` with code `usage_limit_exceeded` when the Free tier cap is hit.

---

## AI Tutor — Dual-Path Mode

`tutor.service.ts` in `apps/api` operates in two modes, auto-detected at boot:

### Claude Mode (when `ANTHROPIC_API_KEY` is set)
- Calls `claude-3-haiku-20240307` with a system prompt that injects:
  1. pgvector/keyword RAG snippets from `CourseModule.mdxContent`
  2. The current circuit JSON AST
  3. Pre-flight heuristic circuit warnings — missing Measure gates, self-target CNOT, out-of-range qubit indices
- Up to 8 prior turns are threaded for context.

### Demo Mode (no API key)
- Falls back to an enhanced keyword-coaching engine, so the tutor UX works fully locally without secrets.
- RAG uses substring keyword scoring on course modules.
- Ask "What does the H gate do?" → guaranteed to contain the keyword "superposition".

---

## Infrastructure & Docker

### docker-compose.yml (Local Dev)

Located at `infra/docker-compose.yml`. Two services:

| Service | Image | Purpose |
|---------|-------|---------|
| `postgres-16` | `pgvector/pgvector:pg16` | Main DB (user: `qvanta`, pass: `qvanta`, db: `qvanta`) |
| `redis-7` | `redis:7-alpine` | Simulator job queue + caching |

Volumes `qvanta-pgdata` and `qvanta-redis` persist data between restarts.

### Enable pgvector manually (if not using the Docker image)

```sql
-- Run as superuser inside the qvanta database:
CREATE EXTENSION IF NOT EXISTS vector;
```

### Production Dockerfiles

Located under `infra/<service>/Dockerfile` for each of `api`, `simulator`, `web`.

---

## Troubleshooting

### ❌ `ERROR: type "vector" does not exist` during migration

**Fix**: The pgvector extension isn't enabled. Run:
```bash
docker exec infra-postgres-16-1 psql -U qvanta -d qvanta -c "CREATE EXTENSION IF NOT EXISTS vector;"
```
Then re-run the migration:
```bash
npm --workspace api run prisma:migrate
```

### ❌ Migration `20260907190220_init` failed — schema needs reset

If migrations get out of sync (DB has record but files missing on disk):
```bash
npx --workspace api prisma migrate resolve --rolled-back 20260907190220_init
# Or for a full clean slate, drop and recreate public schema:
docker exec infra-postgres-16-1 psql -U qvanta -d qvanta -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO qvanta; CREATE EXTENSION vector;"
# Then migrate again:
npm --workspace api run prisma:migrate
```

### ❌ Register/login works but Dashboard redirects back to /login

Check the **Bearer token interceptor** (Vite proxy → `/api` rewrite). Verify:
1. API running on port 3000 → `curl http://localhost:3000/health`
2. Vite running on 5173 with proxy config (default in `apps/web/vite.config.ts`)
3. Browser DevTools → Application → localStorage has `qvanta_token` set

### ❌ Admin password not working

Default credentials are **`admin@qvanta.com` / `admin1234`**. If you changed `ADMIN_PASSWORD_HASH`, re-seed by restarting the API server (upserts on each boot).

### ❌ Simulator returns 503 "Simulator service unavailable"

The Python simulator isn't running. Either start it on port 8000 or ignore — the UI gracefully handles 503s with inline error banners.

---

## MVP Acceptance Criteria Checklist

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Monorepo apps/{web,api,simulator}, packages/{ui,types}, infra/ all present and buildable | ✅ |
| 2 | Register / login (email + Google OAuth routes), JWT refresh, role-based guards, server-side logout | ✅ |
| 3 | 3D drag-drop circuit builder (qubit rails, gate snap, keyboard nav, 2D fallback) | ✅ |
| 4 | Monaco Qiskit editor ↔ 3D scene bidirectional sync with parse-error markers | ✅ |
| 5 | Bell circuit simulation returns ~00 + ~11 counts; histogram renders via Recharts | ✅ |
| 6 | Tutor replies with "superposition" for H-gate Q; 3D avatar TTS with lip-sync; persistence | ✅ |
| 7 | Stripe Free (50 sim cap) / Pro tiers; webhook → user.tier; usage-guard throws 402 at cap | ✅ |
| 8 | Per-qubit Bloch spheres; step-through animation shows \|0⟩→\|+⟩ after H | ✅ |
| 9 | Mobile-responsive sidebar + Lite 2D SVG fallback toggle | ✅ |
| 10 | `npm -w @qvanta/types/ui build`, `npm -w api typecheck`, `npm -w web build` all exit 0 | ✅ |
#   Q V A N T A  
 #   Q V A N T A  
 