import crypto from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import type { Circuit, Conversation, GateOp, TutorMessage } from '@qvanta/types';

type StoredMessage = Omit<TutorMessage, 'circuitContext'> & {
  circuitContext?: Circuit | null;
};

function toMessage(value: unknown): TutorMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(Boolean) as TutorMessage[];
}

function titleFromMessage(message: string): string {
  const cleaned = message.trim().replace(/\s+/g, ' ');
  if (!cleaned) {
    return 'Untitled conversation';
  }
  return cleaned.length > 48 ? `${cleaned.slice(0, 45)}...` : cleaned;
}

let claudeClient: Anthropic | null = null;
if (process.env.ANTHROPIC_API_KEY) {
  try {
    claudeClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  } catch {
    claudeClient = null;
  }
}

function detectCircuitErrors(circuit?: Circuit | null): string[] {
  const issues: string[] = [];
  if (!circuit) return issues;

  const nonMeasureOps = circuit.operations.filter((op) => op.gate !== 'Measure');
  const measureOps = circuit.operations.filter((op) => op.gate === 'Measure');
  if (nonMeasureOps.length >= 2 && measureOps.length === 0) {
    issues.push('Circuit builds up logic but has no Measure gates — add at least one Measure on the final timestep to extract classical results.');
  }

  for (const op of circuit.operations as GateOp[]) {
    if (op.gate === 'CNOT') {
      if (typeof op.qubit === 'number' && typeof op.target === 'number') {
        if (op.qubit === op.target) {
          issues.push(`CNOT at t=${op.timestep} has identical control and target qubit indices; a CNOT must act between two distinct qubits.`);
        }
      }
    }
    if (typeof op.qubit === 'number' && op.qubit >= circuit.qubits) {
      issues.push(`Gate ${op.gate} at t=${op.timestep} references qubit index ${op.qubit}, but the circuit only has ${circuit.qubits} qubits (0..${circuit.qubits - 1}).`);
    }
    if (op.gate === 'CNOT' && typeof op.target === 'number' && op.target >= circuit.qubits) {
      issues.push(`CNOT target ${op.target} at t=${op.timestep} is outside the valid qubit range 0..${circuit.qubits - 1}.`);
    }
  }

  return issues;
}

const RAG_KEYWORDS = [
  'superposition', 'hadamard', 'h gate', 'entangle', 'entanglement',
  'cnot', 'controlled', 'measure', 'measurement', 'bloch', 'qubit',
  'x gate', 'pauli-x', 'y gate', 'pauli-y', 'z gate', 'pauli-z',
  'deutsch', 'grover', 'shor', 'qft', 'fourier', 'bell', 'ghz',
];

function extractKeywords(prompt: string): string[] {
  const lower = prompt.toLowerCase();
  return RAG_KEYWORDS.filter((k) => lower.includes(k));
}

async function retrieveRagContext(prompt: string): Promise<{ titles: string[]; snippets: string[] }> {
  const keywords = extractKeywords(prompt);
  const allModules = await prisma.courseModule.findMany({
    select: { id: true, title: true, mdxContent: true, embedded: true },
  });

  const modulesWithEmbeddings = allModules.filter((m) => m.embedded);
  let ranked: { module: (typeof allModules)[number]; score: number }[] = [];

  if (modulesWithEmbeddings.length >= 2 && modulesWithEmbeddings.length === allModules.length) {
    try {
      const keywordWhere = keywords.length
        ? {
            OR: keywords.map((k) => [
              { title: { contains: k, mode: 'insensitive' as const } },
              { mdxContent: { contains: k, mode: 'insensitive' as const } },
            ]).flat(),
          }
        : {};
      const candidateCount = Math.min(6, allModules.length);
      const rawSqlHints = `
        SELECT id, title, "mdxContent", embedded
        FROM course_modules
        ${keywords.length ? `WHERE "mdxContent" ILIKE '%' || $1 || '%' OR title ILIKE '%' || $1 || '%'` : ''}
        ORDER BY "order" ASC NULLS LAST
        LIMIT ${candidateCount}
      `;
      const _ = rawSqlHints;
      for (const m of allModules.slice(0, candidateCount)) {
        let score = 0;
        const content = `${m.title} ${m.mdxContent}`.toLowerCase();
        for (const kw of keywords) {
          const idx = content.indexOf(kw);
          if (idx !== -1) score += 4 + (1 - Math.min(idx, 4000) / 4000);
        }
        score += m.embedded ? 0.5 : 0;
        ranked.push({ module: m, score });
      }
      keywordWhere;
    } catch {
      ranked = allModules.map((m) => ({ module: m, score: 0 }));
    }
  } else {
    for (const m of allModules) {
      let score = 0;
      const content = `${m.title} ${m.mdxContent}`.toLowerCase();
      for (const kw of keywords) {
        const idx = content.indexOf(kw);
        if (idx !== -1) score += 4 + (1 - Math.min(idx, 4000) / 4000);
      }
      ranked.push({ module: m, score });
    }
  }

  ranked.sort((a, b) => b.score - a.score);
  const top = ranked.slice(0, 3).filter((r) => r.score > 0 || ranked.length <= 3);
  const snippets = top.map(({ module }) => {
    const body = module.mdxContent.replace(/\s+/g, ' ').trim();
    const trimmed = body.length > 420 ? `${body.slice(0, 420)}…` : body;
    return `[${module.title}] ${trimmed}`;
  });
  const titles = top.map(({ module }) => module.title);
  return { titles, snippets };
}

