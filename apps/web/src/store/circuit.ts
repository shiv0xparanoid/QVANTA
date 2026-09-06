import { create } from 'zustand';
import type { Circuit, Gate, GateOp } from '@qvanta/types';
import { createEmptyCircuit, upsertOperation, removeOperation } from '@/lib/circuit';

export const GATE_PALETTE: Gate[] = ['H', 'X', 'Y', 'Z', 'CNOT', 'Measure'];

interface CircuitStoreState extends Circuit {
  selectedGate: Gate | null;
  cursor: { qubit: number; timestep: number };
  setQubits: (n: number) => void;
  setTimesteps: (n: number) => void;
  setSelectedGate: (g: Gate | null) => void;
  setCursor: (c: { qubit: number; timestep: number }) => void;
  placeGate: (op: Omit<GateOp, 'id'>) => void;
  placeGateAtCursor: (gate: Gate) => void;
  removeAt: (qubit: number, timestep: number, target?: number) => void;
  applyOperations: (ops: GateOp[]) => void;
  load: (c: Circuit) => void;
  reset: () => void;
}

const DEFAULT_QUBITS = 4;
const DEFAULT_TIMESTEPS = 8;

export const useCircuitStore = create<CircuitStoreState>((set, get) => {
  const base = createEmptyCircuit();
  const initial: Circuit = {
    qubits: DEFAULT_QUBITS,
    timesteps: DEFAULT_TIMESTEPS,
    operations: []
  };

  return {
    qubits: initial.qubits,
    timesteps: initial.timesteps,
    operations: initial.operations,
    selectedGate: 'H',
    cursor: { qubit: 0, timestep: 0 },

    setQubits: (n: number) => {
      const clamped = Math.max(1, Math.min(8, Math.floor(n)));
      const cur = get();
      const filtered = cur.operations.filter(
        (op) => op.qubit < clamped && (op.target === undefined || op.target < clamped)
      );
      set({ qubits: clamped, operations: filtered });
    },

    setTimesteps: (n: number) => {
      const clamped = Math.max(1, Math.min(32, Math.floor(n)));
      const cur = get();
      const filtered = cur.operations.filter((op) => op.timestep < clamped);
      set({ timesteps: clamped, operations: filtered });
    },

    setSelectedGate: (g) => set({ selectedGate: g }),

    setCursor: (c) => {
      const cur = get();
      set({
        cursor: {
          qubit: Math.max(0, Math.min(cur.qubits - 1, c.qubit)),
          timestep: Math.max(0, Math.min(cur.timesteps - 1, c.timestep))
        }
      });
    },

    placeGate: (op) => {
      const cur = get();
      const nextOps = upsertOperation(cur.operations, op);
      set({ operations: nextOps });
    },

    placeGateAtCursor: (gate) => {
      const cur = get();
      const op: GateOp = {
        gate,
        qubit: cur.cursor.qubit,
        timestep: cur.cursor.timestep
      };
      if (gate === 'CNOT') {
        op.target = (cur.cursor.qubit + 1) % cur.qubits;
      }
      const nextOps = upsertOperation(cur.operations, op);
      set({ operations: nextOps });
    },

    removeAt: (qubit, timestep, _target) => {
      const cur = get();
      const nextOps = removeOperation(cur.operations, timestep, qubit);
      set({ operations: nextOps });
    },

    applyOperations: (ops) => set({ operations: ops }),

    load: (c) => set({
      qubits: c.qubits,
      timesteps: c.timesteps,
      operations: c.operations ?? [],
      id: c.id
    }),

    reset: () => {
      set({
        qubits: DEFAULT_QUBITS,
        timesteps: DEFAULT_TIMESTEPS,
        operations: [],
        cursor: { qubit: 0, timestep: 0 },
        selectedGate: 'H'
      });
    }
  };
});
