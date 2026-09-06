import React from 'react';
import { Canvas, useThree, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Grid, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useCircuitStore, GATE_PALETTE } from '@/store/circuit';
import type { Gate, GateOp } from '@qvanta/types';

const QUBIT_SPACING = 1.6;
const STEP_SPACING = 1.4;
const RAIL_LENGTH_OFFSET = 0.8;

interface GateMeshProps {
  gate: Gate;
  position: [number, number, number];
  onPlace?: (world: THREE.Vector3) => void;
  onRemove?: () => void;
  onDragPalette?: () => void;
  paletteDragSource?: boolean;
  selected?: boolean;
  onClickSelect?: () => void;
}

const GateMesh: React.FC<GateMeshProps> = ({
  gate,
  position,
  onPlace,
  onRemove,
  onDragPalette,
  paletteDragSource,
  selected,
  onClickSelect
}) => {
  const [dragging, setDragging] = React.useState(false);
  const dragStart = React.useRef<THREE.Vector3 | null>(null);
  const { camera } = useThree();

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (paletteDragSource) {
      e.stopPropagation();
      (e.target as HTMLElement | any)?.setPointerCapture?.(e.pointerId);
      setDragging(true);
      dragStart.current = e.point.clone();
      onDragPalette?.();
    } else if (onClickSelect) {
      e.stopPropagation();
      onClickSelect();
    }
  };

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!dragging || !paletteDragSource) return;
    // no-op — visual only; placement happens on pointerUp via DroppableFloor
  };

  const onPointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (dragging && paletteDragSource) {
      e.stopPropagation();
      setDragging(false);
      dragStart.current = null;
      onPlace?.(e.point.clone());
    }
  };

  const color =
    gate === 'H' ? '#4f46e5' :
    gate === 'X' ? '#a855f7' :
    gate === 'Y' ? '#ec4899' :
    gate === 'Z' ? '#10b981' :
    gate === 'CNOT' ? '#f59e0b' :
    '#ef4444';

  const isCNOT = gate === 'CNOT';

  return (
    <group
      position={position}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { if (paletteDragSource) setDragging(false); }}
    >
      <mesh position={[0, 0.6, 0]} castShadow>
        {isCNOT ? (
          <cylinderGeometry args={[0.32, 0.32, 0.5, 16]} />
        ) : (
          <boxGeometry args={[0.7, 0.7, 0.7]} />
        )}
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={selected ? 0.6 : dragging ? 0.5 : 0.18}
        />
      </mesh>
      <Html
        center
        distanceFactor={6}
        position={[0, 0.6, 0.51]}
        style={{
          pointerEvents: 'none',
          color: 'white',
          fontSize: 14,
          fontWeight: 700,
          userSelect: 'none',
          textShadow: '0 1px 2px rgba(0,0,0,0.8)'
        }}
      >
        {gate}
      </Html>
      {!paletteDragSource && onRemove && (
        <Html position={[0.4, 1.15, 0]} center distanceFactor={10} style={{ pointerEvents: 'auto' }}>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            title="Remove gate (double-click in 2D view)"
            className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white opacity-90 hover:bg-red-500"
          >
            ×
          </button>
        </Html>
      )}
    </group>
  );
};

const GatePalette: React.FC<{ maxStep: number; onDrop: (g: Gate, p: THREE.Vector3) => void }> = ({ maxStep, onDrop }) => {
  const selected = useCircuitStore((s) => s.selectedGate);
  const setSelected = useCircuitStore((s) => s.setSelectedGate);
  const [draggingGate, setDraggingGate] = React.useState<Gate | null>(null);
  const groupRef = React.useRef<THREE.Group | null>(null);

  // set a global so floor onPointerUp can see the currently-dragged palette gate
  React.useEffect(() => {
    const w = window as any;
    w.__qvantaDraggingGate = draggingGate;
  }, [draggingGate]);

  return (
    <group position={[-STEP_SPACING * (maxStep / 2 + 2), 0, 0]} ref={groupRef}>
      {GATE_PALETTE.map((g, i) => (
        <group
          key={g}
          position={[0, 0, (i - (GATE_PALETTE.length - 1) / 2) * QUBIT_SPACING]}
        >
          <GateMesh
            gate={g}
            position={[0, 0, 0]}
            selected={selected === g}
            paletteDragSource
            onDragPalette={() => setDraggingGate(g)}
            onPlace={(p) => {
              setDraggingGate(null);
              onDrop(g, p);
            }}
          />
          <mesh
            position={[0, 0.6, 0]}
            onClick={(e) => {
              e.stopPropagation();
              setSelected(g);
            }}
          >
            <boxGeometry args={[1.1, 1.1, 1.1]} />
            <meshBasicMaterial transparent opacity={0} />
          </mesh>
          <Html center distanceFactor={8} position={[0, -0.2, 0]} style={{ color: '#94a3b8', fontSize: 10, pointerEvents: 'none' }}>
            drag ↓ · click to select
          </Html>
        </group>
      ))}
    </group>
  );
};

