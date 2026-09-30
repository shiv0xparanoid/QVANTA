# QVANTA Marketing Homepage — Implementation Plan (Updated)

Note: Task headings contain no status markers. Live status is stored in each task's `Status` field.
Repository assessment performed against actual file contents on 2026-09-15.

---

## Already Completed — Verified Against Source

Tasks below were inspected in `apps/web/src/...` and confirmed functional in code.

### Task 1: Dependencies + palette/font/tailwind setup
- **Status**: `completed`
- **Priority**: high
- **Completion Evidence**:
  - `gsap ^3.15.0` installed in `apps/web/package.json`
  - Tailwind preset `packages/ui/src/tailwind-preset.ts` contains `violet` (#8b6bff), `cyan` (#34e0ff), `ink`, `ink-dim`, `bg-1`, `bg-2`, and `font-display`/`font-body`/`font-mono-quantum` font families
  - `apps/web/src/index.css` defines CSS vars `--bg`, `--bg-2`, `--violet`, `--cyan`, `--ink`, `--ink-dim` on `:root`; body font = Inter; utility classes `.font-display`, `.font-mono-quantum`, `.qvanta-gradient-text` exported
  - `apps/web/public/draco/README.md` placeholder in place
  - `apps/web/src/lib/three-loaders.ts` exports `getGltfDracoLoader()` and `getDracoDecoder()` with local decoder path `/draco/`

### Task 2: Router + Homepage page shell + Header/Footer components
- **Status**: `completed`
- **Priority**: high
- **Completion Evidence**:
  - `apps/web/src/pages/Homepage.tsx` exists; renders `<HomepageHeader/>`, 6 screens in order (Hero → QuantumSphere → WhyQvanta → CircuitBloch → TutorEditor → PersonalTutor), `<HomepageFooter/>`
  - `HomepageHeader.tsx`: fixed translucent header with `|ψ⟩ QVANTA` wordmark, nav (Learn/#why, CircuitBuilder→/circuit, Simulator/#circuit-showcase), Log in/Sign up (or Dashboard if authenticated)
  - `HomepageFooter.tsx`: minimal, product wordmark + Product/Sign up/Contact links
  - Hook `useHomepageGsap()` is called in Homepage.tsx

### Task 3: Quantum Sphere worker math + utility modules
- **Status**: `completed`
- **Priority**: high
- **Completion Evidence**:
  - `apps/web/src/lib/quantumTorus.ts`: `generateTorusTargetPosition()` (parametric wavy-folded torus with Rmaj harmonics, Rtube weave, fold(y) term, baked mat3 tilt), `generateScatterPosition()`, `generatePerParticleDelay()`, `lerp`, `smoothstep`, `clamp`, and `mulberry32` RNG
  - `apps/web/src/workers/quantumSphere.worker.ts`: module-type worker imports quantumTorus functions; handles `init` (allocates positions Float32Array + seeds delays/scatters) and `step` (per-particle smoothstep local-progress, lerp, sine wobble, cursor repulsion with falloff, posts back with Transferable buffer when not SAB)
  - `apps/web/src/hooks/useQuantumSphereWorker.ts`: Vite `new Worker(new URL(...),{type:'module'})` init; `step()` dispatches messages; exposes `getPositionsRef()` and `getVersionRef()`
  - `apps/web/src/hooks/useParticleCount.ts`: degrades via `navigator.hardwareConcurrency`, `matchMedia('pointer: coarse')`, and WebGL `MAX_SAMPLES` probe
  - `apps/web/src/hooks/usePrefersReducedMotion.ts`: hook subscribes to `prefers-reduced-motion: reduce` MediaQueryList

### Task 4: Homepage shared lighting + Screen 1 (Hero) section
- **Status**: `completed`
- **Priority**: high
- **Completion Evidence**:
  - `HomepageSceneLighting.tsx` reuses `<color attach="background" #06050f>`, fog, `ambientLight 0.45`, `hemisphereLight(violet→cyan 0.18)`, main `directionalLight`, violet accent directional
  - `HeroScreen.tsx` section `#hero` min-h-100svh; r3f Canvas with `AmbientStarfield` ×2 layers (ink + violet, 280+160 density); headline Space Grotesk with `qvanta-gradient-text`; real value-prop copy; two CTAs (Start learning → /register, Explore circuit builder → /circuit); scroll-hint mouse SVG with pulse animation

### Task 5: Screen 2 — Quantum Sphere canvas component with GSAP scroll scrub
- **Status**: `completed`
- **Priority**: high
- **Completion Evidence**:
  - `QuantumSphereScreen.tsx` section `#quantum-sphere` min-h-120svh; Points + LineSegments share position buffer from worker; UDIM=76 VDIM=38 = 2888 target particles, reduced by `useParticleCount(desktop=2888, mobile=900)`
  - Scroll progress computed from `section.getBoundingClientRect()` per frame; smoothed with lerp factor 0.11
  - Per-particle delays 0–0.55 + smoothstep ease-in over 0.45 range
  - Idle sine wobble at all assembly states; reduced motion amplitude 0.003 vs default 0.015
  - `LineSegments` (u→u+1, v→v+1 torus-wrapped) opacity fades in via `smoothstep(0.3, 0.75, t)`
  - Three elliptical orbit rings (violet/cyan/ink) at different tilts, counter-rotating, opacity tied to assembly progress
  - Raycast onto z=0 plane from pointermove → repulsion radius 1.2, strength scales by `lerp(0.2,1,t)` so repulsion is stronger once shape formed
  - Particle color lerps violet→cyan as `t` increases (semantic violet=uncertain → cyan=measured)
  - Caption overlay with `|ψ⟩ — superposition` eyebrow, real copy

### Task 6: Screen 3 — Why QVANTA split feature overview
- **Status**: `completed`
- **Priority**: medium
- **Completion Evidence**:
  - `WhyQvantaScreen.tsx` section `#why` 4 real features: Qiskit-compatible simulation, Bloch spheres per gate step, AI tutor reads user circuit, Lessons build to real algorithms
  - Left column: 4 feature items with eyebrow numbers, bespoke heavy-left accent styling (NOT generic rounded cards)
  - Right column: 520px framed r3f Canvas with glowing icosahedron core + layered orbit rings + 2600 particle shell + faint glow mesh; `MutationObserver` on wrapper class toggles `hp-orb-state-0..3` → smooth state lerp for emissive/scale
  - SVG connector lines from each feature item → orb frame; GSAP stroke-dashoffset animation from `useHomepageGsap.ts` on ScrollTrigger entry
  - Responsive: `lg:flex-row` vs stacked on smaller screens

### Task 8: Screen 5 — Virtual AI Tutor + Code Editor
- **Status**: `completed`
- **Priority**: medium
- **Completion Evidence**:
  - `TutorEditorScreen.tsx` section `#tutor-editor` 3-column layout lg:cols-12 (editor 4, Bloch center 4, tutor panel 4); stacked on mobile
  - Left: Monaco Editor, read-only, custom theme `qvanta-bell` with token colors matching palette, Bell-state Qiskit snippet with real comments explaining entanglement, window-controls chrome, `read-only` pill badge
  - Center: Custom SVG Bloch sphere (~340px) with both qubits on a Bell pair `|φ⁺⟩`, violet `q₀` + cyan `q₁` state vectors, pulse rings, axes `|0⟩/|1⟩` labeled JetBrains Mono, caption showing Dirac notation
  - Right: Chat bubble from "Dr. Aria — QVANTA Tutor" with inline code callouts (`qc.h(0)` violet pill, `qc.cx(0,1)` cyan pill) explaining superposition and entanglement; live grounding status indicator; follow-up CTA
  - Bottom-right ancillary panel: expected qasm_simulator counts bar graph with `00` violet 50% and `11` cyan 50%, 01/10 struck through at 0%
  - Background r3f Canvas with 1400-pt spherical particle orb from Screen 2 particle language

### Task 10 (partial): GSAP scroll choreography + reduced-motion integration (Hero + Why + Final CTA)
- **Status**: `in_progress`
- **Priority**: high
- **Depends On**: Tasks 7 and 9 being completed first so CircuitBloch and PersonalTutor selectors exist when GSAP runs
- **Description**:
  - `useHomepageGsap.ts` already handles Hero headline/sub/CTA stagger (frame 0), WhyQvanta feature items slide-in + connector drawSVG dashes + hp-orb-state toggleClass per ScrollTrigger, Final CTA `hp-final-cta` fade-in on approach
  - Remaining GSAP work: verify CircuitBloch panel SVG arrows exist when GSAP context sets up; add optional ScrollTrigger scrub tween for Screen 4 panels entrance if selector exists without throwing; ensure all selectors are guarded with null-checks so a missing component does not throw on mount
- **Acceptance Criteria Addressed**: AC-6, AC-7, AC-9, AC-11
- **Test Requirements**:
  - `rule` TR-10.GSAP: No runtime `Cannot read properties of null` thrown from GSAP in console after mounting all 6 screens; all existing ScrollTrigger timelines (Hero, Why feature items, Final CTA) fire on scroll.

---

## Remaining Pending Work

### Task 7: Screen 4 — Circuit Builder + Bloch Sphere showcase
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 4, Task 2 (both verified complete)
- **Blocked By**: None — file is currently **missing** and imported in `Homepage.tsx` line 7 (`import CircuitBlochScreen from '.../CircuitBlochScreen'`); app will 404 / build-fail without it
- **Description**:
  - Create `apps/web/src/components/homepage/screens/CircuitBlochScreen.tsx`: Section `id="circuit-showcase"` min-h-[110svh] with deep-space layered gradients.
  - Heading block above grid: eyebrow `gate.matrix · 3D · H X CNOT`, headline "Run gates in three dimensions, watch state vectors form in real time.", subline "Left: the circuit you drag and drop. Right: what each gate actually does to a qubit on the Bloch sphere. No black boxes."
  - Inner layout grid `lg:grid-cols-2 gap-8 lg:gap-14`, responsive stacked under ~768px.
  - **Left panel — 3D circuit mockup**:
    - Glass-frame panel (rounded-2xl border-white/5 bg-bg-2/60 backdrop-blur + window-chrome traffic-light dots + label `circuit.3d` JetBrains Mono).
    - Embedded r3f Canvas with `<HomepageSceneLighting/>`; 3 qubit rails at z=-1.4, 0, +1.4; 4 timesteps along x-axis.
    - Gate blocks: H gate on q0 t=0 (violet `#8b6bff` rounded box + `H` label via `<Html>`/texture), CNOT control=q0 target=q2 at t=1 (orange amber control sphere + thin dashed control line + cyan target CNOT cylinder on rail), X gate on q1 at t=2 (fuchsia rounded box + `X`), Measure on q1 q2 at t=3 (semi-transparent measurement gauge disc with tick mark).
    - Idle animation: each gate pulses emissive intensity on a staggered 3.4s loop (different phase per gate); reduced motion disables pulse. Rails drawn as `LineBasicMaterial` tubes with faint dashed inner tick marks at each timestep slot.
    - Entanglement link: thin glowing additive Line connects q0→q2 only after CNOT timestep, opacity pulses subtly.
  - **Right panel — Bloch sphere showcase**:
    - Glass-frame panel with window chrome + label `bloch.vector · q₀` JetBrains Mono.
    - Embedded r3f Canvas with `<HomepageSceneLighting/>`; Bloch geometry: `SphereGeometry(1.3, 32, 24)` wireframe layer + solid low-opacity inner sphere + x/y/z axis lines (`LineSegments`) each with JetBrains Mono labels: top `|0⟩` (+Z violet-start), bottom `|1⟩` (-Z cyan-end), side axis labels x/y.
    - State vector (thick `Line` + glowing sphere at tip) animates through a 10s H→X→H cycle:
      - Phase 0 (0→2s): `|0⟩` rest (vector top, cyan)
      - Phase 1 (2→4.5s): Hadamard applies → vector rotates from top → equator +X (violet) = superposition, sphere wireframe tint shifts
      - Phase 2 (4.5→7s): Pauli-X applies → vector flips hemisphere → -X, cyan tint as "flipped measured-like"
      - Phase 3 (7→9s): Hadamard re-applies → vector rotates back to +Z `|0⟩`
      - Phase 4 (9→10s): settled cyan `|0⟩` (matches Screen 6 callback resting state)
    - Reduced motion: vector static at superposition midpoint (one frame).
  - **Connector labels**: Outside each panel at the bottom, SVG label cards with curved connector arrows:
    - Left anchor label `"3D circuit"` → SVG curved arrow up+in to left panel
    - Right anchor label `"Vector formation"` → SVG curved arrow up+in to right panel
  - Responsive: under 768 px → panels stack vertically, connector arrows point straight up, grid gap reduces.
- **Acceptance Criteria Addressed**: AC-3, AC-7, AC-10 (violet/cyan semantic shift in Bloch vector phases and gate tints)
- **Test Requirements**:
  - `rule` TR-7.1: Bloch axes labels `|0⟩`/`|1⟩` present; 3D panel shows ≥ 3 distinct gate blocks (H, CNOT, X) + Measure; color maps violet=H(superposition)/cyan=CNOT-target/cyan=vector-collapsed; both SVG connector arrows rendered in DOM and visible.
  - `rubric` TR-7.2: Showcase realism vs "cheap placeholder"; scale 1–5; anchors 1 = 2 circles; 3 = 3D but very basic shapes without animation; 5 = gates styled like real CircuitScene3D (emissive + labels), Bloch vector animates smoothly through all phases of H→X→H, scene lighting matches Screen 2 lighting exactly (same `HomepageSceneLighting`). Threshold >= 4.
- **Completion Evidence**: TBD upon implementation.

### Task 9: Screen 6 — Personal Tutor CTA + Footer + visual callback
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 2, Task 4, Task 5 (callback motif reuses Screen 2 particles and Task 7 Bloch rest state vector)
- **Blocked By**: None — file is currently **missing** and imported in `Homepage.tsx` line 8 (`import PersonalTutorScreen from '.../PersonalTutorScreen'`); build will fail without it
- **Description**:
  - Create `apps/web/src/components/homepage/screens/PersonalTutorScreen.tsx`: Section `id="personal-tutor"` min-h-[105svh] flex flex-col relative; background layers with top and bottom gradient wash, faint background r3f Canvas visual callback in the back.
  - **Background restrained visual callback**: Full-bleed low-z Canvas with `HomepageSceneLighting` + a small low-opacity version of Screen 2's torus (particle point cloud only, no wireframe, 900 particles max, frozen at ~22% assembly = faint scattered violet cloud with a hint of cyan convergence). No cursor repulsion, no orbit rings, low additive opacity ~0.28. Alternative if torus too heavy: a single Bloch vector scene settling into cyan `|0⟩` rest on loop once. Prefer torus cloud because it ties back to Screen 2's "every particle a state waiting" motif at lower visual energy.
  - **Foreground content** (centered, z-10, max-w-4xl mx-auto px-6):
    - Eyebrow line JetBrains Mono `ml · personal tutor · adaptive` with cyan tint.
    - Headline Space Grotesk `text-[clamp(1.8rem,3.2vw,2.9rem)]`: `"Your personal quantum tutor. Built into every circuit you build."`
    - Subline Inter leading-relaxed: `"Most courses hand you the formula. QVANTA adapts the formula to you — ML-backed hints, visual state-vector explanations for every step, and a tutor that answers in the context of circuits you already ran. No math PhD required. Just curiosity."`
    - Feature trust row (small): 3 chips inline — `· Real Qiskit simulation` / `· AI-grounded answers` / `· From qubits → Shor-style` with JetBrains Mono tiny text, violet/cyan accent dots.
    - CTA group, centered, class selector `hp-final-cta` (matches GSAP selector in `useHomepageGsap.ts` line 75):
      - Primary `Button variant=primary size=lg` → navigate('/register') with violet→indigo gradient + shadow: `"Start learning free"`
      - Secondary text link `Log in` → navigate('/login'), `text-ink-dim → text-ink` on hover.
  - **Footer anchored to section bottom**: Place `<HomepageFooter/>` component here (import from Task 2, already completed).
  - Reduced motion: background visual callback = static single-shot render, no per-frame update; CTA no fade-in.
- **Acceptance Criteria Addressed**: AC-3, AC-9, AC-10 (reuses Screen 2 particle motif and/or Bloch rest state vector), AC-2 (final CTA link destination)
- **Test Requirements**:
  - `rule` TR-9.1: Footer renders with valid Product→/dashboard, Sign up→/register, Contact→mailto:hello@qvanta.com; final CTA routes to `/register`; visual callback present and is Screen-2-particle/Bloch-vector motif (NOT a new unrelated illustration or gradient blob); copy contains NO lorem/placeholder strings.
- **Completion Evidence**: TBD upon implementation.

### Task 10 final — Build + QA + review evidence capture
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Tasks 7, 9, Task 10(GSAP in_progress)
- **Description**:
  - Run `npm --workspace web run typecheck`; record exit code and any TS errors.
  - Run `npm --workspace web run build`; record exit code and any build errors.
  - Manually start `npm --workspace web run dev`, load `http://localhost:<port>/`, and:
    - (a) scroll full page, confirm 6 sections in order visible, no horizontal scroll at 360px
    - (b) click every CTA and nav link, confirm no `#` dead links
    - (c) open DevTools Console → record count of uncaught errors (target 0)
    - (d) toggle `prefers-reduced-motion: reduce` in DevTools Rendering → confirm animations stop, text remains 100% legible
    - (e) DevTools Performance 15s scroll recording avg fps reported
  - Address any regressions from Task 7/9 code (e.g. missing hooks) before marking complete.
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-11, AC-12
- **Test Requirements**:
  - `rule` TR-10.QA: `typecheck` exit 0; `build` exit 0; homepage load console 0 uncaught red errors; 0 dead href `#` links in header/CTA/footer.
  - `rubric` TR-10.Quality: Overall scroll choreography + mobile legibility; scale 1–5 anchors 1 = broken/mobile jank 3 = usable some overlap 5 = choreo transitions smooth, 360px no clipping CTAs ≥44px. Threshold ≥ 4.
- **Completion Evidence**: TBD upon implementation.
