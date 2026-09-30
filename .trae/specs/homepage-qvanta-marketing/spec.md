# QVANTA Marketing Homepage — Product Requirements Document (PRD)

## Overview
- **Summary**: Build a 6-section single-page marketing/scrolling landing homepage for QVANTA (AI-based interactive quantum computing learning platform, Smart India Hackathon 2026). The page sells one idea: quantum computing stops being abstract math and becomes something you can *see, drag, and run* in the browser.
- **Purpose**: Replace the current `/` → `/dashboard` redirect with a public marketing homepage that converts visitors into sign-ups and clearly positions QVANTA against generic learning products, using a deep-space quantum-lab visual language.
- **Target Users**: Hackathon judges, prospective student learners, educators evaluating classroom tooling, engineering leads reviewing quantum education products.

## Goals
- Route `/` renders a standalone, full-screen marketing landing page (not inside the authenticated `Layout` shell).
- Deliver 6 distinct scroll sections (Hero → Quantum Sphere → Why QVANTA → Circuit Builder + Bloch → Tutor + Editor → Personal Tutor CTA / Footer) as one continuous smooth/scroll-snap page.
- Integrate scroll-choreographed reveals (GSAP ScrollTrigger) and Three.js scenes across the page using the existing `@react-three/fiber` + `@react-three/drei` stack.
- Establish the required quantum-lab palette / typography (Space Grotesk, Inter, JetBrains Mono) so it feels like "nobody else's product."
- Ship a Web Worker (with WASM path if feasible, JS fallback otherwise) for the Quantum Sphere per-particle math so the main thread keeps 60 fps on mid-range laptops.
- Responsive behavior + reduced-motion support.

## Non-Goals
- **No new authenticated features**: Dashboard, Circuit Builder page, Tutor page, billing, admin routes remain untouched — the homepage is marketing-only and links into those existing routes.
- **No backend/API changes** for this spec (CORS was already made flexible).
- **No real multiplayer wiring on the homepage** — feature copy mentions multiplayer/classroom mode as a product statement; actual socket integration is out of scope for the homepage.
- **No actual `.glb`/`.gltf` assets**: Everything is procedural geometry (torus, Bloch sphere, orb/ring constructs, circuit rails/gate blocks); DRACOLoader integration is still required *structurally* for any future gltf pipeline (decoder hosted locally, GLTFLoader + DRACOLoader import wired in a utility), but no assets are shipped this iteration.
- **No real Monaco interactive editor**: Screen 5 shows a read-only Monaco (`@monaco-editor/react`) panel in demo state; no execution/live sync.

## Background & Context
- Existing web stack at `apps/web/`: Vite + React 18 + TS + Tailwind preset in `packages/ui/src/tailwind-preset.ts`, router in `App.tsx` (`/` currently redirects to `/dashboard`), React Router v6, Zustand stores.
- Existing 3D component patterns: `CircuitScene3D`, `BlochPanel`, `AvatarScene` — all use `<Canvas>` from r3f, drei helpers, share ambient/directional lighting pattern on `#020617` background. The homepage reuses the same library versions (`three ^0.166`, `@react-three/fiber ^8.16`, `@react-three/drei ^9.108`).
- Existing `@qvanta/ui` primitives (Button, Card, Input, Badge) available and Tailwind preset extensible (adds `primary`/`accent`/`bg`/`text` scales); we'll *extend* it with the quantum-lab palette tokens (`--violet`, `--cyan`, `--bg`, `--bg-2`, `--ink`, `--ink-dim`, display fonts) rather than overriding.
- Monorepo workspaces: homepage code lives under `apps/web/src/pages/Homepage.tsx` plus `apps/web/src/components/homepage/*` folder for the 6 screen components, worker, and utilities.
- Simulator status: optional Python+Qiskit service may be blocked by Windows policy — homepage treats simulator as external link / CTA.

## Functional Requirements
- **FR-1 (Routing)**: New `Homepage` page component is mounted at route `/` (unprotected, outside the `<ProtectedRoute><Layout/></ProtectedRoute>` wrapper). Old `/dashboard` redirect remains reachable at `/dashboard` and authenticated routes continue to work.
- **FR-2 (Header / Footer)**:
  - Fixed translucent header at all scroll positions, with `|ψ⟩ QVANTA` wordmark left, nav links (Learn / Circuit Builder / Simulator) center, `Log in` + `Sign up` (solid accent) right. Nav links scroll-jump to in-page section anchors OR link to the real app routes (e.g., `Circuit Builder` → `/circuit`).
  - Footer (Section 6 area) with product name, 2-3 links (Product · Sign up · Contact), minimal, no dense sitemap.