function buildCannedReply(input: {
  prompt: string;
  lessonTitles: string[];
  circuit?: Circuit | null;
}): { content: string; ragContext: string[] } {
  const lessonContext = input.lessonTitles.length
    ? `Grounding from active curriculum: ${input.lessonTitles.join(', ')}.`
    : 'No embedded lesson context was available, so I am using platform defaults.';

  const circuitSummary = input.circuit
    ? `Current circuit has ${input.circuit.qubits} qubits, ${input.circuit.timesteps} timesteps, and ${input.circuit.operations.length} operations.`
    : 'No circuit snapshot was attached.';

  const lower = input.prompt.toLowerCase();
  let coaching = 'Focus on one timestep at a time and verify measurement placement at the end of the circuit.';

  if (lower.includes('superposition') || lower.includes('h gate') || lower.includes('hadamard')) {
    coaching = 'Use an H gate on the target qubit to place it into superposition before entangling or measuring it. The Hadamard maps |0⟩→(|0⟩+|1⟩)/√2 and creates an equal-weight superposition.';
  } else if (lower.includes('entangle') || lower.includes('cnot') || lower.includes('entanglement')) {
    coaching = 'Create entanglement by preparing the control qubit first (e.g. with H), then apply CNOT with a different target qubit — this is how a Bell pair is produced.';
  } else if (lower.includes('optimiz')) {
    coaching = 'Try reducing redundant single-qubit gates, combine inverse pairs, and keep measurements only on final timesteps.';
  } else if (lower.includes('error') || lower.includes('wrong')) {
    coaching = 'Check that every CNOT has both control and target indices, and ensure measurements are mapped to valid qubits.';
  } else if (lower.includes('measure')) {
    coaching = 'Place Measure gates on the last timestep for each qubit you want to read out. Measurement collapses superposition to a classical bit.';
  }

  return {
    content: `${lessonContext} ${circuitSummary} Recommended next move: ${coaching}`,
    ragContext: input.lessonTitles,
  };
}

interface ClaudeMsg {
  role: 'user' | 'assistant';
  content: string;
}

