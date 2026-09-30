import React from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@qvanta/ui';
import * as THREE from 'three';
import HomepageSceneLighting from '@/components/homepage/HomepageSceneLighting';
import HomepageFooter from '@/components/homepage/HomepageFooter';
import { useParticleCount, usePrefersReducedMotion } from '@/hooks';
import {
  clamp,
  generatePerParticleDelay,
  generateScatterPosition,
  generateTorusTargetPosition,
  lerp,
  smoothstep
} from '@/lib/quantumTorus';

const UDIM_SMALL = 44;
const VDIM_SMALL = 24;
const TOTAL_SMALL = UDIM_SMALL * VDIM_SMALL;
const ASSEMBLY_T = 0.22;

interface CallbackTorusProps {
  sectionRef: React.RefObject<HTMLElement>;
}

const CallbackTorus: React.FC<CallbackTorusProps> = ({ sectionRef }) => {
  const reduced = usePrefersReducedMotion();
  const activeCount = useParticleCount(TOTAL_SMALL, 480);
  const pointsRef = React.useRef<THREE.Points | null>(null);
  const tSmoothedRef = React.useRef(0);
  const initializedRef = React.useRef(false);

  const basePositions = React.useMemo(() => {
    const targets = new Float32Array(TOTAL_SMALL * 3);
    const scatters = new Float32Array(TOTAL_SMALL * 3);
    const delays = new Float32Array(TOTAL_SMALL);
    const seed = 42;
    const total = UDIM_SMALL * VDIM_SMALL;
    for (let i = 0; i < TOTAL_SMALL; i++) {
      const idx = i % total;
      const u = (idx % UDIM_SMALL) / UDIM_SMALL;
      const v = Math.floor(idx / UDIM_SMALL) / VDIM_SMALL;
      generateTorusTargetPosition(u, v, targets, i * 3, 2.1, 0.48, 0.38);
      generateScatterPosition(i, seed, scatters, i * 3, 5.2);
      delays[i] = generatePerParticleDelay(i, seed);
    }
    return { targets, scatters, delays };
  }, []);

  const pointsGeom = React.useMemo(() => {
    const g = new THREE.BufferGeometry();
    const base = new Float32Array(TOTAL_SMALL * 3);
    for (let i = 0; i < TOTAL_SMALL; i++) {
      base[i * 3 + 0] = basePositions.scatters[i * 3 + 0];
      base[i * 3 + 1] = basePositions.scatters[i * 3 + 1];
      base[i * 3 + 2] = basePositions.scatters[i * 3 + 2];
    }
    g.setAttribute('position', new THREE.BufferAttribute(base, 3));
    g.setDrawRange(0, activeCount);
    return g;
  }, [activeCount, basePositions]);

  React.useEffect(() => {
    pointsGeom.setDrawRange(0, activeCount);
  }, [activeCount, pointsGeom]);

  useFrame(({ clock }) => {
    const section = sectionRef.current;
    if (section && typeof window !== 'undefined') {
      const vh = window.innerHeight;
      const rect = section.getBoundingClientRect();
      const raw = 1 - (rect.top + vh * 0.1) / (vh * 1.0);
      const target = reduced
        ? raw > 0.2
          ? 1
          : 0
        : smoothstep(-0.1, 1.1, raw);
      const mapped = ASSEMBLY_T + clamp(target, 0, 1) * 0.15;
      tSmoothedRef.current = lerp(tSmoothedRef.current, mapped, reduced ? 1 : 0.08);
    }
    const pts = pointsRef.current;
    if (!pts) return;
    const t = clamp(tSmoothedRef.current, 0, 1);
    const tSec = reduced ? 0 : clock.elapsedTime;
    const wobAmp = reduced ? 0.002 : 0.008;
    const posAttr = pts.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const color = (pts.material as THREE.PointsMaterial).color;
    const violet = new THREE.Color('#8b6bff');
    const cyan = new THREE.Color('#34e0ff');
    for (let i = 0; i < activeCount; i++) {
      const i3 = i * 3;
      const delay = basePositions.delays[i];
      const localRaw = clamp((t - delay) / 0.5, 0, 1);
      const local = smoothstep(0, 1, localRaw);
      const tx = basePositions.targets[i3 + 0];
      const ty = basePositions.targets[i3 + 1];
      const tz = basePositions.targets[i3 + 2];
      const sx = basePositions.scatters[i3 + 0];
      const sy = basePositions.scatters[i3 + 1];
      const sz = basePositions.scatters[i3 + 2];
      let px = lerp(sx, tx, local);
      let py = lerp(sy, ty, local);
      let pz = lerp(sz, tz, local);
      if (wobAmp > 0.0001) {
        const wobSeed = i * 0.07;
        px += Math.sin(tSec * 0.6 + wobSeed) * wobAmp;
        py += Math.cos(tSec * 0.55 + wobSeed * 1.3) * wobAmp;
        pz += Math.sin(tSec * 0.48 + wobSeed * 0.7) * wobAmp;
      }
      arr[i3 + 0] = px;
      arr[i3 + 1] = py;
      arr[i3 + 2] = pz;
    }
    posAttr.needsUpdate = true;
    const colorShift = Math.pow(Math.max(0, (t - ASSEMBLY_T) / 0.35), 0.85);
    color.lerpColors(violet, cyan, clamp(colorShift, 0, 0.85));
    if (!initializedRef.current) {
      initializedRef.current = true;
    }
  });

  return (
    <points ref={pointsRef} geometry={pointsGeom}>
      <pointsMaterial
        size={0.04}
        sizeAttenuation
        transparent
        opacity={0.3}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        color="#8b6bff"
      />
    </points>
  );
};

