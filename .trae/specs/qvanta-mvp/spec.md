# QVANTA - Product Requirements Document (MVP)

## Overview
- **Summary**: QVANTA is a production-grade, multi-tenant SaaS platform for AI-powered interactive quantum computing education. The MVP delivers authenticated dashboards, a 3D quantum circuit builder with synced code editor, Qiskit-based simulation with histograms, a 3D virtual AI tutor with lip-sync + RAG, and Stripe Free/Pro tier checkout.
- **Purpose**: Democratize quantum computing education through immersive 3D visualization, hands-on circuit building, and a persistent, knowledgeable AI tutor.
- **Target Users**: Individual learners (Free/Pro) and institutions (stretch); MVP focuses on individual Student and Admin roles.

## Goals
- Deliver a working MVP monorepo with 3 apps (web, api, simulator) and 2 packages (ui, types) under the documented folder structure.
- User can sign up via email or Google OAuth, log in, land on a dashboard.
- User can build quantum circuits in a 3D drag-and-drop scene (qubit rails + gate objects), and simultaneously in a synced Monaco code editor (Qiskit syntax).
- User can run a circuit simulation via the FastAPI microservice using Qiskit Aer, and view measurement outcome histograms.
- A 3D Three.js avatar tutor answers circuit/content questions via Claude + RAG, speaks with TTS lip-synced to visemes, and persists conversation state.
- Stripe checkout supports Free (capped) and Pro (unlimited) tiers; usage limits enforced server-side.
- Code compiles; apps start locally; basic lint/type-check passes.

## Non-Goals
- Full Institution/Org/Classroom tooling (stretch: not in MVP).
- Multi-backend quantum SDK (PennyLane, Cirq); MVP uses only Qiskit Aer.
- Full mood/gesture state machine for the avatar; MVP covers idle + talking + 3 viseme mouth shapes.
- Live circuit collaboration (WebSockets used only for simulation status, not multi-user editing).
- Adaptive learning paths, full assessments, instructor dashboards, progress analytics (stretch).
- Production cloud deployment (Dockerfiles + structure only, no Terraform/AWS).

## Background & Context
- Spec Mode artifact: defines "what" before "how" (see tasks.md for implementation breakdown).
- LLM note: Anthropic Claude and OpenAI providers are environment-configurable; if unset, tutor falls back to a canned-response demo mode so UX remains intact.
- Quantum note: Qiskit Aer requires a working Python 3.10+ environment; the simulator microservice wraps it.
- 3D avatar note: MVP uses a procedurally-generated Three.js avatar (geometric primitives with morph targets for visemes) so no external GLTF binary asset is required.

## Functional Requirements

### A. Auth & Multi-Tenancy (MVP Subset)
- **FR-A1**: Email/password sign-up with JWT tokens (access + refresh).
- **FR-A2**: Google OAuth login (redirect flow) with JWT token exchange.
- **FR-A3**: Role enum: Student, Instructor, Admin. MVP assigns Student on self-signup; one seed Admin.
- **FR-A4**: All user-scoped data is owned by a user_id. Org tables exist in schema but are not actively used by MVP UI.
- **FR-A5**: Authenticated dashboard route; protected routes redirect to login.

### B. Learning Modules (MVP Subset)
- **FR-B1**: Static MDX lesson content for at least two modules: "Qubits & Superposition", "Basic Gates".
- **FR-B2**: Lesson content is ingested into pgvector embeddings for tutor RAG.
- **FR-B3**: Basic per-user module progress record (started/completed) persisted but not surfaced in UI dashboards beyond a simple list.

### C. 3D Circuit Builder
- **FR-C1**: Three.js (R3F + Drei) scene with N horizontal parallel 3D rails representing qubits (default N=3).
- **FR-C2**: Gate library palette (H, X, Y, Z, CNOT, Measure) as 3D draggable objects snapped to rails at discrete timestep slots.
- **FR-C3**: OrbitControls for camera zoom/pan/rotate.
- **FR-C4**: Gates can be deleted and repositioned.
- **FR-C5**: One-way sync: 3D builder state serializes to an internal AST and then to Qiskit Python code. Two-way sync: Monaco edits that parse update the 3D builder (best-effort; invalid code shows a parse error and does not mutate 3D state).
- **FR-C6**: Export circuit as QASM 2.0 string and as JSON.

