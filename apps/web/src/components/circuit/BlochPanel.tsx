import React from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { useCircuitStore } from '@/store/circuit';
import type { Gate, GateOp } from '@qvanta/types';

const STATE_0 = new THREE.Vector3(0, 0, 1);

function applyGateUnitary(v: THREE.Vector3, gate: Gate, flip: boolean = false): THREE.Vector3 {
  if (gate === 'CNOT') return flip ? applyGateUnitary(v, 'X') : v.clone();
  const nx = v.x, ny = v.y, nz = v.z;
  switch (gate) {
    case 'X': return new THREE.Vector3(nx, -ny, -nz);
    case 'Y': return new THREE.Vector3(-nx, ny, -nz);
    case 'Z': return new THREE.Vector3(-nx, -ny, nz);
    case 'H': return new THREE.Vector3(nz, -ny, nx);
    default: return v.clone();
  }
}

const computeStepBloch = (
  qubits: number,
  operations: GateOp[],
  upToTimestep: number
): Array<{ x: number; y: number; z: number }> => {
  const vectors: THREE.Vector3[] = Array.from({ length: qubits }, () => STATE_0.clone());
  for (const op of operations) {
    if (op.timestep > upToTimestep) continue;
    if (op.gate === 'CNOT' && op.target !== undefined) {
      const controlZ = vectors[op.qubit].z;
      const flip = controlZ <= 0.05;
      vectors[op.target] = applyGateUnitary(vectors[op.target], 'X', flip);
    } else if (op.gate !== 'Measure') {
      vectors[op.qubit] = applyGateUnitary(vectors[op.qubit], op.gate);
    }
  }
  return vectors.map((v) => ({ x: v.x, y: v.y, z: v.z }));
};

interface BlochSphereProps {
  position: [number, number, number];
  vector: { x: number; y: number; z: number };
}

const AxisLine: React.FC<{ points: [THREE.Vector3, THREE.Vector3]; color?: string }> = ({ points, color = '#334155' }) => {
  const geoRef = React.useRef<THREE.BufferGeometry | null>(null);
  React.useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints(points);
    geoRef.current = g;
    return g;
  }, [points]);
  if (!geoRef.current) return null;
  return <primitive object={geoRef.current} attach="geometry" />;
};

const BlochSphere: React.FC<BlochSphereProps> = ({ position, vector }) => {
  const vLen = Math.sqrt(vector.x ** 2 + vector.y ** 2 + vector.z ** 2);
  const dir = React.useMemo(() => {
    const v = new THREE.Vector3(vector.x, vector.y, vector.z);
    if (v.lengthSq() < 1e-6) return new THREE.Vector3(0, 0, 1);
    return v.normalize();
  }, [vector.x, vector.y, vector.z]);

  const arrowLen = Math.max(0.05, Math.min(1, vLen)) * 0.92;
  const tipPosition = dir.clone().multiplyScalar(arrowLen);

  // rotate arrow shaft + cone to align with direction vector
  const q = React.useMemo(() => {
    const up = new THREE.Vector3(0, 1, 0);
    const target = dir.clone().normalize();
    const quat = new THREE.Quaternion().setFromUnitVectors(up, target);
    return quat;
  }, [dir]);

  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.95, 32, 16]} />
        <meshStandardMaterial color="#1e293b" transparent opacity={0.18} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.95, 20, 12]} />
        <meshBasicMaterial color="#334155" wireframe transparent opacity={0.35} />
      </mesh>
      <lineSegments>
        <AxisLine points={[new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0, 1)]} />
        <lineBasicMaterial color="#334155" />
      </lineSegments>
      <lineSegments>
        <AxisLine points={[new THREE.Vector3(-1, 0, 0), new THREE.Vector3(1, 0, 0)]} />
        <lineBasicMaterial color="#334155" />
      </lineSegments>
      <lineSegments>
        <AxisLine points={[new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 1, 0)]} />
        <lineBasicMaterial color="#334155" />
      </lineSegments>

      <group position={[0, 0, 0]} quaternion={q}>
        <mesh position={[0, arrowLen * 0.5, 0]}>
          <cylinderGeometry args={[0.025, 0.025, arrowLen, 12]} />
          <meshBasicMaterial color="#6366f1" />
        </mesh>
        <mesh position={[0, arrowLen * 1.0, 0]}>
          <coneGeometry args={[0.09, 0.22, 16]} />
          <meshBasicMaterial color="#a855f7" />
        </mesh>
      </group>
      <mesh position={tipPosition.toArray() as [number, number, number]}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshBasicMaterial color="#f59e0b" />
      </mesh>
    </group>
  );
};

const BlochPanel: React.FC = () => {
  const qubits = useCircuitStore((s) => s.qubits);
  const operations = useCircuitStore((s) => s.operations);
  const timesteps = useCircuitStore((s) => s.timesteps);
  const [step, setStep] = React.useState<number>(Math.max(0, timesteps - 1));

  React.useEffect(() => {
    setStep((s) => Math.max(0, Math.min(timesteps - 1, s)));
  }, [timesteps]);

  const bloch = React.useMemo(() => computeStepBloch(qubits, operations, step), [qubits, operations, step]);
  const spacing = qubits <= 1 ? 0 : qubits <= 2 ? 2.5 : qubits <= 4 ? 2.25 : qubits <= 6 ? 2.05 : 1.9;

  return (
    <div className="flex h-full min-h-[480px] flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-bg-800 px-4 py-3">
        <div>
          <h3 className="text-base font-semibold text-text-100">Bloch Spheres</h3>
          <p className="text-xs text-text-500">Per-qubit state after timestep t{step}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={step <= 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="rounded-md border border-bg-700 bg-bg-900 px-2 py-1 text-xs text-text-300 disabled:opacity-40 hover:bg-bg-800"
          >
            ◀ Prev
          </button>
          <span className="font-mono text-xs text-text-400">t{step} / t{Math.max(0, timesteps - 1)}</span>
          <button
            disabled={step >= timesteps - 1}
            onClick={() => setStep((s) => Math.min(timesteps - 1, s + 1))}
            className="rounded-md border border-bg-700 bg-bg-900 px-2 py-1 text-xs text-text-300 disabled:opacity-40 hover:bg-bg-800"
          >
            Next ▶
          </button>
        </div>
      </div>
      <div className="min-h-[360px] flex-1">
        <Canvas camera={{ position: [0, qubits * 0.9 + 1.8, qubits * spacing * 0.8 + 4.5], fov: 45 }}>
          <color attach="background" args={['#020617']} />
          <ambientLight intensity={0.9} />
          <directionalLight position={[4, 6, 5]} intensity={0.55} />
          <group position={[-(qubits - 1) * spacing * 0.5, 0, 0]}>
            {bloch.map((v, i) => (
              <BlochSphere
                key={i}
                position={[i * spacing, 0, 0]}
                vector={v}
              />
            ))}
          </group>
        </Canvas>
      </div>
      <div
        className="grid gap-1 border-t border-bg-800 px-4 py-3 text-xs text-text-400"
        style={{ gridTemplateColumns: qubits <= 2 ? '1fr 1fr' : qubits <= 4 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)' }}
      >
        {bloch.map((v, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="font-mono text-text-200">q{i}:</span>
            <span className="font-mono text-[11px] text-text-400">
              ({v.x.toFixed(2)}, {v.y.toFixed(2)}, {v.z.toFixed(2)})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BlochPanel;
