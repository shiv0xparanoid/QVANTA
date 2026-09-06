export type UserRole = 'student' | 'instructor' | 'admin' | 'org_admin';

export type UserTier = 'free' | 'pro' | 'institution';

export interface User {
  id: string;
  email: string;
  googleId?: string;
  passwordHash?: string;
  role: UserRole;
  tier: UserTier;
  usageMonth: string;
  usageSims: number;
  avatarPreset: number;
  createdAt: string;
  stripeCustomerId?: string;
}

export type Gate = 'H' | 'X' | 'Y' | 'Z' | 'CNOT' | 'Measure';

export interface GateOp {
  gate: Gate;
  qubit: number;
  timestep: number;
  target?: number;
}

export interface Circuit {
  id?: string;
  ownerId?: string;
  qubits: number;
  timesteps: number;
  operations: GateOp[];
  createdAt?: string;
}

export type SimulationJobStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface SimulationResult {
  counts: Record<string, number>;
  statevector: Array<{ real: number; imag: number }>;
}

export interface SimulationJob {
  id: string;
  userId: string;
  status: SimulationJobStatus;
  backend: string;
  shots: number;
  circuitCode?: string;
  circuitQasm?: string;
  result?: SimulationResult;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export type TutorMessageRole = 'user' | 'assistant' | 'system';

export interface TutorMessage {
  id: string;
  conversationId: string;
  role: TutorMessageRole;
  content: string;
  ragContext?: string[];
  circuitContext?: Circuit;
  createdAt: string;
}

export interface SubscriptionTier {
  tier: UserTier;
  name: string;
  description: string;
  simsPerMonth: number;
  maxShots: number;
  stripePriceId?: string;
}

export type LessonProgress = 'not_started' | 'started' | 'completed';

export interface LessonModule {
  id: string;
  title: string;
  slug: string;
  description: string;
  content: string;
  order: number;
  progress?: LessonProgress;
  embedded?: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title?: string;
  messages: TutorMessage[];
  circuitId?: string;
  createdAt: string;
  updatedAt: string;
}
