import type {
  Circuit,
  Conversation,
  LessonModule,
  SimulationResult,
  SubscriptionTier,
  TutorMessage,
  User,
} from '@qvanta/types';

export interface CircuitRecord extends Circuit {
  name: string;
}

export interface SimulationResponse {
  job_id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  counts: Record<string, number>;
  per_qubit_bloch: Array<{ x: number; y: number; z: number }>;
  statevector?: SimulationResult['statevector'] | null;
  execution_time_ms: number;
  error?: string | null;
}

export interface TutorChatResponse {
  conversation: Conversation;
  reply: TutorMessage;
}

export interface AdminStats {
  users: number;
  circuits: number;
  conversations: number;
  sims: number;
  organizations: number;
}

export interface AdminUserRow
  extends Pick<User, 'id' | 'email' | 'role' | 'tier' | 'usageMonth' | 'usageSims'> {
  createdAt: string;
}

export interface PagedResponse<T> {
  data: T[];
  total: number;
}

export type BillingTier = SubscriptionTier;
export type LessonRecord = LessonModule;