interface QubitRailProps {
  index: number;
  qubitCount: number;
  timesteps: number;
}

const QubitRail: React.FC<QubitRailProps> = ({ index, qubitCount, timesteps }) => {
  const z = (index - (qubitCount - 1) / 2) * QUBIT_SPACING;
  const length = (timesteps + RAIL_LENGTH_OFFSET) * STEP_SPACING;
  const colors = ['#6366f1', '#a855f7', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16'];
  return (
    <group>
      <mesh position={[0, 0, z]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, length, 12]} />
        <meshStandardMaterial color={colors[index % colors.length]} emissive={colors[index % colors.length]} emissiveIntensity={0.2} />
      </mesh>
      {Array.from({ length: timesteps }).map((_, t) => (
        <mesh key={t} position={[(t - (timesteps - 1) / 2) * STEP_SPACING, 0, z]}>
          <sphereGeometry args={[0.08, 12, 12]} />
          <meshStandardMaterial color={colors[index % colors.length]} emissive={colors[index % colors.length]} emissiveIntensity={0.4} />
        </mesh>
      ))}
      <Html position={[-(length / 2) - 0.6, 0, z]} center distanceFactor={10} style={{ color: '#64748b', fontSize: 12, pointerEvents: 'none' }}>
        q<sub>{index}</sub>
      </Html>
    </group>
  );
};

interface DroppableFloorProps {
  onDrop: (gate: Gate, local: THREE.Vector3) => void;
}

const DroppableFloor: React.FC<DroppableFloorProps> = ({ onDrop }) => {
  const qubits = useCircuitStore((s) => s.qubits);
  const timesteps = useCircuitStore((s) => s.timesteps);
  const selectedGate = useCircuitStore((s) => s.selectedGate);
  const setCursor = useCircuitStore((s) => s.setCursor);
  const placeGateAtCursor = useCircuitStore((s) => s.placeGateAtCursor);

  const width = (timesteps + 3) * STEP_SPACING;
  const depth = (qubits + 2) * QUBIT_SPACING;

  const snapToCell = (world: THREE.Vector3): { qubit: number; timestep: number } => {
    const qubitF = world.z / QUBIT_SPACING + (qubits - 1) / 2;
    const timestepF = world.x / STEP_SPACING + (timesteps - 1) / 2;
    const qubit = Math.max(0, Math.min(qubits - 1, Math.round(qubitF)));
    const timestep = Math.max(0, Math.min(timesteps - 1, Math.round(timestepF)));
    return { qubit, timestep };
  };

  const handlePlaceAt = (point: THREE.Vector3, gateOverride?: Gate) => {
    const cell = snapToCell(point);
    const gate = gateOverride ?? selectedGate;
    setCursor(cell);
    if (gate) {
      const op: GateOp = { gate, qubit: cell.qubit, timestep: cell.timestep };
      if (gate === 'CNOT') op.target = (cell.qubit + 1) % qubits;
      const state = useCircuitStore.getState();
      const { upsertOperation } = require('@/lib/circuit');
      const next = upsertOperation(state.operations, op);
      useCircuitStore.setState({ operations: next });
    }
  };

  const onPointerUp = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const w = window as any;
    const dragged: Gate | null = w.__qvantaDraggingGate ?? null;
    if (dragged) {
      w.__qvantaDraggingGate = null;
      handlePlaceAt(e.point.clone(), dragged);
    } else if (selectedGate) {
      handlePlaceAt(e.point.clone());
    }
  };

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      receiveShadow
      onPointerUp={onPointerUp}
      onDoubleClick={(e) => {
        e.stopPropagation();
        placeGateAtCursor(selectedGate ?? 'H');
      }}
    >
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial transparent opacity={0.14} color="#1e293b" />
    </mesh>
  );
};

