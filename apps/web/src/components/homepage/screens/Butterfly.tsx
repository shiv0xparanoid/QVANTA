import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ---------- Temple Fay's transcendental butterfly curve ----------
// x(t) = sin(t) * ( e^cos(t) - 2cos(4t) - sin^5(t/12) ),  y(t) = cos(t) * (same),  t in [0, 12π]

const VIOLET = new THREE.Color(0x8b6bff);
const CYAN = new THREE.Color(0x34e0ff);
const COUNT = 2000;
const SCALE = 0.62;

function smoothstep(t: number) {
  t = Math.min(Math.max(t, 0), 1);
  return t * t * (3 - 2 * t);
}

function useButterflyBuffers() {
  return useMemo(() => {
    const posArray = new Float32Array(COUNT * 3);
    const scatterPos = new Float32Array(COUNT * 3);
    const targetPos = new Float32Array(COUNT * 3);
    const colorArray = new Float32Array(COUNT * 3);
    const delayArr = new Float32Array(COUNT);

    for (let i = 0; i < COUNT; i++) {
      const t = (i / COUNT) * Math.PI * 12;
      const r = Math.exp(Math.sin(t)) - 2 * Math.cos(4 * t) - Math.pow(Math.sin(t / 12), 5);
      const bx = Math.sin(t) * r * SCALE;
      const by = Math.cos(t) * r * SCALE;

      const jx = (Math.random() - 0.5) * 0.22;
      const jy = (Math.random() - 0.5) * 0.22;
      const jz = (Math.random() - 0.5) * 0.55;

      targetPos[i * 3] = bx + jx;
      targetPos[i * 3 + 1] = by + jy - 0.3;
      targetPos[i * 3 + 2] = jz;

      const sr = 3.0 + Math.random() * 3.6;
      const sphi = Math.random() * Math.PI;
      const stheta = Math.random() * Math.PI * 2;
      scatterPos[i * 3] = sr * Math.sin(sphi) * Math.cos(stheta);
      scatterPos[i * 3 + 1] = sr * Math.sin(sphi) * Math.sin(stheta);
      scatterPos[i * 3 + 2] = sr * Math.cos(sphi);

      posArray[i * 3] = scatterPos[i * 3];
      posArray[i * 3 + 1] = scatterPos[i * 3 + 1];
      posArray[i * 3 + 2] = scatterPos[i * 3 + 2];

      const c = VIOLET.clone().lerp(CYAN, Math.abs(Math.sin(t * 0.5)));
      colorArray[i * 3] = c.r;
      colorArray[i * 3 + 1] = c.g;
      colorArray[i * 3 + 2] = c.b;

      delayArr[i] = Math.random() * 0.55;
    }

    return { posArray, scatterPos, targetPos, colorArray, delayArr };
  }, []);
}