### D. Simulation Engine
- **FR-D1**: FastAPI microservice at `/simulate` accepting `{backend: "qiskit_aer", circuit_qasm|circuit_code, shots}`.
- **FR-D2**: Executes Qiskit Aer statevector or qasm_simulator in a subprocess sandbox (never `exec`/`eval` of raw user string without Qiskit parsing).
- **FR-D3**: Returns measurement counts histogram + per-qubit final statevector for Bloch sphere rendering.
- **FR-D4**: Redis-backed async job queue for simulations >2s; WebSocket pushes job status and final result.
- **FR-D5**: Server-side per-user simulation cap for Free tier (50 sims/month, 1024 shots max). Pro tier unlimited. Enforced in API before simulator dispatch.

### E. 3D Visualization Suite (MVP Subset)
- **FR-E1**: Per-qubit 3D Bloch spheres (R3F) updated after each gate step during circuit execution animation.
- **FR-E2**: Measurement histogram (2D chart, e.g. Recharts) rendered as overlay next to/under the 3D scene.
- **FR-E3**: Entanglement links (simple 3D lines between qubits that share CX/entangling gates) — optional MVP nice-to-have.

### F. Virtual Human AI Tutor
- **FR-F1**: 3D Three.js avatar with a head (sphere), eyes, mouth. Mouth has at least 3 viseme morph targets (A, O, closed).
- **FR-F2**: Text-to-Speech via Web Speech API (browser SpeechSynthesis). Utterance events trigger time-based viseme interpolation (simplified phoneme mapping from text).
- **FR-F3**: Chat panel where user asks questions. System prompt instructs Claude to ground answers in: (a) QVANTA lesson content (RAG pgvector similarity search) and (b) user's current circuit AST (injected as context).
- **FR-F4**: Tutor can detect errors: if user circuit matches known patterns (e.g. a missing Measure gate) the tutor proactively suggests fixes.
- **FR-F5**: Conversation history (per user, per session) persisted in PostgreSQL so refreshing the page restores last chat.
- **FR-F6**: Avatar customization: user can toggle among 3 appearance presets (colors + 2 optional shapes) via a settings drawer; stored as user preference.
- **FR-F7**: If ANTHROPIC_API_KEY is not configured, tutor enters "demo mode" and responds with canned but still contextually appropriate answers (so the UX is functional without secrets).

### G / H / I. Learning Path / Assessments / Analytics
- Skipped for MVP except schema stubs and a simple module list on dashboard.

### J. Collaboration
- **FR-J1**: Import/export circuit JSON (covers sharing via file). Real-time multi-user editing deferred.

### SaaS-Specific
- **FR-S1**: Stripe Checkout integration with two price IDs (Free, Pro Monthly) configured via env.
- **FR-S2**: Customer portal link for subscription management.
- **FR-S3**: Webhook endpoint for `checkout.session.completed`, `customer.subscription.updated`, `invoice.paid`/`payment_failed`; updates user tier in DB.
- **FR-S4**: Usage meter: API increments a monthly simulation count per user; enforces Free-tier cap before dispatching simulator jobs.
- **FR-S5**: Admin-only route that lists users and shows tier/usage counts.

## Non-Functional Requirements
- **NFR-1**: Mobile-responsive layout; 3D scene has a global "Lite 2D Fallback" toggle that collapses 3D rails into a flat 2D circuit-diagram representation (simplified canvas/SVG).
- **NFR-2**: Accessibility: circuit builder supports keyboard (arrow keys navigate grid, Enter places selected gate, Delete removes).
- **NFR-3**: Performance: route-level code-splitting via React Router lazy; Three.js scenes are Suspense-wrapped.
- **NFR-4**: Security: submitted code is parsed through Qiskit `QuantumCircuit.from_qasm_str()` or the builder's safe AST; raw user Python strings never reach `exec`/`eval` on the backend. CORS restricted to WEB_ORIGIN.
- **NFR-5**: Observability: Winston logger in API and FastAPI; Sentry DSN optional via env; unhandled errors return JSON Problem Details.
- **NFR-6**: All three apps (web/api/simulator) start from a clean `pnpm install` + `pnpm --filter "*" dev` (or equivalent script) with documented env vars.

