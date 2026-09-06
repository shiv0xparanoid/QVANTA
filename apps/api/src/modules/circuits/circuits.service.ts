import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import type { Circuit, GateOp } from '@qvanta/types';

function normalizeOperations(value: unknown): GateOp[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((op): op is GateOp => {
      if (!op || typeof op !== 'object') {
        return false;
      }

      const candidate = op as Record<string, unknown>;
      return (
        typeof candidate.gate === 'string' &&
        typeof candidate.qubit === 'number' &&
        typeof candidate.timestep === 'number'
      );
    })
    .map((op) => ({
      gate: op.gate,
      qubit: op.qubit,
      timestep: op.timestep,
      ...(op.target !== undefined ? { target: op.target } : {}),
    }));
}

function serializeCircuit(record: {
  id: string;
  ownerId: string;
  name: string;
  qubits: number;
  timesteps: number;
  operations: unknown;
  createdAt: Date;
}): Circuit & { name: string } {
  return {
    id: record.id,
    ownerId: record.ownerId,
    name: record.name,
    qubits: record.qubits,
    timesteps: record.timesteps,
    operations: normalizeOperations(record.operations),
    createdAt: record.createdAt.toISOString(),
  };
}

export async function listCircuits(userId: string): Promise<Array<Circuit & { name: string }>> {
  const circuits = await prisma.circuit.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: 'desc' },
  });

  return circuits.map(serializeCircuit);
}

export async function getCircuitById(userId: string, circuitId: string): Promise<Circuit & { name: string }> {
  const circuit = await prisma.circuit.findFirst({
    where: {
      id: circuitId,
      ownerId: userId,
    },
  });

  if (!circuit) {
    throw AppError.notFound('Circuit not found');
  }

  return serializeCircuit(circuit);
}

export async function createCircuit(
  userId: string,
  input: {
    name: string;
    qubits: number;
    timesteps: number;
    operations: GateOp[];
  }
): Promise<Circuit & { name: string }> {
  const circuit = await prisma.circuit.create({
    data: {
      ownerId: userId,
      name: input.name,
      qubits: input.qubits,
      timesteps: input.timesteps,
      operations: input.operations as unknown as object,
    },
  });

  return serializeCircuit(circuit);
}

export async function updateCircuit(
  userId: string,
  circuitId: string,
  input: Partial<{
    name: string;
    qubits: number;
    timesteps: number;
    operations: GateOp[];
  }>
): Promise<Circuit & { name: string }> {
  await getCircuitById(userId, circuitId);

  const circuit = await prisma.circuit.update({
    where: { id: circuitId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.qubits !== undefined ? { qubits: input.qubits } : {}),
      ...(input.timesteps !== undefined ? { timesteps: input.timesteps } : {}),
      ...(input.operations !== undefined
        ? { operations: input.operations as unknown as object }
        : {}),
    },
  });

  return serializeCircuit(circuit);
}

export async function deleteCircuit(userId: string, circuitId: string): Promise<void> {
  await getCircuitById(userId, circuitId);
  await prisma.circuit.delete({
    where: { id: circuitId },
  });
}
