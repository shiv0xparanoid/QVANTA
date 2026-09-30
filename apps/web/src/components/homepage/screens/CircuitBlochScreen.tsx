import React from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import HomepageSceneLighting from '@/components/homepage/HomepageSceneLighting';
import { usePrefersReducedMotion } from '@/hooks';
import { smoothstep } from '@/lib/quantumTorus';

const NUM_QUBITS = 3;
const NUM_STEPS = 4;
const QUBIT_Z = [-1.4, 0, 1.4];
const STEP_X = [-1.8, -0.4, 1.0, 2.4];

function Rail({ z }: { z: number }) {
  const geom = React.useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pts: number[] = [];
    const dashes: number[] = [];
    const startX = STEP_X[0] - 0.8;
    const endX = STEP_X[STEP_X.length - 1] + 0.8;
    const segments = 120;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = startX + (endX - startX) * t;
      pts.push(x, 0, z);
      dashes.push(i % 6 < 4 ? 1 : 0);
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [z]);
  const railLine = React.useMemo(() => {
    return new THREE.Line(
      geom,
      new THREE.LineBasicMaterial({
        color: new THREE.Color('#9a96bd'),
        transparent: true,
        opacity: 0.35
      })
    );
  }, [geom]);
  return (
    <group>
      <primitive object={railLine} dispose={null} />
      <mesh position={[0, 0, z]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.018, 0.018, STEP_X[STEP_X.length - 1] - STEP_X[0] + 1.6, 16]} />
        <meshStandardMaterial
          color="#1a1733"
          emissive="#8b6bff"
          emissiveIntensity={0.05}
          metalness={0.3}
          roughness={0.6}
        />
      </mesh>
      {STEP_X.map((x, i) => (
        <mesh key={i} position={[x, -0.03, z]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.05, 0.008, 6, 20]} />
          <meshBasicMaterial color="#34e0ff" transparent opacity={0.22} />
        </mesh>
      ))}
    </group>
  );
}

function HGate({ x, z, phase }: { x: number; z: number; phase: number }) {
  const reduced = usePrefersReducedMotion();
  const meshRef = React.useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = reduced ? 0 : clock.elapsedTime;
    const pulse = 0.82 + Math.sin(t * 1.85 + phase) * 0.18;
    const m = meshRef.current.material as THREE.MeshStandardMaterial;
    m.emissiveIntensity = 0.45 + pulse * 0.5;
    meshRef.current.scale.setScalar(reduced ? 1 : 0.97 + Math.sin(t * 2.1 + phase) * 0.04);
  });
  return (
    <group position={[x, 0, z]}>
      <mesh ref={meshRef}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial
          color="#8b6bff"
          emissive="#8b6bff"
          emissiveIntensity={0.5}
          metalness={0.2}
          roughness={0.3}
        />
      </mesh>
      <Html position={[0, 0, 0.28]} center style={{ pointerEvents: 'none' }}>
        <div
          className="font-mono-quantum text-[18px] font-bold"
          style={{ color: '#06050f', textShadow: '0 0 6px rgba(139,107,255,0.5)' }}
        >
          H
        </div>
      </Html>
    </group>
  );
}

function XGate({ x, z, phase }: { x: number; z: number; phase: number }) {
  const reduced = usePrefersReducedMotion();
  const meshRef = React.useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = reduced ? 0 : clock.elapsedTime;
    const pulse = 0.8 + Math.sin(t * 1.8 + phase) * 0.2;
    const m = meshRef.current.material as THREE.MeshStandardMaterial;
    m.emissiveIntensity = 0.4 + pulse * 0.55;
    meshRef.current.scale.setScalar(reduced ? 1 : 0.97 + Math.sin(t * 2.0 + phase) * 0.04);
  });
  return (
    <group position={[x, 0, z]}>
      <mesh ref={meshRef}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial
          color="#a855f7"
          emissive="#a855f7"
          emissiveIntensity={0.5}
          metalness={0.2}
          roughness={0.3}
        />
      </mesh>
      <Html position={[0, 0, 0.28]} center style={{ pointerEvents: 'none' }}>
        <div className="font-mono-quantum text-[18px] font-bold" style={{ color: '#06050f' }}>
          X
        </div>
      </Html>
    </group>
  );
}