## Constraints
- **Technical**:
  - Monorepo structure exactly as specified: `apps/web`, `apps/api`, `apps/simulator`, `packages/ui`, `packages/types`, `infra/`.
  - Frontend: React 18+TypeScript + Vite + TailwindCSS.
  - 3D: `@react-three/fiber`, `@react-three/drei`, Three.js.
  - Code Editor: `@monaco-editor/react` with Qiskit syntax highlighting.
  - Platform API: Node.js + NestJS (preferred) or Express with routing-controllers; Fastify acceptable.
  - Simulator: Python 3.10+ FastAPI; `qiskit`, `qiskit-aer`, `redis[hiredis]`, `pgvector` (embedding gen only if vectorizer configured).
  - AI: `@anthropic-ai/sdk` on API side for tutoring orchestration; RAG via PostgreSQL pgvector extension (`pgvector` npm in Node API).
  - DB: PostgreSQL (schema + migrations); Redis (queue + session cache).
  - Auth: JWT (access 15m, refresh 7d) + `passport-google-oauth20` or equivalent.
  - Billing: `stripe` SDK + webhook signatures.
  - Infra: Dockerfiles per app; `docker-compose.yml` for local Postgres+Redis; GitHub Actions workflow file for CI (type-check + build).
- **Business**: MVP delivers only Free/Pro individual tiers. Institution tier schema present but UI/flows not required.
- **Dependencies**: Qiskit Aer is heavy on first install; simulator Dockerfile pins Python 3.11 and `qiskit-aer-gpu` fallback to CPU-only acceptable.

## Assumptions
- Local development uses Docker Compose for Postgres + Redis; apps run natively or in containers (both documented).
- Google OAuth client ID/secret and Stripe keys are provided via `.env` files; `.env.example` files ship for each app.
- Vector embeddings: if no embedding API key is set, RAG degrades to substring keyword search on lesson content (still retrieves context).
- Web Speech API voices depend on the browser; we surface a voice picker that uses `speechSynthesis.getVoices()`.
- MVP uses procedurally generated avatar geometry; no external GLTF model downloads.

## Acceptance Criteria

### AC-1: Monorepo structure matches spec
- **Type**: `rule`
- **Given**: A fresh checkout and install
- **When**: The folder tree is inspected
- **Then**: `apps/web`, `apps/api`, `apps/simulator`, `packages/ui`, `packages/types`, `infra/` all exist with appropriate package.json / pyproject.toml / Dockerfiles
- **Pass Condition**: All required directories and key config files exist; `pnpm -r build` (or documented build command) completes without error
- **Evidence**: Build command output; tree listing

### AC-2: Auth (email + Google) works end-to-end
- **Type**: `rule`
- **Given**: An API running with valid Postgres and configured Google OAuth client
- **When**: A user signs up via email, logs out, logs in again; and separately a user logs in via Google OAuth
- **Then**: Both paths produce a valid JWT and grant access to `/dashboard`; protected routes redirect to `/login` without a token
- **Pass Condition**: Manual browser flow or Cypress-equivalent test passes login, dashboard access, and redirect check
- **Evidence**: Screenshots or test output

### AC-3: 3D circuit builder drag-drop and gate snap
- **Type**: `rule`
- **Given**: A logged-in user on `/circuit`
- **When**: User drags an H gate from the palette and drops it on qubit 0 at timestep 1; drops a CNOT control=0 target=1 at timestep 2; drops Measure gates on both at timestep 3
- **Then**: All three gates appear on their correct rails/slots; internal circuit AST matches; 3D scene renders them (visible via snapshot)
- **Pass Condition**: AST JSON matches expected structure; visual 3D snapshot shows gates positioned on rails
- **Evidence**: Exported circuit JSON; 3D snapshot