/** The particle scene. `progress` (0-1) drives the scatter -> curve transition smoothly. */
function ButterflyScene({ progress }: { progress: number }) {
  const { posArray, scatterPos, targetPos, colorArray, delayArr } = useButterflyBuffers();

  const groupRef = useRef<THREE.Group>(null);
  const pointsGeoRef = useRef<THREE.BufferGeometry>(null);
  const pointsMatRef = useRef<THREE.PointsMaterial>(null);
  const glitchGeoRef = useRef<THREE.BufferGeometry>(null);
  const glitchMatRef = useRef<THREE.PointsMaterial>(null);

  const smoothProgress = useRef(0);
  const clock = useRef(new THREE.Clock());

  const GLITCH_COUNT = 160;
  const glitchIdx = useMemo(
    () => Array.from({ length: GLITCH_COUNT }, () => Math.floor(Math.random() * COUNT)),
    []
  );
  const glitchArr = useMemo(() => new Float32Array(GLITCH_COUNT * 3), []);

  useFrame(() => {
    const dt = Math.min(clock.current.getDelta(), 0.05);
    const t = clock.current.elapsedTime;

    smoothProgress.current += (progress - smoothProgress.current) * 0.06;
    const sp = smoothProgress.current;

    if (groupRef.current) {
      groupRef.current.rotation.y += 0.05 * dt;
      groupRef.current.position.x = Math.sin(t * 0.18) * 0.18;
      groupRef.current.position.y = Math.sin(t * 0.27) * 0.1;
      const wingbeat = 1 + Math.sin(t * 1.6) * 0.04 * sp;
      groupRef.current.scale.set(wingbeat, 1, 1);
    }

    for (let i = 0; i < COUNT; i++) {
      const ix = i * 3, iy = i * 3 + 1, iz = i * 3 + 2;
      const localT = smoothstep((sp - delayArr[i]) / 0.45);
      const wob = Math.sin(t * 0.8 + i) * 0.02 * (1 - localT * 0.6);
      posArray[ix] = THREE.MathUtils.lerp(scatterPos[ix], targetPos[ix], localT) + wob;
      posArray[iy] = THREE.MathUtils.lerp(scatterPos[iy], targetPos[iy], localT) + wob * 0.6;
      posArray[iz] = THREE.MathUtils.lerp(scatterPos[iz], targetPos[iz], localT) + wob;
    }
    if (pointsGeoRef.current) {
      (pointsGeoRef.current.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }
    if (pointsMatRef.current) {
      pointsMatRef.current.opacity = 0.5 + sp * 0.4;
    }

    if (Math.random() < 0.5) {
      for (let g = 0; g < GLITCH_COUNT; g++) {
        const src = glitchIdx[g];
        glitchArr[g * 3] = posArray[src * 3] + (Math.random() - 0.5) * 0.3;
        glitchArr[g * 3 + 1] = posArray[src * 3 + 1] + (Math.random() - 0.5) * 0.3;
        glitchArr[g * 3 + 2] = posArray[src * 3 + 2] + (Math.random() - 0.5) * 0.3;
      }
      if (glitchGeoRef.current) {
        (glitchGeoRef.current.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      }
    }
    if (glitchMatRef.current) {
      glitchMatRef.current.opacity =
        (Math.random() < 0.1 ? Math.random() * 0.6 : glitchMatRef.current.opacity * 0.85) * sp;
      glitchMatRef.current.color.setHex(Math.random() < 0.5 ? 0x34e0ff : 0x8b6bff);
    }
  });

  return (
    <group ref={groupRef}>
      <points>
        <bufferGeometry ref={pointsGeoRef}>
          <bufferAttribute attach="attributes-position" args={[posArray, 3]} />
          <bufferAttribute attach="attributes-color" args={[colorArray, 3]} />
        </bufferGeometry>
        <pointsMaterial
          ref={pointsMatRef}
          size={0.055}
          vertexColors
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      <points>
        <bufferGeometry ref={glitchGeoRef}>
          <bufferAttribute attach="attributes-position" args={[glitchArr, 3]} />
        </bufferGeometry>
        <pointsMaterial
          ref={glitchMatRef}
          size={0.09}
          color={0x34e0ff}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
}

/** Drop this in place of the old hp-orb-shell block.
 *  Uses scroll-driven progressive assembly (0 → 1), same as QuantumSphereScreen.
 */
export default function HoloOrb() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const smoothstep = (t: number) => {
      t = Math.min(Math.max(t, 0), 1);
      return t * t * (3 - 2 * t);
    };

    // Track scroll progress: 0 when section is below viewport, 1 when fully scrolled in
    let raf = 0;
    let cur = 0;
    let target = 0;

    const calc = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // raw: 0 when rect.top == vh (just below viewport), 1 when rect.top == -vh*0.2 (well into view)
      const raw = (vh - rect.top) / (vh * 1.2);
      target = smoothstep(Math.min(Math.max(raw, 0), 1));
    };

    const tick = () => {
      raf = 0;
      cur += (target - cur) * 0.08;
      if (Math.abs(target - cur) > 0.0001) setProgress(cur);
      setInView(cur > 0.01);
      if (cur !== target || target > 0) raf = requestAnimationFrame(tick);
    };

    const schedule = () => {
      calc();
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) schedule();
      },
      { threshold: 0.05 }
    );
    io.observe(el);

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    calc();
    schedule();

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="hp-orb-shell relative mx-auto w-full max-w-[520px] shrink-0 lg:mx-0 lg:w-[520px]"
    >
      <div className="relative aspect-square w-full">
        <div
          className="pointer-events-none absolute -inset-8 rounded-[48px] bg-gradient-to-br from-violet/12 via-transparent to-cyan/10 blur-2xl transition-opacity duration-500"
          style={{ opacity: 0.2 + progress * 0.8 }}
        />
          <Canvas
            frameloop={inView ? "always" : "demand"}
            dpr={[1, 1.6]}
            camera={{ position: [0, 0, 6.2], fov: 42 }}
            gl={{ antialias: true, alpha: true }}
            className="relative h-full w-full overflow-hidden rounded-3xl"
          >
            <ButterflyScene progress={progress} />
          </Canvas>
      </div>
    </div>
  );
}