- **FR-3 (Screen 1 — Hero / Landing)**:
  - Value-prop headline subordinating circuit building + live simulation + AI tutor under a single clear sentence; real copy, no lorem ipsum.
  - CTAs: primary "Start learning" → `/register`, secondary "Explore the circuit builder" → `/circuit`.
  - Ambient background: faint static starfield + slow-drifting low-opacity particle layer; non-interactive, always visible behind hero text.
- **FR-4 (Screen 2 — The Quantum Sphere, scroll-assembled)**:
  - Full-viewport r3f Canvas section.
  - ~2,800 points (grid, e.g. 76×38 u,v) per particle has a `scatteredPosition` and a parametric `targetPosition` on a wavy folded torus (not plain sphere):
    - Major radius `Rmaj(u)` modulated by sin/cos harmonics for lobed silhouette.
    - Tube radius `Rtube(u,v)` modulated by `sin(2u + v·k)` for woven fold.
    - Vertical `fold(u,v)` term added to Y for organic ripple/undulation.
    - Whole shape tilted ~30–40° off-axis in the scene root group.
  - Scroll-driven assembly: track section scroll progress (0 → 1) via `getBoundingClientRect().top`/viewport height; smooth with per-frame lerp. Each particle has per-particle delay (0–0.55) + smoothstep ease-in over 0.45 range.
  - Idle wobble (low-amplitude sine noise) on all particles continuously regardless of assembly state.
  - `LineSegments` wireframe sharing same position buffer (u→u+1, v→v+1 wrapped) — opacity fades in past ~35% assembly.
  - 2–3 elliptical orbit rings at different tilts/radii, counter-rotating slowly; opacity tied to assembly progress.
  - Cursor-reactive repulsion: raycast mouse onto a plane at shape depth; particles within radius get additive repulsion offset, more pronounced when assembly is further along.
  - Per-particle lerp/wobble/repulsion math runs in a Web Worker (`apps/web/src/workers/quantumSphere.worker.ts`). Worker interface: postMessage of inputs (assembly t, per-particle delays + seeds, cursor world pos+radius, time) → worker returns updated `Float32Array` via Transferable/SharedArrayBuffer when available; main thread writes it only into the `BufferGeometry` position attribute. If WASM is not available (build-time Rust/AssemblyScript tooling is not present in the repo), worker is pure JS and still moves math off the main thread.
