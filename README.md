# QVANTA — Quantum Computing Education SaaS (MVP)

QVANTA is a production-grade, multi-tenant SaaS platform for interactive quantum computing education. The MVP ships with: structured auth, a 3D drag-drop circuit builder (React Three Fiber), synced Monaco Qiskit editor, Qiskit Aer simulation with measurement histograms, animated 3D Bloch spheres, a 3D virtual human AI tutor with lip-sync and optional Claude RAG, and Stripe Free/Pro tiers.

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
└── infra/
    ├── docker-compose.yml     # Postgres 16 + pgvector + Redis 7
    ├── api/Dockerfile         # API service image
    ├── simulator/Dockerfile   # Simulator microservice image
    ├── web/Dockerfile         # Web frontend image
    └── .github/workflows/ci.yml
```

## Quick Start (10 steps, 5–10 minutes)

1. **Prerequisites**: Docker + Docker Compose, Node.js 20+, Python 3.11+, npm.

2. **Start infrastructure** (Postgres with pgvector + Redis):
   ```bash
   docker compose -f infra/docker-compose.yml up -d
   ```

3. **Install npm dependencies** at the monorepo root:
   ```bash
   npm install
   ```

4. **Copy + fill the env templates** (leave third-party keys blank for demo mode):
   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env
   cp apps/simulator/.env.example apps/simulator/.env
   ```
   Demo-mode notes: the platform runs without `GOOGLE_*`, `STRIPE_*`, or `ANTHROPIC_API_KEY` — Stripe CTA buttons are still present, and the tutor falls back to a keyword-driven canned-reply path.

5. **Install Python simulator dependencies** (optional — usage-guard already validates simulator liveness at request time; skip for quick smoke-test):
   ```bash
   cd apps/simulator
   python -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

6. **Initialize Prisma schema + run migrations** in the API:
   ```bash
   npm --workspace api run prisma:generate
   npm --workspace api run prisma:migrate
   ```

7. **Start the FastAPI simulator** (terminal 1, or background):
   ```bash
   # From apps/simulator with venv active:
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
   Or, if Python env is not set, the API still boots; simulator requests return a 503 that surfaces cleanly in the UI.

8. **Start the Node platform API** (terminal 2):
   ```bash
   npm --workspace api run dev
   ```
   Listens on `http://localhost:3000`. Seeds an admin user from `ADMIN_EMAIL` / `ADMIN_PASSWORD_HASH` on first boot.

9. **Start the Vite web frontend** (terminal 3):
   ```bash
   npm --workspace web run dev
   ```
   Vite proxies `/api` → `localhost:3000`. Open `http://localhost:5173`.

10. **Smoke-test the MVP happy-path**:
    1. Register a local email/password user (no Google OAuth needed for dev).
    2. Dashboard loads → modules list + usage meter (0/50 Free tier).
    3. Open *Circuit Builder* → drag H onto q0·t0, drag CNOT(q0→q1) to t1 → add Measure on both at t2 → click **Simulate** (1024 shots). Bell histogram should show ~50% `00` and ~50% `11`.
    4. Open *AI Tutor* → ask "What does H do?" → reply should include the keyword "superposition" → TTS plays → 3D mouth visemes animate between closed/A/O → refresh the page → conversation history persists.
    5. *Billing* page shows the Free tier. Clicking Upgrade opens the Stripe checkout (mocked checkout session in test mode).

## Tiered Plans

| Tier   | Sims / month | Max shots | Builder     | Tutor     | Instructor panels |
|--------|--------------|-----------|-------------|-----------|-------------------|
| Free   | 50           | 1024      | 3D + 2D     | Demo mode | —                 |
| Pro    | Unlimited    | 65536     | 3D + 2D     | Claude RAG| —                 |
| Inst.  | Per seat     | 65536     | 3D + 2D     | Claude RAG| Classroom dash    |

## AI Tutor — Dual-Path Mode

`tutor.service.ts` in `apps/api` operates in two modes, auto-detected at boot:

- **Claude mode** (when `ANTHROPIC_API_KEY` is set): calls `claude-3-haiku-20240307` with a system prompt that injects (1) pgvector/keyword RAG snippets from `CourseModule.mdxContent`, (2) the current circuit JSON AST, (3) pre-flight heuristic circuit warnings — missing Measure gates, self-target CNOT, out-of-range qubit indices. Up to 8 prior turns are threaded for context.
- **Demo mode** (no key): falls back to an enhanced keyword-coaching engine, so tutor UX works fully locally without secrets. RAG uses substring keyword scoring on course modules.

## MVP Acceptance Criteria Checklist

| #  | Criterion                                                                                  | Status |
|----|--------------------------------------------------------------------------------------------|--------|
| 1  | Monorepo apps/{web,api,simulator}, packages/{ui,types}, infra/ all present and buildable  | ✅      |
| 2  | Register / login (email + Google OAuth routes), JWT refresh, role-based guards            | ✅      |
| 3  | 3D drag-drop circuit builder (qubit rails, gate snap, keyboard nav, 2D fallback)          | ✅      |
| 4  | Monaco Qiskit editor ↔ 3D scene bidirectional sync with parse-error markers              | ✅      |
| 5  | Bell circuit simulation returns ~00 + ~11 counts; histogram renders via Recharts          | ✅      |
| 6  | Tutor replies with "superposition" for H-gate Q; 3D avatar TTS with lip-sync; persistence | ✅      |
| 7  | Stripe Free (50 sim cap) / Pro tiers; webhook → user.tier; usage-guard throws 402 at cap  | ✅      |
| 8  | Per-qubit Bloch spheres; step-through animation shows |0⟩→|+⟩ after H                   | ✅      |
| 9  | Mobile-responsive sidebar + Lite 2D SVG fallback toggle                                   | ✅      |
| 10 | `npm -w @qvanta/types/ui build`, `npm -w api typecheck`, `npm -w web build` all exit 0    | ✅      |
