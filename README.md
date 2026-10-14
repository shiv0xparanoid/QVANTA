<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0f0c29,50:4b2e9b,100:00d4ff&height=140&section=header" width="100%" />

<img src="docs/assets/qvanta-logo.png" alt="QVANTA logo" width="170" />

# QVANTA

<sub><b>learn quantum computing by building it in 3D</b></sub>

<br/>

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Three.js](https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=threedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Qiskit](https://img.shields.io/badge/Qiskit-6929C4?style=for-the-badge&logo=qiskit&logoColor=white)
![Postgres](https://img.shields.io/badge/Postgres-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)

**A multi-tenant SaaS for interactive quantum computing education.**
Drag gates in 3D. Watch Bloch spheres move. Ask a virtual human why.

[![SIH 2026](https://img.shields.io/badge/SIH%202026-Finalist-ff6b35?style=flat-square)](#-about)
[![Team](https://img.shields.io/badge/Team-Code%20Busters-4b2e9b?style=flat-square)](#-about)
[![License](https://img.shields.io/badge/License-MIT-00d4ff?style=flat-square)](LICENSE)
[![GitDiagram](https://img.shields.io/badge/Explore%20on-GitDiagram-0f0c29?style=flat-square)](https://gitdiagram.com/shiv0xparanoid/QVANTA)

[Features](#-features) · [Workflow](#-workflow) · [Structure](#-monorepo-structure) · [Quick Start](#-quick-start) · [Plans](#-plans) · [Checklist](#-mvp-checklist)

</div>

<br/>

## ✦ About

Quantum computing is hard to *see*. QVANTA makes circuits tangible: you build them as 3D objects, simulate them with real Qiskit Aer, and learn alongside an AI tutor that can read your circuit and tell you what's wrong with it.

Built for **early-stage students, professionals and researchers**, and developed by **Team Code Busters** for **Smart India Hackathon 2026**.

<br/>

## ✦ Features

| | Feature | What it does |
|---|---|---|
| 🧊 | **3D Circuit Builder** | Drag-and-drop gates onto qubit rails (React Three Fiber), with keyboard navigation and a 2D SVG fallback for mobile |
| ⌨️ | **Monaco Qiskit Editor** | Two-way sync with the 3D scene, with parse-error markers |
| ⚛️ | **Real Simulation** | Qiskit Aer via a FastAPI microservice, with measurement histograms (Recharts) |
| 🌐 | **Bloch Spheres** | Animated per-qubit spheres with step-through |
| 🧑‍🏫 | **Virtual Human Tutor** | 3D avatar with TTS and lip-sync visemes, and optional Claude RAG |
| 💳 | **Free / Pro tiers** | Stripe billing with usage guards |
| 🏫 | **Multi-tenant** | Role-based guards, JWT refresh, Google OAuth routes |

<br/>

## ✦ Workflow

> 🔍 **Interactive version:** open this repo on **[GitDiagram](https://gitdiagram.com/shiv0xparanoid/QVANTA)** to explore the auto-generated, clickable architecture diagram. (Swap `github.com` for `gitdiagram.com` in any repo URL.) The diagrams below are the curated versions.

### 1 · System architecture

```mermaid
flowchart TB
    subgraph CLIENT["🖥️  Client · apps/web"]
        direction TB
        UI["React + Vite + Tailwind"]
        B3D["3D Circuit Builder<br/>React Three Fiber"]
        MON["Monaco Qiskit Editor"]
        BLOCH["Bloch Spheres"]
        AVATAR["3D Virtual Human<br/>TTS + lip-sync"]
        UI --> B3D & MON & BLOCH & AVATAR
    end

    subgraph API["⚙️  Platform API · apps/api"]
        direction TB
        AUTH["Auth · JWT · OAuth"]
        BILL["Billing · Stripe"]
        CIRC["Saved Circuits"]
        TUTOR["tutor.service.ts"]
        GUARD["Usage Guard"]
    end

    subgraph SIM["⚛️  Simulator · apps/simulator"]
        direction TB
        FAST["FastAPI"]
        AER["Qiskit Aer"]
        FAST --> AER
    end

    subgraph DATA["🗄️  Data · infra"]
        direction LR
        PG[("PostgreSQL 16<br/>+ pgvector")]
        RD[("Redis 7")]
    end

    subgraph SHARED["📦  packages"]
        TYPES["@qvanta/types"]
        UILIB["@qvanta/ui"]
    end

    CLIENT -->|"/api proxy"| API
    API -->|"simulate"| SIM
    API --> PG
    API --> RD
    SIM --> RD
    TUTOR -.->|"optional"| CLAUDE["Claude API"]
    BILL -.-> STRIPE["Stripe"]
    SHARED -.-> CLIENT
    SHARED -.-> API

    classDef client fill:#1a1147,stroke:#4b2e9b,color:#fff
    classDef api fill:#0b3a4a,stroke:#00d4ff,color:#fff
    classDef sim fill:#3b1a5a,stroke:#b57bff,color:#fff
    classDef data fill:#12301f,stroke:#3ddc84,color:#fff
    class UI,B3D,MON,BLOCH,AVATAR client
    class AUTH,BILL,CIRC,TUTOR,GUARD api
    class FAST,AER sim
    class PG,RD data
```

### 2 · Simulation flow

```mermaid
sequenceDiagram
    autonumber
    actor U as Learner
    participant W as Web (3D Builder)
    participant A as Platform API
    participant G as Usage Guard
    participant S as Simulator (FastAPI)
    participant R as Redis

    U->>W: Drag H, CNOT, Measure
    U->>W: Click Simulate (1024 shots)
    W->>A: POST circuit
    A->>G: Check tier and monthly quota
    alt over quota
        G-->>W: 402 Payment Required
    else allowed
        A->>S: Run circuit
        S->>R: Queue / rate limit
        S->>S: Qiskit Aer
        S-->>A: Counts
        A-->>W: Histogram data
        W-->>U: ~50% 00 · ~50% 11
    end
```

### 3 · AI tutor, dual path

```mermaid
flowchart LR
    Q["💬 Learner question"] --> T{"ANTHROPIC_API_KEY<br/>set?"}
    T -->|yes| CM["Claude mode"]
    T -->|no| DM["Demo mode"]

    CM --> CTX["Context builder<br/>① RAG snippets<br/>② circuit JSON AST<br/>③ heuristic warnings<br/>④ last 8 turns"]
    CTX --> LLM["claude-3-haiku"]

    DM --> KW["Keyword coaching engine<br/>+ keyword RAG"]

    LLM --> R["Reply"]
    KW --> R
    R --> TTS["TTS"] --> LIP["3D lip-sync<br/>closed · A · O"]

    classDef a fill:#1a1147,stroke:#4b2e9b,color:#fff
    classDef b fill:#0b3a4a,stroke:#00d4ff,color:#fff
    class CM,CTX,LLM a
    class DM,KW b
```

The tutor works with **zero secrets** in demo mode, so everything runs locally out of the box. Pre-flight heuristics catch missing Measure gates, self-targeting CNOTs and out-of-range qubit indices before the LLM ever sees the circuit.

<br/>

## ✦ Monorepo Structure

```
qvanta/
├── apps/
│   ├── web/            # React + Vite + Tailwind · 3D builder, Monaco, tutor
│   ├── api/            # Node + Express · auth, billing, circuits, tutor dispatch
│   └── simulator/      # Python FastAPI · Qiskit Aer + Redis
├── packages/
│   ├── types/          # shared TS types (Circuit, GateOp, TutorMessage…)
│   └── ui/             # shared React components + Tailwind preset
├── infra/
│   ├── docker-compose.yml   # Postgres 16 + pgvector, Redis 7
│   └── */Dockerfile         # api · simulator · web
└── docs/
```

<br/>

## ✦ Quick Start

> ⏱️ About 5 to 10 minutes. **Needs:** Docker + Compose, Node 20+, Python 3.11+.

```bash
# 1 · infra
docker compose -f infra/docker-compose.yml up -d

# 2 · deps
npm install

# 3 · env  (third-party keys can stay blank → demo mode)
cp apps/api/.env.example       apps/api/.env
cp apps/web/.env.example       apps/web/.env
cp apps/simulator/.env.example apps/simulator/.env

# 4 · database
npm --workspace api run prisma:generate
npm --workspace api run prisma:migrate
```

Then run each service in its own terminal:

```bash
# simulator
cd apps/simulator && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# platform API  →  http://localhost:3000
npm --workspace api run dev

# web  →  http://localhost:5173
npm --workspace web run dev
```

<details>
<summary><b>🧪 Smoke test the happy path</b></summary>

<br/>

1. Register a local email/password user (no OAuth needed in dev)
2. Open **Circuit Builder** → drag `H` onto q0, `CNOT(q0→q1)`, then `Measure` on both → **Simulate**
3. The Bell histogram should show ~50% `00` and ~50% `11`
4. Open **AI Tutor** → ask *"What does H do?"* → the reply mentions *superposition*, the avatar speaks, and history persists on refresh
5. **Billing** shows the Free tier, and Upgrade opens a Stripe test checkout

</details>

<details>
<summary><b>🔑 Demo mode</b></summary>

<br/>

The platform boots without `GOOGLE_*`, `STRIPE_*` or `ANTHROPIC_API_KEY`. Stripe buttons are still present, and the tutor falls back to the keyword engine. If the simulator isn't running, the API still starts and simulate requests return a clean `503` in the UI.

</details>

<br/>

## ✦ Plans

| Tier | Sims / month | Max shots | Builder | Tutor | Extras |
|---|---|---|---|---|---|
| 🆓 **Free** | 50 | 1,024 | 3D + 2D | Demo mode | — |
| ⚡ **Pro** | Unlimited | 65,536 | 3D + 2D | Claude RAG | — |
| 🏫 **Institution** | Per seat | 65,536 | 3D + 2D | Claude RAG | Classroom dashboard |

<br/>

## ✦ MVP Checklist

- [x] Monorepo with `apps/{web,api,simulator}`, `packages/{ui,types}`, `infra/`
- [x] Register / login, Google OAuth routes, JWT refresh, role-based guards
- [x] 3D drag-drop builder with qubit rails, gate snap, keyboard nav, 2D fallback
- [x] Monaco ↔ 3D scene sync with parse-error markers
- [x] Bell circuit simulation with Recharts histogram
- [x] Tutor with TTS, lip-sync and persistent history
- [x] Stripe Free/Pro tiers, webhook → tier, usage guard returns 402 at cap
- [x] Per-qubit Bloch spheres with step-through animation
- [x] Mobile-responsive sidebar and Lite 2D toggle
- [x] `types`/`ui` build, `api` typecheck and `web` build all pass

<br/>

## ✦ Roadmap

- [ ] Instructor classroom dashboard
- [ ] More simulator backends (PennyLane, Cirq)
- [ ] Org-scoped tenant isolation hardening
- [ ] Deeper algorithm modules (Grover, QFT, VQE)

<br/>

<div align="center">

Built by **[Shivang](https://github.com/shiv0xparanoid)** · Team **Code Busters** · SIH 2026

<sub>If QVANTA helped you see a qubit for the first time, drop a ⭐</sub>

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:00d4ff,50:4b2e9b,100:0f0c29&height=120&section=footer" width="100%" />

</div>