function CNOTGate({
  controlZ,
  targetZ,
  x,
  phase
}: {
  controlZ: number;
  targetZ: number;
  x: number;
  phase: number;
}) {
  const reduced = usePrefersReducedMotion();
  const controlRef = React.useRef<THREE.Mesh>(null);
  const targetRef = React.useRef<THREE.Mesh>(null);
  const linkRef = React.useRef<THREE.Line>(null);
  useFrame(({ clock }) => {
    const t = reduced ? 0 : clock.elapsedTime;
    const pulse = 0.78 + Math.sin(t * 1.9 + phase) * 0.22;
    if (controlRef.current) {
      const m = controlRef.current.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = 0.5 + pulse * 0.5;
    }
    if (targetRef.current) {
      const m = targetRef.current.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = 0.45 + pulse * 0.45;
      targetRef.current.scale.setScalar(reduced ? 1 : 0.97 + Math.sin(t * 2.2 + phase) * 0.035);
    }
  });
  const linkGeom = React.useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pts = new Float32Array([x, 0.26, controlZ, x, 0.26, targetZ]);
    g.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    return g;
  }, [controlZ, targetZ, x]);
  return (
    <group>
      <mesh ref={controlRef} position={[x, 0, controlZ]}>
        <sphereGeometry args={[0.08, 18, 18]} />
        <meshStandardMaterial
          color="#f59e0b"
          emissive="#f59e0b"
          emissiveIntensity={0.6}
          metalness={0.4}
          roughness={0.25}
        />
      </mesh>
      <lineSegments ref={linkRef as any} geometry={linkGeom}>
        <lineBasicMaterial
          color="#f59e0b"
          transparent
          opacity={0.55}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
      <mesh ref={targetRef} position={[x, 0, targetZ]}>
        <cylinderGeometry args={[0.26, 0.26, 0.22, 22]} />
        <meshStandardMaterial
          color="#34e0ff"
          emissive="#34e0ff"
          emissiveIntensity={0.45}
          metalness={0.2}
          roughness={0.35}
        />
      </mesh>
      <mesh position={[x, 0.23, targetZ]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.2, 0.025, 8, 28]} />
        <meshBasicMaterial color="#34e0ff" transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

function MeasureGate({ x, z, phase }: { x: number; z: number; phase: number }) {
  const reduced = usePrefersReducedMotion();
  const meshRef = React.useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = reduced ? 0 : clock.elapsedTime;
    const m = meshRef.current.material as THREE.MeshStandardMaterial;
    m.emissiveIntensity = 0.25 + Math.sin(t * 1.5 + phase) * 0.2;
  });
  return (
    <group position={[x, 0, z]}>
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.08, 28]} />
        <meshStandardMaterial
          color="#13102a"
          emissive="#34e0ff"
          emissiveIntensity={0.3}
          metalness={0.5}
          roughness={0.35}
          transparent
          opacity={0.88}
        />
      </mesh>
      <mesh position={[0, 0.06, z]}>
        <ringGeometry args={[0.22, 0.26, 32]} />
        <meshBasicMaterial color="#34e0ff" transparent opacity={0.55} side={THREE.DoubleSide} />
      </mesh>
      <Html position={[0, 0.02, 0.26]} center style={{ pointerEvents: 'none' }}>
        <div
          className="font-mono-quantum text-[11px]"
          style={{ color: '#34e0ff', letterSpacing: '0.04em' }}
        >
          M
        </div>
      </Html>
    </group>
  );
}