const PersonalTutorScreen: React.FC = () => {
  const sectionRef = React.useRef<HTMLElement | null>(null);
  const navigate = useNavigate();
  return (
    <section
      id="personal-tutor"
      ref={sectionRef}
      className="relative isolate flex min-h-[105svh] w-full flex-col overflow-hidden"
      aria-labelledby="pt-title"
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <Canvas
          frameloop="always"
          dpr={[1, 1.4]}
          camera={{ position: [0, 0.1, 6.6], fov: 46 }}
          gl={{ antialias: true, alpha: true }}
        >
          <HomepageSceneLighting />
          <CallbackTorus sectionRef={sectionRef} />
        </Canvas>
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-bg-1/90 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-bg-1 via-bg-1/75 to-transparent" />
        <div className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2">
          <div className="h-[420px] w-[420px] rounded-full bg-gradient-to-br from-violet/12 via-transparent to-cyan/10 blur-3xl" />
        </div>
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center px-6 pt-32 pb-10 md:px-8">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center text-center">
          {/* <p className="mb-4 font-mono-quantum text-[11px] tracking-[0.28em] text-cyan/85">
            ml · personal tutor · adaptive
          </p> */}

          <h2
            id="pt-title"
            className="font-display text-[clamp(1.8rem,3.2vw,2.9rem)] font-semibold leading-[1.06] text-ink"
          >
            Your personal quantum tutor.{' '}
            <span className="qvanta-gradient-text">Built into every circuit you build.</span>
          </h2>

          <p className="mt-6 max-w-2xl text-[clamp(1rem,1.2vw,1.08rem)] leading-relaxed text-ink-dim">
            Most courses hand you the formula. QVANTA adapts the formula to you — ML-backed
            hints, visual state-vector explanations for every step, and a tutor that answers in
            the context of circuits you already ran. No math PhD required. Just curiosity.
          </p>

          {/* <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            {[
              { color: 'violet', label: 'Real Qiskit simulation' },
              { color: 'cyan', label: 'AI-grounded answers' },
              { color: 'ink', label: 'From qubits → Shor-style' }
            ].map((chip, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 rounded-full border border-white/5 bg-bg-2/50 px-3.5 py-1.5 backdrop-blur-sm`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    chip.color === 'violet'
                      ? 'bg-violet shadow-[0_0_6px_rgba(139,107,255,0.8)]'
                      : chip.color === 'cyan'
                        ? 'bg-cyan shadow-[0_0_6px_rgba(52,224,255,0.8)]'
                        : 'bg-ink/70'
                  }`}
                />
                <span className="font-mono-quantum text-[10.5px] tracking-[0.08em] text-ink-dim/90">
                  {chip.label}
                </span>
              </div>
            ))}
          </div> */}

          {/* <div className="hp-final-cta mt-10 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/register')}
              style={{
                background: 'linear-gradient(135deg,#8b6bff 0%,#633dff 100%)',
                boxShadow: '0 12px 48px -12px rgba(139,107,255,0.65)'
              }}
              className="!h-14 !px-9 !text-base"
            >
              Start free — no card needed
            </Button>
            <Link
              to="/tutor"
              className="inline-flex !h-14 items-center gap-2 rounded-full border border-white/8 bg-bg-2/70 px-8 text-base font-medium text-ink-dim backdrop-blur-sm transition-all duration-200 hover:border-cyan/30 hover:bg-bg-2 hover:text-ink"
            >
              Try the AI tutor demo
              <span aria-hidden>↗</span>
            </Link>
          </div> */}
        </div>
      </div>

      <div className="relative z-10 mt-auto">
        <HomepageFooter />
      </div>
    </section>
  );
};

export default PersonalTutorScreen;
