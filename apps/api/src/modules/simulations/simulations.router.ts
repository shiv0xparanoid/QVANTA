import { Router } from 'express';
import axios from 'axios';
import { z } from 'zod';
import { JwtAuthGuard, type AuthRequest } from '../auth/auth.middleware';
import { AppError } from '../../lib/errors';
import { enforceSimulationLimits, incrementSimulationUsage } from '../../lib/billing/usage-guard';

export const simulationsRouter = Router();

const circuitReprSchema = z.object({
  kind: z.enum(['qasm2', 'json_ast', 'qiskit_code']),
  value: z.string().min(1),
});

const simulateSchema = z.object({
  circuit_repr: circuitReprSchema,
  backend: z.enum(['qiskit_aer']).default('qiskit_aer'),
  shots: z.number().int().min(1).max(65536).default(1024),
});

simulationsRouter.use(JwtAuthGuard);

simulationsRouter.post('/', async (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw AppError.unauthorized();
    }

    const parsed = simulateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.validation('Invalid simulation payload', parsed.error.flatten());
    }

    await enforceSimulationLimits(authReq.user, parsed.data.shots);

    const simulatorBaseUrl = process.env.SIMULATOR_URL ?? 'http://localhost:8000';
    const response = await axios.post(`${simulatorBaseUrl}/simulate`, parsed.data, {
      timeout: 30000,
    });

    await incrementSimulationUsage(authReq.user.id);

    res.status(200).json(response.data);
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status ?? 502;
      const detail = err.response?.data?.detail;
      return next(
        new AppError(
          status === 400 ? 'BAD_REQUEST' : 'INTERNAL_ERROR',
          detail?.message ?? 'Simulation service request failed',
          status,
          detail
        )
      );
    }
    next(err);
  }
});

simulationsRouter.get('/:jobId', async (req, res, next) => {
  try {
    const simulatorBaseUrl = process.env.SIMULATOR_URL ?? 'http://localhost:8000';
    const response = await axios.get(`${simulatorBaseUrl}/simulate/jobs/${req.params.jobId}`, {
      timeout: 15000,
    });
    res.status(200).json(response.data);
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status ?? 502;
      const detail = err.response?.data?.detail;
      return next(
        new AppError(
          status === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
          detail?.message ?? 'Simulation job lookup failed',
          status,
          detail
        )
      );
    }
    next(err);
  }
});
