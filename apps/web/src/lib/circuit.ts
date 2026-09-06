import type { Circuit, GateOp, Gate } from '@qvanta/types';

export const AVAILABLE_GATES: Gate[] = ['H', 'X', 'Y', 'Z', 'CNOT', 'Measure'];

export function createEmptyCircuit(): Circuit {
  return {
    qubits: 2,
    timesteps: 6,
    operations: [],
  };
}

export function sortOperations(operations: GateOp[]): GateOp[] {
  return [...operations].sort((a, b) => {
    if (a.timestep !== b.timestep) {
      return a.timestep - b.timestep;
    }
    return a.qubit - b.qubit;
  });
}

export function upsertOperation(
  operations: GateOp[],
  nextOperation: GateOp
): GateOp[] {
  const filtered = operations.filter(
    (op) =>
      !(
        op.timestep === nextOperation.timestep &&
        op.qubit === nextOperation.qubit
      )
  );

  if (nextOperation.gate === 'CNOT' && nextOperation.target === nextOperation.qubit) {
    return sortOperations(filtered);
  }

  return sortOperations([...filtered, nextOperation]);
}

export function removeOperation(operations: GateOp[], timestep: number, qubit: number): GateOp[] {
  return operations.filter((op) => !(op.timestep === timestep && op.qubit === qubit));
}

export function circuitToQiskitCode(circuit: Circuit): string {
  const lines: string[] = [
    'from qiskit import QuantumCircuit',
    `qc = QuantumCircuit(${circuit.qubits}, ${circuit.qubits})`,
  ];

  const sorted = sortOperations(circuit.operations);

  for (const op of sorted) {
    switch (op.gate) {
      case 'H':
        lines.push(`qc.h(${op.qubit})`);
        break;
      case 'X':
        lines.push(`qc.x(${op.qubit})`);
        break;
      case 'Y':
        lines.push(`qc.y(${op.qubit})`);
        break;
      case 'Z':
        lines.push(`qc.z(${op.qubit})`);
        break;
      case 'CNOT':
        lines.push(`qc.cx(${op.qubit}, ${op.target ?? Math.min(circuit.qubits - 1, op.qubit + 1)})`);
        break;
      case 'Measure':
        lines.push(`qc.measure(${op.qubit}, ${op.qubit})`);
        break;
      default:
        break;
    }
  }

  return lines.join('\n');
}

export function circuitToQasmLike(circuit: Circuit): string {
  const lines = [
    'OPENQASM 2.0;',
    'include "qelib1.inc";',
    `qreg q[${circuit.qubits}];`,
    `creg c[${circuit.qubits}];`,
  ];

  for (const op of sortOperations(circuit.operations)) {
    switch (op.gate) {
      case 'H':
        lines.push(`h q[${op.qubit}];`);
        break;
      case 'X':
        lines.push(`x q[${op.qubit}];`);
        break;
      case 'Y':
        lines.push(`y q[${op.qubit}];`);
        break;
      case 'Z':
        lines.push(`z q[${op.qubit}];`);
        break;
      case 'CNOT':
        lines.push(`cx q[${op.qubit}],q[${op.target ?? Math.min(circuit.qubits - 1, op.qubit + 1)}];`);
        break;
      case 'Measure':
        lines.push(`measure q[${op.qubit}] -> c[${op.qubit}];`);
        break;
      default:
        break;
    }
  }

  return lines.join('\n');
}

export function parseQiskitCode(code: string, current: Circuit): Circuit {
  const lines = code.split(/\r?\n/);
  const operations: GateOp[] = [];
  let qubits = current.qubits;

  for (const line of lines) {
    const normalized = line.trim();
    if (!normalized) continue;

    const initMatch = normalized.match(/QuantumCircuit\((\d+)(?:,\s*(\d+))?\)/);
    if (initMatch) {
      qubits = Number(initMatch[1]);
      continue;
    }

    const single = normalized.match(/^qc\.(h|x|y|z)\((\d+)\)$/i);
    if (single) {
      operations.push({
        gate: single[1].toUpperCase() as Gate,
        qubit: Number(single[2]),
        timestep: operations.length,
      });
      continue;
    }

    const cnot = normalized.match(/^qc\.cx\((\d+),\s*(\d+)\)$/i);
    if (cnot) {
      operations.push({
        gate: 'CNOT',
        qubit: Number(cnot[1]),
        target: Number(cnot[2]),
        timestep: operations.length,
      });
      continue;
    }

    const measure = normalized.match(/^qc\.measure\((\d+),\s*(\d+)\)$/i);
    if (measure) {
      operations.push({
        gate: 'Measure',
        qubit: Number(measure[1]),
        timestep: operations.length,
      });
    }
  }

  return {
    ...current,
    qubits,
    timesteps: Math.max(current.timesteps, operations.length + 1),
    operations: sortOperations(operations),
  };
}