const CircuitScene3D: React.FC = () => {
  const qubits = useCircuitStore((s) => s.qubits);
  const timesteps = useCircuitStore((s) => s.timesteps);
  const operations = useCircuitStore((s) => s.operations);
  const cursor = useCircuitStore((s) => s.cursor);
  const removeAt = useCircuitStore((s) => s.removeAt);
  const setCursor = useCircuitStore((s) => s.setCursor);
  const placeGateAtCursor = useCircuitStore((s) => s.placeGateAtCursor);
  const selectedGate = useCircuitStore((s) => s.selectedGate);

  const containerRef = React.useRef<HTMLDivElement>(null);

  const gatePosition = (op: GateOp): [number, number, number] => {
    const x = (op.timestep - (timesteps - 1) / 2) * STEP_SPACING;
    const z = (op.qubit - (qubits - 1) / 2) * QUBIT_SPACING;
    return [x, 0, z];
  };

  const handleDropFromPalette = (gate: Gate, world: THREE.Vector3) => {
    const qubitF = world.z / QUBIT_SPACING + (qubits - 1) / 2;
    const timestepF = world.x / STEP_SPACING + (timesteps - 1) / 2;
    const qubit = Math.max(0, Math.min(qubits - 1, Math.round(qubitF)));
    const timestep = Math.max(0, Math.min(timesteps - 1, Math.round(timestepF)));
    const op: GateOp = { gate, qubit, timestep };
    if (gate === 'CNOT') op.target = (qubit + 1) % qubits;
    const state = useCircuitStore.getState();
    const { upsertOperation } = require('@/lib/circuit');
    const next = upsertOperation(state.operations, op);
    useCircuitStore.setState({ operations: next });
  };

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = useCircuitStore.getState();
      let c = { ...st.cursor };
      let handled = true;
      switch (e.key) {
        case 'ArrowLeft': c.timestep = Math.max(0, c.timestep - 1); break;
        case 'ArrowRight': c.timestep = Math.min(timesteps - 1, c.timestep + 1); break;
        case 'ArrowUp': c.qubit = Math.max(0, c.qubit - 1); break;
        case 'ArrowDown': c.qubit = Math.min(qubits - 1, c.qubit + 1); break;
        case 'Enter':
        case ' ':
          placeGateAtCursor(selectedGate ?? 'H');
          break;
        case 'Delete':
        case 'Backspace':
          removeAt(st.cursor.qubit, st.cursor.timestep);
          break;
        default: handled = false;
      }
      if (handled) {
        e.preventDefault();
        setCursor(c);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [qubits, timesteps, selectedGate, setCursor, placeGateAtCursor, removeAt]);

  React.useEffect(() => {
    const toQasm = () => {
      const s = useCircuitStore.getState();
      const { circuitToQasmLike } = require('@/lib/circuit');
      return circuitToQasmLike({ qubits: s.qubits, timesteps: s.timesteps, operations: s.operations });
    };
    const w = window as any;
    w.__qvantaCircuitStoreGetState = () => useCircuitStore.getState();
    w.__qvantaCircuitStoreLoad = (c: any) => useCircuitStore.getState().load(c);
    w.__qvantaCircuitToQasm = toQasm;
  }, []);

  const cursorPosX = (cursor.timestep - (timesteps - 1) / 2) * STEP_SPACING;
  const cursorPosZ = (cursor.qubit - (qubits - 1) / 2) * QUBIT_SPACING;

  const bgWidth = (timesteps + 2) * STEP_SPACING;
  const bgDepth = (qubits + 1.5) * QUBIT_SPACING;

  return (
    <div ref={containerRef} className="h-full w-full">
      <Canvas
        shadows
        camera={{
          position: [
            STEP_SPACING * (timesteps / 2 + 0.5),
            QUBIT_SPACING * qubits * 0.9 + 2.2,
            QUBIT_SPACING * (qubits + 3.5)
          ],
          fov: 45
        }}
      >
        <color attach="background" args={['#020617']} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 8, 5]} intensity={0.7} castShadow />

        <Grid
          position={[0, -0.001, 0]}
          args={[Math.max(18, bgWidth), Math.max(18, bgDepth)]}
          cellSize={1}
          cellThickness={0.4}
          cellColor="#1e293b"
          sectionSize={5}
          sectionThickness={0.8}
          sectionColor="#334155"
          fadeDistance={40}
          fadeStrength={1}
          followCamera={false}
          infiniteGrid={false}
        />

        <DroppableFloor onDrop={handleDropFromPalette} />

        <GatePalette maxStep={timesteps} onDrop={handleDropFromPalette} />

        {Array.from({ length: qubits }).map((_, i) => (
          <QubitRail key={i} index={i} qubitCount={qubits} timesteps={timesteps} />
        ))}

        {operations.map((op, idx) => {
          const p = gatePosition(op);
          return (
            <GateMesh
              key={`${op.gate}-${op.qubit}-${op.timestep}-${op.target ?? 'x'}-${idx}`}
              gate={op.gate}
              position={p}
              onPlace={(world) => handleDropFromPalette(op.gate, world)}
              onRemove={() => removeAt(op.qubit, op.timestep, op.target)}
            />
          );
        })}

        <mesh position={[cursorPosX, 0.05, cursorPosZ]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.38, 0.5, 32]} />
          <meshBasicMaterial color="#6366f1" transparent opacity={0.85} side={THREE.DoubleSide} />
        </mesh>

        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minDistance={3}
          maxDistance={35}
          target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  );
};

export default CircuitScene3D;
