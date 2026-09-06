import { Router } from 'express';
import { z } from 'zod';
import { JwtAuthGuard, type AuthRequest } from '../auth/auth.middleware';
import { AppError } from '../../lib/errors';
import {
  createCircuit,
  deleteCircuit,
  getCircuitById,
  listCircuits,
  updateCircuit,
} from './circuits.service';

export const circuitsRouter = Router();

circuitsRouter.use(JwtAuthGuard);

const gateSchema = z.object({
  gate: z.enum(['H', 'X', 'Y', 'Z', 'CNOT', 'Measure']),
  qubit: z.number().int().min(0),
  timestep: z.number().int().min(0),
  target: z.number().int().min(0).optional(),
});

const createCircuitSchema = z.object({
  name: z.string().min(1).max(120),
  qubits: z.number().int().min(1).max(8),
  timesteps: z.number().int().min(1).max(64),
  operations: z.array(gateSchema),
});

const updateCircuitSchema = createCircuitSchema.partial();

circuitsRouter.get('/', async (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw AppError.unauthorized();
    }

    const data = await listCircuits(authReq.user.id);
    res.status(200).json({ data, total: data.length });
  } catch (err) {
    next(err);
  }
});

circuitsRouter.post('/', async (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw AppError.unauthorized();
    }

    const parsed = createCircuitSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.validation('Invalid circuit payload', parsed.error.flatten());
    }

    const circuit = await createCircuit(authReq.user.id, parsed.data);
    res.status(201).json(circuit);
  } catch (err) {
    next(err);
  }
});

circuitsRouter.get('/:id', async (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw AppError.unauthorized();
    }

    const circuit = await getCircuitById(authReq.user.id, req.params.id);
    res.status(200).json(circuit);
  } catch (err) {
    next(err);
  }
});

circuitsRouter.patch('/:id', async (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw AppError.unauthorized();
    }

    const parsed = updateCircuitSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.validation('Invalid circuit update payload', parsed.error.flatten());
    }

    const circuit = await updateCircuit(authReq.user.id, req.params.id, parsed.data);
    res.status(200).json(circuit);
  } catch (err) {
    next(err);
  }
});

circuitsRouter.delete('/:id', async (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw AppError.unauthorized();
    }

    await deleteCircuit(authReq.user.id, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
