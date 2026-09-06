import { Router } from 'express';
import { z } from 'zod';
import { JwtAuthGuard, type AuthRequest } from '../auth/auth.middleware';
import { AppError } from '../../lib/errors';
import { createConversation, chatWithTutor, listConversations } from './tutor.service';

export const tutorRouter = Router();

tutorRouter.use(JwtAuthGuard);

const gateSchema = z.object({
  gate: z.enum(['H', 'X', 'Y', 'Z', 'CNOT', 'Measure']),
  qubit: z.number().int().min(0),
  timestep: z.number().int().min(0),
  target: z.number().int().min(0).optional(),
});

const circuitSchema = z.object({
  id: z.string().optional(),
  ownerId: z.string().optional(),
  qubits: z.number().int().min(1).max(8),
  timesteps: z.number().int().min(1).max(64),
  operations: z.array(gateSchema),
  createdAt: z.string().optional(),
});

const createConversationSchema = z.object({
  circuitId: z.string().optional(),
});

const chatSchema = z.object({
  conversationId: z.string().optional(),
  prompt: z.string().min(1).max(4000),
  circuit: circuitSchema.optional(),
});

tutorRouter.get('/conversations', async (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw AppError.unauthorized();
    }

    const result = await listConversations(authReq.user.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

tutorRouter.post('/conversations', async (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw AppError.unauthorized();
    }

    const parsed = createConversationSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw AppError.validation('Invalid conversation payload', parsed.error.flatten());
    }

    const conversation = await createConversation(authReq.user.id, parsed.data.circuitId);
    res.status(201).json(conversation);
  } catch (err) {
    next(err);
  }
});

tutorRouter.post('/chat', async (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw AppError.unauthorized();
    }

    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.validation('Invalid tutor request', parsed.error.flatten());
    }

    const result = await chatWithTutor({
      userId: authReq.user.id,
      conversationId: parsed.data.conversationId,
      prompt: parsed.data.prompt,
      circuit: parsed.data.circuit,
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});