function EntanglementLink({
  x0,
  z0,
  x1,
  z1,
  phase
}: {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  phase: number;
}) {
  const reduced = usePrefersReducedMotion();
  const geom = React.useMemo(() => {
    const segments = 40;
    const pts = new Float32Array((segments + 1) * 3);
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = x0 + (x1 - x0) * t;
      const z = z0 + (z1 - z0) * t;
      const arc = Math.sin(t * Math.PI) * 0.55;
      pts[i * 3 + 0] = x;
      pts[i * 3 + 1] = 0.35 + arc;
      pts[i * 3 + 2] = z;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    return g;
  }, [x0, z0, x1, z1]);
  const linkLine = React.useMemo(() => {
    const line = new THREE.Line(
      geom,
      new THREE.LineBasicMaterial({
        color: new THREE.Color('#8b6bff'),
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    return line;
  }, [geom]);
  useFrame(({ clock }) => {
    const t = reduced ? 0.4 : 0.25 + Math.sin(clock.elapsedTime * 1.2 + phase) * 0.25;
    linkLine.material.opacity = t;
  });
  return <primitive object={linkLine} dispose={null} />;
}

const CircuitScene: React.FC = () => {
  return (
    <>
      <HomepageSceneLighting />
      <group position={[-0.3, 0, 0]}>
        {QUBIT_Z.map((z, i) => (
          <Rail key={i} z={z} />
        ))}
        <HGate x={STEP_X[0]} z={QUBIT_Z[0]} phase={0} />
        <CNOTGate controlZ={QUBIT_Z[0]} targetZ={QUBIT_Z[2]} x={STEP_X[1]} phase={1.2} />
        <XGate x={STEP_X[2]} z={QUBIT_Z[1]} phase={2.1} />
        <MeasureGate x={STEP_X[3]} z={QUBIT_Z[1]} phase={3.0} />
        <MeasureGate x={STEP_X[3]} z={QUBIT_Z[2]} phase={3.4} />
        <EntanglementLink x0={STEP_X[1]} z0={QUBIT_Z[0]} x1={STEP_X[1]} z1={QUBIT_Z[2]} phase={1.7} />
      </group>
    </>
  );
};

const CYCLE_TOTAL = 10;
const PHASES: Array<{ end: number; target: THREE.Vector3; color: THREE.Color; label: string }> = [
  { end: 2, target: new THREE.Vector3(0, 0, 1.15), color: new THREE.Color('#34e0ff'), label: '|0⟩' },
  {
    end: 4.5,
    target: new THREE.Vector3(1.15, 0, 0),
    color: new THREE.Color('#8b6bff'),
    label: 'H → |+⟩'
  },
  {
    end: 7,
    target: new THREE.Vector3(-1.15, 0, 0),
    color: new THREE.Color('#34e0ff'),
    label: 'X → |−⟩'
  },
  {
    end: 9,
    target: new THREE.Vector3(0, 0, 1.15),
    color: new THREE.Color('#8b6bff'),
    label: 'H → |0⟩'
  },
  { end: 10, target: new THREE.Vector3(0, 0, 1.15), color: new THREE.Color('#34e0ff'), label: '|0⟩ rest' }
];

function phaseFor(t: number) {
  for (let i = 0; i < PHASES.length; i++) {
    if (t <= PHASES[i].end) return i;
  }
  return PHASES.length - 1;
}

function vectorAndColorForTime(rawT: number, reduced: boolean) {
  if (reduced) {
    const midVec = new THREE.Vector3(1.15, 0, 0).multiplyScalar(0.55).add(new THREE.Vector3(0, 0, 0.58));
    return {
      vec: midVec,
      color: new THREE.Color('#8b6bff'),
      phaseIndex: 1,
      phaseProgress: 0.5
    };
  }
  const t = rawT % CYCLE_TOTAL;
  const idx = phaseFor(t);
  const prev = idx === 0 ? { end: 0, target: PHASES[0].target.clone() } : PHASES[idx - 1];
  const curr = PHASES[idx];
  const span = curr.end - prev.end;
  const local = span <= 0.001 ? 1 : smoothstep(prev.end, curr.end, t);
  const lerpedVec = prev.target.clone().lerp(curr.target.clone(), local);
  const lerpedColor = new THREE.Color().lerpColors(
    idx === 0 ? curr.color.clone() : PHASES[idx - 1].color,
    curr.color,
    local
  );
  return { vec: lerpedVec, color: lerpedColor, phaseIndex: idx, phaseProgress: local };
}

const BlochShowcaseScene: React.FC = () => {
  const reduced = usePrefersReducedMotion();
  const arrowRef = React.useRef<THREE.Line>(null);
  const tipRef = React.useRef<THREE.Mesh>(null);
  const shaftGeom = React.useMemo(() => {
    const g = new THREE.BufferGeometry();
    const arr = new Float32Array([0, 0, 0, 0, 0.001, 0]);
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    return g;
  }, []);
  const timeRef = React.useRef(0);
  const arrowLine = React.useMemo(() => {
    return new THREE.Line(
      shaftGeom,
      new THREE.LineBasicMaterial({
        color: new THREE.Color('#34e0ff'),
        linewidth: 3,
        transparent: true,
        opacity: 0.95
      })
    );
  }, [shaftGeom]);
  useFrame(({ clock }, dt) => {
    timeRef.current += reduced ? 0 : dt;
    const { vec, color } = vectorAndColorForTime(timeRef.current, reduced);
    const arr = shaftGeom.attributes.position.array as Float32Array;
    arr[3] = vec.x;
    arr[4] = vec.y;
    arr[5] = vec.z;
    shaftGeom.attributes.position.needsUpdate = true;
    arrowLine.material.color.copy(color);
    if (tipRef.current) {
      tipRef.current.position.copy(vec);
      const m = tipRef.current.material as THREE.MeshStandardMaterial;
      m.color.copy(color);
      m.emissive.copy(color);
      m.emissiveIntensity = 0.7;
      const up = new THREE.Vector3(0, 1, 0);
      const target = vec.clone().normalize();
      if (target.lengthSq() > 1e-4) {
        const q = new THREE.Quaternion().setFromUnitVectors(up, target);
        tipRef.current.quaternion.copy(q);
      }
    }
  });
  const equatorGeom = React.useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 80; i++) {
      const a = (i / 80) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * 1.15, 0, Math.sin(a) * 1.15));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);
  const equatorLine = React.useMemo(() => {
    return new THREE.Line(
      equatorGeom,
      new THREE.LineBasicMaterial({ color: new THREE.Color('#9a96bd'), transparent: true, opacity: 0.22 })
    );
  }, [equatorGeom]);
  const meridianGeom = React.useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 80; i++) {
      const a = (i / 80) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * 1.15, Math.sin(a) * 1.15, 0));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);
  const meridianLine = React.useMemo(() => {
    return new THREE.Line(
      meridianGeom,
      new THREE.LineBasicMaterial({ color: new THREE.Color('#9a96bd'), transparent: true, opacity: 0.18 })
    );
  }, [meridianGeom]);
  const axisXGeom = React.useMemo(
    () =>
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-1.35, 0, 0),
        new THREE.Vector3(1.35, 0, 0)
      ]),
    []
  );
  const axisXLine = React.useMemo(() => {
    return new THREE.Line(
      axisXGeom,
      new THREE.LineBasicMaterial({ color: new THREE.Color('#9a96bd'), transparent: true, opacity: 0.3 })
    );
  }, [axisXGeom]);
  const axisZGeom = React.useMemo(
    () =>
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, -1.35, 0),
        new THREE.Vector3(0, 1.35, 0)
      ]),
    []
  );
  const axisZLine = React.useMemo(() => {
    return new THREE.Line(
      axisZGeom,
      new THREE.LineBasicMaterial({ color: new THREE.Color('#9a96bd'), transparent: true, opacity: 0.3 })
    );
  }, [axisZGeom]);
  return (
    <>
      <HomepageSceneLighting />
      <group rotation={[Math.PI * 0.18, -0.45, 0]}>
        <mesh>
          <sphereGeometry args={[1.15, 40, 24]} />
          <meshStandardMaterial
            color="#0a0918"
            transparent
            opacity={0.22}
            side={THREE.BackSide}
            metalness={0.1}
            roughness={0.85}
          />
        </mesh>
        <mesh>
          <sphereGeometry args={[1.15, 40, 24]} />
          <meshBasicMaterial
            color="#8b6bff"
            wireframe
            transparent
            opacity={0.16}
            depthWrite={false}
          />
        </mesh>
        <primitive object={equatorLine} dispose={null} />
        <primitive object={meridianLine} dispose={null} />
        <primitive object={axisXLine} dispose={null} />
        <primitive object={axisZLine} dispose={null} />
        <primitive object={arrowLine} ref={arrowRef} dispose={null} />
        <mesh ref={tipRef}>
          <coneGeometry args={[0.07, 0.18, 18]} />
          <meshStandardMaterial
            color="#34e0ff"
            emissive="#34e0ff"
            emissiveIntensity={0.7}
            metalness={0.15}
            roughness={0.3}
          />
        </mesh>
        <Html position={[0, 1.55, 0]} center style={{ pointerEvents: 'none' }}>
          <div className="font-mono-quantum text-[13px] font-semibold" style={{ color: '#34e0ff' }}>
            |0⟩
          </div>
        </Html>
        <Html position={[0, -1.55, 0]} center style={{ pointerEvents: 'none' }}>
          <div className="font-mono-quantum text-[13px] font-semibold" style={{ color: '#8b6bff' }}>
            |1⟩
          </div>
        </Html>
        <Html position={[1.55, 0, 0]} center style={{ pointerEvents: 'none' }}>
          <div className="font-mono-quantum text-[11px]" style={{ color: '#9a96bd' }}>
            x
          </div>
        </Html>
        <Html position={[0, 0, -1.55]} center style={{ pointerEvents: 'none' }}>
          <div className="font-mono-quantum text-[11px]" style={{ color: '#9a96bd' }}>
            y
          </div>
        </Html>
      </group>
    </>
  );
};