- **FR-5 (Screen 3 — Why QVANTA / feature overview)**:
  - Split layout: left = vertical list of 4 feature lines (tied to real product features: Drag-and-drop circuit builder · Live Qiskit-compatible simulation · AI tutor that explains your own circuit · Multiplayer classroom mode). Right = self-contained circular 3D visual (glowing orb/ring construct, distinct from Screen 2's torus).
  - Each list item highlights on scroll (intersection-observer / ScrollTrigger) and connects visually to a change in the right-side visual via thin animated connector line.
- **FR-6 (Screen 4 — Circuit Builder + Bloch Sphere showcase)**:
  - Two side-by-side 3D panels:
    - Left: Live-feeling 3D quantum circuit mockup — qubit rails with a few animated gate blocks (visual only; not wired to the real circuit store). Reuses the gate color mapping pattern from `CircuitScene3D` so visuals match the app.
    - Right: Proper Bloch sphere render (axes labeled `|0⟩`/`|1⟩`, visible state vector) that rotates/animates through H → X → H cycle to demonstrate a gate operation. Shares Bloch sphere geometry logic with `BlochPanel` (no duplicate math; refactor helper into a shared util if needed).
  - Short labels "Vector formation" and "3D circuit" pointing to panels with SVG connector arrows.
- **FR-7 (Screen 5 — Virtual AI Tutor + Code Editor)**:
  - Left: Read-only Monaco code-editor panel showing a short Qiskit-style circuit snippet, colored using the quantum palette. Powered by existing `@monaco-editor/react` dep.
  - Right: "Virtual AI presence" — compact particle orb (reuses violet→cyan particle language from Screen 2 at smaller scale, ~400–800 particles) that pulses on a timed cycle.
  - Short chat bubble next to the AI presence demonstrating tutor explaining a concept (real copy: explains what a Hadamard gate superposition does, in context of the Monaco snippet).
  - Centered animated visual element between panels (looped procedural "video" — a pulsing state vector / Bloch arrow SVG animation — no mp4 required).
- **FR-8 (Screen 6 — Personal Tutor CTA)**:
  - Conversion moment: headline framing QVANTA as an ML-backed personal tutor, not a static course. Copy ties the 5 prior screens together.
  - Final CTA button: "Start learning free" → `/register`.
  - Restrained visual callback: small dimmed version of Screen 2 torus at low assembly progress OR Bloch state vector settling into a resting position — signals "loop complete," not a new effect.
- **FR-9 (Cross-screen transitions / GSAP)**: `gsap` + `ScrollTrigger` pinning / scrubbing choreographs section reveals:
  - Section snapping (CSS `scroll-snap-type: y mandatory` with fallback `scroll-behavior: smooth`) OR GSAP pinning if snap causes r3f canvas jank.
  - At minimum: Section 2 uses scrubbed scroll progress for particle assembly; Section 3 feature-list items trigger connector-line animations on viewport entry; Section 6 CTA fades in after all sections scroll past.
- **FR-10 (Color semantics)**: Violet (#8b6bff) consistently means "pre-measurement / superposition / uncertain state"; Cyan (#34e0ff) consistently means "measured / collapsed state." Applied across: Screen 2 particle tint shift as assembly progresses, Screen 2 connector wireframe, Screen 4 Bloch arrow start→end color, Screen 5 particle orb pulse spectrum, Screen 6 state-vector settling.

## Non-Functional Requirements
- **NFR-1 (Tech stack non-negotiable)**: React 18 + TypeScript + Vite. Three.js exclusively through `@react-three/fiber` + `@react-three/drei`. Layout/utility via Tailwind; bespoke CSS module or per-file styles only for anything not expressible in utilities. GSAP + ScrollTrigger for scroll choreography.
- **NFR-2 (Performance)**: 60 fps target on mid-range laptop (8 CPU cores, integrated GPU). Particle count degradation on mobile / low-end GPUs detected via `navigator.hardwareConcurrency` and a quick WebGL capability check (e.g., maxSamples < 4 → halve particles). r3f Canvas `frameloop: 'demand'` used for static scenes; always-on Canvas only on sections that truly need it. No asset CDNs — Draco decoder lives in `/public/draco/` if gltf path is used, but for this iteration we only wire the loader import path locally and add the decoder folder with an empty placeholder `.gitkeep`/README note.
- **NFR-3 (WASM / Worker)**: Worker is mandatory for the Screen 2 per-frame math. WASM path (AssemblyScript `asc` or `wasm-pack`) is accepted but OPTIONAL — if repo has no Rust/AS tooling configured, JS-only worker is sufficient to hit NFR-2. `SharedArrayBuffer` gated behind COOP/COEP header presence in vite.config `server.headers` — gracefully degrade to transferable postMessage if not available.
- **NFR-4 (Responsive)**: All sections fluidly adapt from 1440px hero max-width down to 360px mobile. 3D scenes on mobile: lower particle counts (≤ ~900 for Screen 2), disable cursor repulsion on touch, collapse Screen 4 side-by-side into stacked layout under ~768 px, Screen 3 split becomes stacked.
- **NFR-5 (Accessibility / reduced motion)**: `prefers-reduced-motion` disables particle wobble amplitude, GSAP scrub/reveals, gate anims, and cursor repulsion offsets — but leaves text content, section layout, anchors fully readable and navigable. No auto-playing video/audio.
- **NFR-6 (Type safety)**: Zero TypeScript errors. `npm --workspace web run typecheck` passes after implementation. No `any`; use `unknown` + guards when needed.
- **NFR-7 (Build correctness)**: `npm --workspace web run build` succeeds. No `require(...)` calls inside render (existing `CircuitScene3D` uses it for hot-path store; homepage avoids dynamic requires in render, prefers static imports).
- **NFR-8 (Design integrity / no generic AI look)**: Explicitly rejected aesthetics — no cream + terracotta, no black + single neon used only as decoration, no generic rounded SaaS card kit, no tracked uppercase eyebrow on every heading, no middle-dot meta strings, no arrow-suffix on every button.
- **NFR-9 (Real copy)**: All visible copy is final, on-brand, QVANTA-specific. No placeholders, no brackets, no lorem ipsum left in DOM.
- **NFR-10 (Shared lighting/color logic across 3D scenes)**: One `HomepageSceneLighting` component exported and reused by every Canvas on the homepage so ambient/directional intensities, hemisphere accent tint, bg clear color, and fog feel consistent across Screens 2, 3, 4, 5, 6 visual callback.

## Constraints
- **Technical**:
  - Keep existing routes (`/login`, `/register`, `/dashboard`, `/circuit`, `/tutor`, `/billing`, `/admin`) working. Do not wrap them in homepage styling.
  - Extend the existing tailwind preset (`packages/ui/src/tailwind-preset.ts`) with new palette tokens / fonts rather than duplicating config.
  - Add dependencies only to `apps/web/package.json` (not root): `gsap`, plus AssemblyScript/Rust tooling only if we implement WASM (otherwise none required).
  - Vite config may add server headers `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp` as a dev-only opt-in to unlock SharedArrayBuffer — keep it scoped, verify the app still builds in preview mode without the headers (just no SAB).
- **Business**: Smart India Hackathon 2026 deliverable — code quality + demonstration value matter; no login-gated wall between visitor and the marketing story.
- **Dependencies**: Peer on installed deps (three / r3f / drei / @monaco-editor/react / zustand / clsx+tailwind-merge / @qvanta/ui Button). New dep install only for GSAP (+ optional AS/Rust if WASM chosen).

## Assumptions
- Vite dev server and preview server run on same localhost; no server-side rendering involved.
- No external GLTF assets / Draco compressed geometry this iteration; we still import GLTFLoader + DRACOLoader patterns in a `src/lib/three-loaders.ts` file for structural correctness, and place a `/public/draco/README.md` placeholder so future models can drop in, but no runtime use of GLTF required by ACs.
- Home page visitor is anonymous — authentication state from Zustand store is consulted only to change "Sign up"/"Log in" CTAs to "Dashboard" when already logged in.
- Simulator optional status means CTA links to `/circuit` (which has simulator integration in-app) rather than assuming it's up.
- "WASM threads" requirement will be satisfied by offloading to a Worker (JS worker meets the core performance need; we'll implement JS worker and leave a clear path/file for future AS wasm module if the team adds AS tooling later).

## Open Questions
(None at spec time — scope was delivered in the prompt.)

## Acceptance Criteria

### AC-1: Route `/` renders the standalone marketing homepage
- **Type**: `rule`
- **Given**: A fresh browser visit to `http://localhost:<vitePort>/` without authentication.
- **When**: The page loads.
- **Then**: User sees the marketing homepage (6-section layout) rendered outside the `Layout` sidebar shell, and navigating to `/dashboard` still correctly requires auth and opens the existing dashboard.
- **Pass Condition**: Route `/` mounts `<Homepage/>`; `/dashboard` is reachable with an authenticated session; no 404s; no regression of existing routes in `typecheck` or build.
- **Evidence**: Dev server load of `/` shows homepage; router code in `App.tsx` confirms path; `npm --workspace web run typecheck` succeeds.

### AC-2: Header, footer, CTAs, and anchors are functional with correct link destinations
- **Type**: `rule`
- **Given**: Homepage is loaded.
- **When**: User clicks primary CTA "Start learning".
- **Then**: Navigates to `/register` (React Router push, no page reload). Secondary CTA "Explore the circuit builder" → `/circuit`. Header nav "Log in" → `/login`, "Sign up" → `/register`. "Circuit Builder" nav → `/circuit`. "Learn" scrolls to section 3 anchor or `/dashboard`. "Simulator" scrolls to Screen 4 showcase OR links to `/circuit`. Footer links are clickable and not placeholder `#`.
- **Pass Condition**: Every anchor and CTA has a real destination, no `#` dead links in header/footer/CTA.
- **Evidence**: Manual click-through in dev server; grep for `href="#"` in homepage sources returns 0.

### AC-3: Six distinct full-screen sections in scroll order
- **Type**: `rule`
- **Given**: Homepage fully loaded.
- **When**: User scrolls from top to bottom.
- **Then**: In order they see: (1) Hero / Landing, (2) Quantum Sphere assembly, (3) Why QVANTA feature overview split, (4) Circuit + Bloch side-by-side panels, (5) Virtual AI Tutor + Code Editor, (6) Personal Tutor CTA + Footer. Each section occupies ≥ 80vh visually at desktop.
- **Pass Condition**: All 6 sections present and in order; DOM `id` anchors match header links; sections render without layout shift on load.
- **Evidence**: DOM inspection in browser; snapshot of rendered `document.querySelectorAll('section[id]')` matches the 6 expected IDs.

### AC-4: Quantum Sphere renders ~2,800 particles with parametric wavy folded torus target shape, scroll-driven assembly, wireframe, orbit rings, and cursor repulsion
- **Type**: `rubric`
- **Dimension**: Visual and interactive fidelity of Screen 2 against the prompt
- **Scale**: 1-5
- **Anchors**: 1 = no 3D scene / broken canvas; 3 = plain sphere with basic assembly but missing wireframe/rings/repulsion; 5 = fully parametric wavy folded torus shape, per-particle staggered smoothstep easing tied to scroll progress, continuous idle wobble, wireframe fades in past 35% progress, counter-rotating orbit rings reveal with assembly, cursor-reactive ripple/repulsion stronger at higher assembly %, 2,500+ particles on desktop.
- **Pass Threshold**: >= 4
- **Evidence**: DevTools three.js inspector shows Points + LineSegments + Ring geometries; performance profiler shows per-frame updates off the main thread via the worker message loop.

### AC-5: Quantum Sphere per-particle math runs in a Web Worker (WASM optional) and does not block the main thread
- **Type**: `rule`
- **Given**: Screen 2 is visible and user is scrolling / moving cursor.
- **When**: Profiling in Chrome Performance panel for 5 seconds.
- **Then**: Particle lerp/wobble/repulsion computation is not in the main thread task trace; instead the worker shows postMessage transfer events and main thread only writes to BufferGeometry attributes. Worker file exists at `apps/web/src/workers/quantumSphere.worker.ts` and is imported via `new Worker(new URL(...), { type: 'module' })` in Vite.
- **Pass Condition**: Worker file exists; main thread never iterates over >2800 particles per frame in a synchronous loop; Performance panel shows worker activity during animation.
- **Evidence**: File existence check + Performance panel screenshot or task trace narrative.

### AC-6: Screen 3 feature list items visually connect to the right-side 3D orb via animated connector lines on scroll/hover
- **Type**: `rule`
- **Given**: Screen 3 visible; 4 feature list items on left; glowing orb construct on right.
- **When**: Each feature item scrolls into view (or is hovered on desktop).
- **Then**: A thin line animates from the list item toward the orb, and the orb changes one visible property (e.g., ring speed, emissive tint, scale) to signal state.
- **Pass Condition**: 4 connector animations fire on scroll entry and match to 4 distinct orb visual states.
- **Evidence**: Screenshot or manual scroll-through demo showing connector lines and orb reactivity.

### AC-7: Screen 4 shows 3D circuit mockup + animated Bloch sphere with semantic color states, plus connector arrow labels
- **Type**: `rule`
- **Given**: Screen 4 visible.
- **When**: Observing for 5 seconds.
- **Then**:
  - Left panel: qubit rails with ≥ 3 distinct gate blocks (H, X, CNOT) drawn as 3D meshes; animated idle pulse on gates.
  - Right panel: Bloch sphere with axes labeled `|0⟩` (top, +Z) and `|1⟩` (bottom, -Z), visible state vector cycles through `|0⟩ → H (superposition violet) → X (flip) → H → |0⟩ settled cyan` cycle matching Screen 6 callback vector.
  - Labels "3D circuit" and "Vector formation" each with an SVG connector arrow pointing to the correct panel.
- **Pass Condition**: All 4 elements present; colors shift violet→cyan matching measurement semantics per FR-10.
- **Evidence**: Manual inspection; DOM/Scene shows SVG connectors and labeled Bloch axes.

### AC-8: Screen 5 shows read-only Monaco Qiskit snippet (not screenshot), pulsing AI particle orb, chat bubble with real tutor copy
- **Type**: `rule`
- **Given**: Screen 5 visible, internet-connected dev environment (Monaco loads).
- **When**: User scrolls to Screen 5.
- **Then**:
  - Monaco editor mounts with a real read-only Qiskit snippet (≥ 4 lines, creates Bell circuit: `qc.h(0)`, `qc.cx(0,1)` etc.) themed to the palette.
  - Right side: compact particle orb (~400–800 pts) pulses on a cycle, color shifts violet→cyan.
  - Chat bubble text is real copy explaining the snippet (e.g., "We place H on q_0 to create superposition…"), not placeholder.
  - Between panels there is an animated procedural "dynamic video" element (SVG or CSS anim) showing a state vector rotating / pulsing (no mp4 file required).
- **Pass Condition**: All 4 sub-elements visible and copy is real non-placeholder text.
- **Evidence**: Browser inspection shows Monaco editor DOM present; grep of homepage files for "lorem"/"TODO copy" = 0.

### AC-9: Screen 6 closes with Personal Tutor framing, final CTA, restrained visual callback, and minimal footer
- **Type**: `rule`
- **Given**: Scrolled to Screen 6.
- **When**: Reading the section.
- **Then**:
  - Headline frames the product as "your ML-backed personal tutor" (not "static course").
  - Final CTA button → `/register`.
  - Visual callback is either a small Screen 2 torus at ~20% assembly (faint, low opacity) OR Bloch state vector settling into a cyan/measured rest state.
  - Footer has product name + 2–3 real links, no large sitemap.
- **Pass Condition**: All 4 sub-elements present; visual callback reuses particle language from Screens 2/4 (not a new unrelated motif).
- **Evidence**: Manual verification; DOM includes footer links with valid href.

### AC-10: Palette, typography, color semantics, and shared 3D lighting applied consistently across the page
- **Type**: `rubric`
- **Dimension**: Design-system consistency + rejection of generic AI SaaS aesthetics
- **Scale**: 1-5
- **Anchors**: 1 = default tailwind slate colors, no new fonts; 3 = new palette present but only in one section, generic "purple neon decor without meaning"; 5 = Every section uses `--bg / --bg-2` for background, violet=superposition/cyan=measurement semantic, Space Grotesk on all display headings, Inter body, JetBrains Mono only for actual quantum notation (`|ψ⟩`, `|0⟩`, `|1⟩`). `HomepageSceneLighting` is reused across every 3D Canvas. Rejected aesthetics are absent: no cream/terracotta, no single-black-neon, no generic rounded-card kit covering sections, no uppercase eyebrow on every heading, no middle-dot separators, no arrow on the end of every button.
- **Pass Threshold**: >= 4
- **Evidence**: CSS variables visible in the page; font stack in DevTools Computed; visual scan of sections.

### AC-11: Responsive, 60 fps target on mid-range laptops, particle degradation on mobile, reduced-motion support
- **Type**: `rubric`
- **Dimension**: Performance and accessibility behavior
- **Scale**: 1-5
- **Anchors**: 1 = homepage crashes mobile, drops frames on desktop, ignores reduced-motion; 3 = works on desktop but mobile layout breaks or no particle degradation; 5 = Desktop 60 fps (via worker offload) at 2800 particles, Screen 2 degrades to ≤ 900 pts on `hardwareConcurrency ≤ 4` / low-end GPU, Screen 4 stacked under ~768px, Screen 3 split stacked under ~768px, no horizontal scroll at 360px, `prefers-reduced-motion: reduce` disables wobble/gsap/repulsion/gate animations but leaves text and layout fully legible.
- **Pass Threshold**: >= 4
- **Evidence**: Chrome DevTools device toggle at 360×720 (no horizontal scrollbar); toggling `prefers-reduced-motion` via DevTools Rendering visibly freezes animations; Performance recording on desktop scroll shows 55+ fps average for Screen 2 section.

### AC-12: Typecheck + build pass, no runtime console errors on initial load of `/`
- **Type**: `rule`
- **Given**: Clean install of any new npm deps (gsap).
- **When**: Running `npm --workspace web run typecheck` and `npm --workspace web run build` with homepage in place.
- **Then**: Both commands exit with code 0. A fresh visit to `/` in dev mode logs zero uncaught exceptions / React error boundaries / 404 network errors (Draco decoder missing is OK if we document the placeholder; Monaco must not error).
- **Pass Condition**: typecheck = 0 errors; build = 0 errors; browser console on `/` load = 0 red uncaught errors (warnings OK).
- **Evidence**: Command exit codes + console screenshot.