### AC-4: Code editor ↔ 3D builder bidirectional sync
- **Type**: `rule`
- **Given**: The circuit from AC-3
- **When**: User copies the generated Qiskit code from Monaco, deletes the 3D gates, then pastes the code back into Monaco
- **Then**: Valid code triggers the 3D scene to rebuild the same gates; invalid code surfaces a Monaco marker without mutating 3D state
- **Pass Condition**: AST after paste == AST before delete
- **Evidence**: AST before/after diff

### AC-5: Qiskit simulation via FastAPI returns histogram
- **Type**: `rule`
- **Given**: A Bell-state circuit (H on 0, CX 0→1, both measured)
- **When**: `POST /simulate` is invoked with `{shots: 1024}`
- **Then**: Response includes counts for `00` and `11` summing to ~1024 (± noise tolerance 0); statevector is returned
- **Pass Condition**: counts["00"] + counts["11"] >= 1024 - tolerance and counts["01"]==0 and counts["10"]==0
- **Evidence**: HTTP response body

### AC-6: Tutor answers with RAG context, avatar lip-syncs
- **Type**: `rule`
- **Given**: A configured (or demo-mode) tutor with at least one lesson ingested, and the circuit from AC-3 loaded
- **When**: User asks: "What does the Hadamard gate do in my circuit?"
- **Then**: (1) Response text references superposition and/or the H gate definition (RAG evidenced by similarity search result log); (2) Avatar mouth visemes animate during TTS playback; (3) Conversation history is restored after page reload
- **Pass Condition**: Response contains keywords from lesson content; viseme state object transitions during playback; POST /tutor/messages returns the prior thread on new session with same user
- **Evidence**: Response text; viseme state log; persistence query result

### AC-7: Stripe Free/Pro tiers + usage cap enforcement
- **Type**: `rule`
- **Given**: A Free-tier user with 49 simulations this month
- **When**: User runs a 50th simulation; then attempts a 51st
- **Then**: 50th succeeds; 51st is rejected by the API with HTTP 402 / `usage_limit_exceeded`; after a Pro checkout webhook marks the user Pro, subsequent simulations succeed without cap
- **Pass Condition**: API returns correct status codes at boundaries; DB `users.tier` reflects Pro after webhook
- **Evidence**: Request/response pairs; DB row snapshot

### AC-8: Bloch spheres + histogram 2D overlay
- **Type**: `rule`
- **Given**: H on qubit 0, Measure
- **When**: Step-through animation plays
- **Then**: Before H: qubit 0 Bloch vector is |0⟩ (north pole); after H: vector is |+⟩ (equator +X); histogram overlay shows ~50/50 |0⟩/|1⟩ over many shots
- **Pass Condition**: Numeric Bloch vector coordinates match expected values within 0.05 tolerance
- **Evidence**: Snapshot vectors; histogram data

### AC-9: Mobile responsive + lite 2D fallback toggle
- **Type**: `rubric`
- **Dimension**: Mobile & low-power UX
- **Scale**: 1-5
- **Anchors**: 1 = layout breaks at <768px; 3 = layout fits but 3D is laggy on mobile; 5 = layout adapts cleanly at 375px and 2D fallback toggle hides Three.js and renders a fast SVG/Canvas circuit diagram
- **Pass Threshold**: >= 4
- **Evidence**: Screenshots at 375px width; toggle state snapshots

### AC-10: Build, lint, type-check pass
- **Type**: `rule`
- **Given**: A clean checkout with env var placeholders (no real secrets required for build)
- **When**: Documented build/typecheck commands are executed for each app/package
- **Then**: All commands exit 0
- **Pass Condition**: Exit code 0 for web build, api typecheck, simulator install+imports smoke test, packages build
- **Evidence**: Command output snippets

## Open Questions
None required to proceed — structural ambiguities resolved via Assumptions section.