interface WindowChromeProps {
  label: string;
}

const WindowChrome: React.FC<WindowChromeProps> = ({ label }) => (
  <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
    <div className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
      <span className="h-2.5 w-2.5 rounded-full bg-amber-300/70" />
      <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
      <span className="ml-3 font-mono-quantum text-[11px] tracking-[0.1em] text-ink-dim/80">
        {label}
      </span>
    </div>
    <span className="rounded-full border border-violet/25 bg-violet/8 px-2 py-0.5 font-mono-quantum text-[9px] tracking-[0.12em] text-violet">
      showcase
    </span>
  </div>
);

const CircuitBlochScreen: React.FC = () => {
  return (
    <section
      id="circuit-showcase"
      className="relative isolate min-h-[110svh] w-full overflow-hidden py-24"
      aria-labelledby="cb-title"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-bg-1 via-bg-2/40 to-bg-1" />
      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 md:px-8">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <p className="mb-3 font-mono-quantum text-xs tracking-[0.22em] text-violet/85">
            gate.matrix · 3D · H X CNOT
          </p>
          <h2
            id="cb-title"
            className="font-display text-[clamp(1.6rem,2.7vw,2.4rem)] font-semibold leading-[1.08] text-ink"
          >
            Run gates in three dimensions. Watch state vectors{' '}
            <span className="qvanta-gradient-text">form in real time</span>.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-ink-dim">
            Left: the circuit you drag and drop on rails. Right: what each gate actually does to a
            qubit on the Bloch sphere. No hidden math. No black boxes.
          </p>
        </div>

        <div className="relative grid grid-cols-1 items-stretch gap-8 lg:grid-cols-2 lg:gap-14">
          <div className="flex flex-col">
            <div className="group relative overflow-hidden rounded-2xl border border-white/5 bg-bg-2/60 shadow-[0_22px_70px_-24px_rgba(139,107,255,0.38)] backdrop-blur-sm">
              <WindowChrome label="circuit.3d" />
              <div className="relative h-[480px] w-full">
                <Canvas
                  frameloop="always"
                  dpr={[1, 1.6]}
                  camera={{ position: [0, 2.1, 5.2], fov: 42 }}
                  gl={{ antialias: true, alpha: true }}
                  className="h-full w-full"
                >
                  <CircuitScene />
                </Canvas>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-bg-2/60 to-transparent" />
              </div>
            </div>
            <div className="relative mt-4 flex items-start justify-start pl-4">
              <svg
                className="hp-cb-conn pointer-events-none -mt-[2px]"
                width="180"
                height="62"
                viewBox="0 0 180 62"
                fill="none"
                aria-hidden
              >
                <defs>
                  <marker
                    id="cb-left-arrow"
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#8b6bff" />
                  </marker>
                </defs>
                <path
                  d="M 140 60 C 130 20 80 10 20 10"
                  stroke="#8b6bff"
                  strokeWidth="1.6"
                  fill="none"
                  strokeLinecap="round"
                  markerEnd="url(#cb-left-arrow)"
                  style={{ opacity: 0.85 }}
                />
              </svg>
              <div className="ml-2 rounded-lg border border-violet/20 bg-violet/8 px-3 py-1.5 backdrop-blur-sm">
                <div className="font-display text-sm font-semibold text-ink">3D circuit</div>
                <div className="font-mono-quantum text-[10px] tracking-wider text-ink-dim/80">
                  drag · drop · run
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col">
            <div className="group relative overflow-hidden rounded-2xl border border-white/5 bg-bg-2/60 shadow-[0_22px_70px_-24px_rgba(52,224,255,0.32)] backdrop-blur-sm">
              <WindowChrome label="bloch.vector · q₀" />
              <div className="relative h-[480px] w-full">
                <Canvas
                  frameloop="always"
                  dpr={[1, 1.6]}
                  camera={{ position: [0, 0.5, 4.6], fov: 44 }}
                  gl={{ antialias: true, alpha: true }}
                  className="h-full w-full"
                >
                  <BlochShowcaseScene />
                </Canvas>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-bg-2/60 to-transparent" />
              </div>
            </div>
            <div className="relative mt-4 flex items-start justify-end pr-4">
              <div className="mr-2 rounded-lg border border-cyan/20 bg-cyan/8 px-3 py-1.5 text-right backdrop-blur-sm">
                <div className="font-display text-sm font-semibold text-ink">Vector formation</div>
                <div className="font-mono-quantum text-[10px] tracking-wider text-ink-dim/80">
                  H · X · H cycle
                </div>
              </div>
              <svg
                className="hp-cb-conn pointer-events-none -mt-[2px]"
                width="180"
                height="62"
                viewBox="0 0 180 62"
                fill="none"
                aria-hidden
                style={{ transform: 'scaleX(-1)' }}
              >
                <defs>
                  <marker
                    id="cb-right-arrow"
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#34e0ff" />
                  </marker>
                </defs>
                <path
                  d="M 140 60 C 130 20 80 10 20 10"
                  stroke="#34e0ff"
                  strokeWidth="1.6"
                  fill="none"
                  strokeLinecap="round"
                  markerEnd="url(#cb-right-arrow)"
                  style={{ opacity: 0.85 }}
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-14 flex max-w-2xl flex-wrap items-center justify-center gap-x-6 gap-y-3 text-center">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-violet shadow-[0_0_8px_rgba(139,107,255,0.8)]" />
            <span className="font-mono-quantum text-[11px] tracking-wider text-ink-dim">
              violet = superposition
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan shadow-[0_0_8px_rgba(52,224,255,0.8)]" />
            <span className="font-mono-quantum text-[11px] tracking-wider text-ink-dim">
              cyan = collapsed / measured
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CircuitBlochScreen;