async function buildClaudeReply(input: {
  prompt: string;
  lessonTitles: string[];
  ragSnippets: string[];
  history: TutorMessage[];
  circuit?: Circuit | null;
  circuitIssues: string[];
}): Promise<{ content: string; ragContext: string[] }> {
  const ragBlock = input.ragSnippets.length
    ? `Curriculum RAG context (most relevant first):\n${input.ragSnippets.join('\n\n')}`
    : 'No RAG hits for this query — rely on general quantum computing pedagogy and the curriculum list below.';

  const titlesBlock = input.lessonTitles.length ? `Course modules: ${input.lessonTitles.join(', ')}.` : 'No modules loaded.';

  const circuitBlock = input.circuit
    ? [
        `User circuit AST (JSON shape: {qubits, timesteps, operations:[{gate, qubit, timestep, target?}]}):`,
        `Qubits: ${input.circuit.qubits}, Timesteps: ${input.circuit.timesteps}`,
        `Operations: ${JSON.stringify(input.circuit.operations.slice(0, 64))}${input.circuit.operations.length > 64 ? ` … (${input.circuit.operations.length - 64} more)` : ''}`,
      ].join('\n')
    : 'No circuit AST attached.';

  const issuesBlock = input.circuitIssues.length
    ? `Pre-flight circuit warnings (address if relevant):\n${input.circuitIssues.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
    : 'No obvious circuit issues detected by the heuristic pre-flight.';

  const system = [
    'You are QUINN, the friendly QVANTA quantum-computing tutor. Explain concepts conversationally for a beginner-to-intermediate student.',
    'Always ground your answer in the provided RAG snippets when they are relevant; otherwise use standard undergraduate quantum computing knowledge.',
    'Reference the user\'s current circuit AST when they ask about gates, measurements, or structure. Mention the pre-flight warnings if they apply to their question.',
    'Keep answers to 2–5 short paragraphs. Prefer actionable suggestions ("try adding H on q0 before CNOT") over pure theory when a circuit is attached.',
    'Do not fabricate platform features, courses, or assessments that are not in the provided module titles.',
  ].join('\n');

  const recent: ClaudeMsg[] = [];
  for (const msg of input.history.slice(-8)) {
    if (typeof msg.content !== 'string') continue;
    if (msg.role === 'user' || msg.role === 'assistant') {
      recent.push({ role: msg.role, content: msg.content });
    }
  }

  const preamble = [titlesBlock, ragBlock, circuitBlock, issuesBlock, ''].join('\n');
  const finalUserContent = `${preamble}Student question: ${input.prompt}`;

  const messages: ClaudeMsg[] = [...recent];
  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    messages.push({ role: 'user', content: finalUserContent });
  } else {
    messages[messages.length - 1] = {
      role: 'user',
      content: `${messages[messages.length - 1].content}\n\n---\n${finalUserContent}`,
    };
  }

  const resp = await claudeClient!.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 768,
    system,
    messages,
  });

  const textParts = resp.content.filter((b) => b.type === 'text') as { type: 'text'; text: string }[];
  const text = textParts.map((b) => b.text).join('\n\n').trim();
  const content = text || buildCannedReply(input).content;

  const ragContext = input.lessonTitles.length ? input.lessonTitles : ['general-quantum-pedagogy'];
  return { content, ragContext };
}

export async function listConversations(userId: string): Promise<{ data: Conversation[]; total: number }> {
  const conversations = await prisma.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  });

  const data: Conversation[] = conversations.map((conversation) => ({
    id: conversation.id,
    userId: conversation.userId,
    title: titleFromMessage(
      (toMessage(conversation.messages)[0]?.content as string | undefined) ?? 'Untitled conversation'
    ),
    messages: toMessage(conversation.messages),
    circuitId: conversation.circuitId ?? undefined,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
  }));

  return { data, total: data.length };
}

export async function createConversation(userId: string, circuitId?: string): Promise<Conversation> {
  const conversation = await prisma.conversation.create({
    data: {
      userId,
      circuitId,
      messages: [],
    },
  });

  return {
    id: conversation.id,
    userId: conversation.userId,
    messages: [],
    circuitId: conversation.circuitId ?? undefined,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
  };
}

export async function chatWithTutor(input: {
  userId: string;
  conversationId?: string;
  prompt: string;
  circuit?: Circuit | null;
}): Promise<{
  conversation: Conversation;
  reply: TutorMessage;
}> {
  let conversation = input.conversationId
    ? await prisma.conversation.findFirst({
        where: {
          id: input.conversationId,
          userId: input.userId,
        },
      })
    : null;

  if (!conversation && input.conversationId) {
    throw AppError.notFound('Conversation not found');
  }

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        userId: input.userId,
        messages: [],
      },
    });
  }

  const circuitIssues = detectCircuitErrors(input.circuit);
  const rag = await retrieveRagContext(input.prompt);
  const curriculumModules = await prisma.courseModule.findMany({
    orderBy: { order: 'asc' },
    take: 6,
    select: { title: true },
  });
  const lessonTitles = rag.titles.length ? rag.titles : curriculumModules.map((m) => m.title);

  const storedMessages = toMessage(conversation.messages);
  const now = new Date().toISOString();

  const userMessage: TutorMessage = {
    id: crypto.randomUUID(),
    conversationId: conversation.id,
    role: 'user',
    content: input.prompt,
    ...(input.circuit ? { circuitContext: input.circuit } : {}),
    createdAt: now,
  };

  let assistantDraft: { content: string; ragContext: string[] };
  try {
    if (claudeClient) {
      assistantDraft = await buildClaudeReply({
        prompt: input.prompt,
        lessonTitles,
        ragSnippets: rag.snippets,
        history: storedMessages,
        circuit: input.circuit,
        circuitIssues,
      });
    } else {
      assistantDraft = buildCannedReply({ prompt: input.prompt, lessonTitles, circuit: input.circuit });
    }
  } catch {
    assistantDraft = buildCannedReply({ prompt: input.prompt, lessonTitles, circuit: input.circuit });
  }

  let finalContent = assistantDraft.content;
  if (circuitIssues.length && !finalContent.toLowerCase().includes('measure') && !finalContent.toLowerCase().includes('warning')) {
    const appended = circuitIssues.map((s, i) => `${i + 1}. ${s}`).join('\n');
    finalContent = `${finalContent}\n\n⚠️ Circuit notes:\n${appended}`;
  }

  const assistantMessage: TutorMessage = {
    id: crypto.randomUUID(),
    conversationId: conversation.id,
    role: 'assistant',
    content: finalContent,
    ragContext: assistantDraft.ragContext,
    ...(input.circuit ? { circuitContext: input.circuit } : {}),
    createdAt: new Date().toISOString(),
  };

  const nextMessages: StoredMessage[] = [...storedMessages, userMessage, assistantMessage];

  const updated = await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      circuitId: input.circuit?.id ?? conversation.circuitId,
      messages: nextMessages as unknown as object,
    },
  });

  const resultConversation: Conversation = {
    id: updated.id,
    userId: updated.userId,
    title: titleFromMessage(userMessage.content),
    messages: toMessage(updated.messages),
    circuitId: updated.circuitId ?? undefined,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };

  return {
    conversation: resultConversation,
    reply: assistantMessage,
  };
}
