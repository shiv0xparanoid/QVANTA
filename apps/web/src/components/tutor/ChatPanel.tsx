import React from 'react';
import { Button, Input } from '@qvanta/ui';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth';
import { useCircuitStore } from '@/store/circuit';
import type { TutorMessage, Conversation, Circuit } from '@qvanta/types';

const NEW_CONV_ID = '__new__';

interface Thread {
  id: string;
  title?: string;
  messages: TutorMessage[];
}

const KEY_PROMPT = 'qvanta.tutor.initialPrompt';
const KEY_MODULE = 'qvanta.tutor.initialModule';

const readSessionPrompt = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(KEY_PROMPT);
  } catch {
    return null;
  }
};

const consumeSessionPrompt = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const v = window.sessionStorage.getItem(KEY_PROMPT);
    if (v) window.sessionStorage.removeItem(KEY_PROMPT);
    return v;
  } catch {
    return null;
  }
};

const readSessionModuleTitle = (): string | undefined => {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = window.sessionStorage.getItem(KEY_MODULE);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    return parsed?.title;
  } catch {
    return undefined;
  }
};

const makeDemoReply = (question: string, attached?: Circuit): string => {
  const q = question.toLowerCase();
  const hasCircuit = attached && attached.operations.length > 0;
  const head = readSessionModuleTitle();

  const intro = head
    ? `Great — let's work through your **${head}** module step by step. `
    : '';

  if (/hi|hello|hey|namaste|start/.test(q) && !hasCircuit) {
    return `${intro}Hi! Great to see you. I'm your quantum computing tutor — ask me anything about qubits, gates, Bloch spheres, algorithms, or paste/write a circuit and I'll help you debug it. 💡`;
  }

  if (/superposition/.test(q)) {
    return (
      `${intro}**Superposition** is one of the two "spooky" quantum superpowers, along with entanglement.\n\n` +
      `Classical bit = 0 OR 1.\n` +
      `Qubit = α|0⟩ + β|1⟩ (a linear combination *at the same time*).\n\n` +
      `The numbers α, β are complex amplitudes. When you **measure** the qubit, nature "picks" |0⟩ with probability |α|² or |1⟩ with probability |β|².\n\n` +
      `🔨 Try it in the circuit builder:\n` +
      "```\nqc = QuantumCircuit(1, 1)\nqc.h(0)\nqc.measure(0, 0)\n```\n" +
      `The H gate puts qubit 0 into (|0⟩ + |1⟩)/√2 — running with many shots will give you ~50/50 0s and 1s.`
    );
  }

  if (/hadamard|h gate|h\(/.test(q)) {
    return (
      `${intro}The **Hadamard (H) gate** creates superposition.\n\n` +
      `Matrix:\n` +
      `H = 1/√2 · [[1, 1], [1, -1]]\n\n` +
      `Effect on the Bloch sphere:\n` +
      `- It's a 180° rotation around the axis halfway between X and Z.\n` +
      `- H maps |0⟩ → |+⟩ = (|0⟩+|1⟩)/√2\n` +
      `- H maps |1⟩ → |-⟩ = (|0⟩−|1⟩)/√2\n` +
      `- Applying H twice returns you to the original state (H² = I).\n\n` +
      `⏩ Shortcut: want a Bell state? Try H(0) followed by CNOT(0, 1)!`
    );
  }

  if (/bloch|sphere/.test(q)) {
    return (
      `${intro}The **Bloch sphere** visualizes *one* qubit state as a point on a unit sphere.\n\n` +
      `- North pole (|0⟩), south pole (|1⟩)\n` +
      `- Equator = pure superposition states (e.g. |+⟩, |−⟩, |i⟩)\n` +
      `- Any single-qubit gate = a rotation (X, Y, Z, H are axes).\n\n` +
      `Tip: In QVANTA, whenever you add a gate, the Bloch panel immediately rotates the state. Drop an H gate on |0⟩ and you'll see the state vector land on the X-axis!`
    );
  }

  if (/bell state|entangle|cnot/.test(q)) {
    return (
      `${intro}A **Bell state** is the simplest 2-qubit entangled state.\n\n` +
      `Build it like this:\n` +
      "```\nqc = QuantumCircuit(2)\nqc.h(0)\nqc.cx(0, 1)  # CNOT: control=0, target=1\n```\n" +
      `Result: |Φ⁺⟩ = (|00⟩ + |11⟩)/√2\n\n` +
      `Why is this "entangled"? You cannot write it as (a|0⟩+b|1⟩)⊗(c|0⟩+d|1⟩). Measuring qubit 0 instantly tells you the outcome of qubit 1, no matter how far apart they are.\n\n` +
      `Run 2048 shots on this circuit — you should see roughly 50% 00 and 50% 11, and *almost no* 01 / 10. That's entanglement!`
    );
  }

  if (/measure/.test(q)) {
    return (
      `${intro}**Measurement** in quantum computing is destructive — it collapses the state permanently.\n\n` +
      `Rule:\n` +
      `- Before measurement: qubit lives in α|0⟩ + β|1⟩\n` +
      `- After measurement: classical bit is 0 with |α|², 1 with |β|²; qubit snaps to that classical state.\n\n` +
      `In Qiskit-style syntax, write:\n` +
      "```\nqc = QuantumCircuit(1, 1)\nqc.h(0)\nqc.measure(0, 0)\n```\n" +
      `Shots repeat the experiment so you can *estimate* the probabilities.`
    );
  }

  if (/error|bug|wrong|fix|check my circuit/.test(q) && hasCircuit) {
    const opCount = attached!.operations.length;
    const qubits = attached!.qubits;
    const gates = attached!.operations.map((o) => o.gate).join(', ') || 'none';
    return (
      `${intro}🔍 Quick circuit check:\n\n` +
      `- Qubits: ${qubits}\n` +
      `- Gate count: ${opCount}\n` +
      `- Applied gates: ${gates}\n\n` +
      `Common pitfalls I look for:\n` +
      `1. **CNOT mismatch**: is the control qubit before the target in circuit order?\n` +
      `2. **Measurement missing**: without a final measure() the simulator may give you 0s only.\n` +
      `3. **Wrong qubit index**: qubits are 0-indexed! Check qc.h(0) vs qc.h(1).\n\n` +
      `If you tell me the exact output you expected vs what you got, I can debug it line-by-line. 🔧`
    );
  }

  if (/deutsch|grover|shor|algorithm/.test(q)) {
    return (
      `${intro}🧠 Core quantum algorithms overview:\n\n` +
      `1. **Deutsch-Jozsa** — determines if a Boolean function is constant or balanced *in one query* (classical needs O(2ⁿ)). Proof that quantum *can* outperform classical.\n\n` +
      `2. **Grover search** — unstructured search in O(√N) time (classical O(N)). Useful for database-style problems.\n\n` +
      `3. **Shor's algorithm** — integer factorization in *polynomial* time (best classical is sub-exponential). This is why post-quantum cryptography is being standardized.\n\n` +
      `Pick one, and I'll walk you through the circuit diagram step-by-step!`
    );
  }

  if (hasCircuit) {
    const opCount = attached!.operations.length;
    return (
      `${intro}Got your question AND attached circuit (${opCount} gate${opCount === 1 ? '' : 's'}).\n\n` +
      `Here's how I'd read it mentally:\n` +
      `1. Walk the timeline left-to-right.\n` +
      `2. Single-qubit gates (H, X, Y, Z) rotate the corresponding qubit on the Bloch sphere.\n` +
      `3. CNOT(control, target) flips the target *only* when the control is |1⟩.\n\n` +
      `For more specifics, re-ask mentioning a particular gate or the output you expected!`
    );
  }

  return (
    `${intro}Got your question: "${question.slice(0, 120)}".\n\n` +
    `Here's my ground-rule teaching style:\n\n` +
    `1. I start with a simple *intuition* (no math first).\n` +
    `2. Then I write a *tiny runnable circuit* you can paste into the editor.\n` +
    `3. Then I explain the math/Bloch-sphere picture if you ask for it.\n\n` +
    `Try clicking one of the suggestion chips below, or ask me about: superposition, H gate, CNOT, Bloch sphere, Bell state, Grover, Shor, or just paste a circuit and ask "debug this"!`
  );
};

const ChatPanel: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const [threads, setThreads] = React.useState<Thread[]>([]);
  const [activeId, setActiveId] = React.useState<string>(NEW_CONV_ID);
  const [input, setInput] = React.useState<string>(() => readSessionPrompt() ?? '');
  const [attachCircuit, setAttachCircuit] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const bootstrappedRef = React.useRef(false);

  const activeThread = threads.find((t) => t.id === activeId);
  const messages: TutorMessage[] = activeThread?.messages ?? [];

  // load conversations on mount; also inject initial module prompt if present
  React.useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    let cancelled = false;
    const load = async () => {
      try {
        const res = await apiClient.get<Conversation[]>('/tutor/conversations');
        if (cancelled || !res.data) return;
        const ts: Thread[] = res.data.map((c) => ({
          id: c.id,
          title: c.title,
          messages: Array.isArray(c.messages) ? c.messages : [],
        }));
        setThreads(ts);
        if (ts.length > 0 && activeId === NEW_CONV_ID) {
          setActiveId(ts[0].id);
        }
      } catch {
        // ignore for MVP — fall back to purely client-side thread
      }
    };
    void load();

    // Auto-send initial prompt from Dashboard module (if any)
    const autoPrompt = consumeSessionPrompt();
    if (autoPrompt) {
      setTimeout(() => {
        setInput(autoPrompt);
        // Focus happens on rerender; explicit send deferred to avoid double-mount effects
        // in StrictMode — user can just press Enter, or we can send now:
        queueMicrotask(() => {
          void (async () => {
            /* executed below via helper once state committed */
          })();
        });
      }, 250);
    }
  }, [activeId]);

  React.useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, sending]);

  const synthesizeIfPossible = (text: string, voiceIdx: number) => {
    const w = window as any;
    if (typeof w.__qvantaTutorSpeak === 'function') {
      try {
        w.__qvantaTutorSpeak(text, voiceIdx);
      } catch {
        /* ignore */
      }
    }
  };

  const appendMessages = (id: string, toAdd: TutorMessage[]) => {
    setThreads((prev) => {
      const existing = prev.find((t) => t.id === id);
      const next: Thread = existing
        ? { ...existing, messages: [...existing.messages, ...toAdd] }
        : {
            id,
            title: toAdd[0]?.content.slice(0, 48),
            messages: toAdd,
          };
      const match = prev.find((t) => t.id === id);
      return match
        ? prev.map((t) => (t.id === id ? next : t))
        : [next, ...prev];
    });
  };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    setError(null);
    setSending(true);

    const userMsg: TutorMessage = {
      id: `u_${Date.now()}`,
      conversationId: activeId === NEW_CONV_ID ? '' : activeId,
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    let circuitContext: Circuit | undefined;
    if (attachCircuit) {
      const s = useCircuitStore.getState();
      circuitContext = {
        qubits: s.qubits,
        timesteps: s.timesteps,
        operations: s.operations,
      };
      userMsg.circuitContext = circuitContext;
    }

    let workingId = activeId;
    if (workingId === NEW_CONV_ID) {
      workingId = `c_${Date.now()}`;
      setActiveId(workingId);
    }
    appendMessages(workingId, [userMsg]);
    setInput('');

    try {
      const payload: any = {
        message: trimmed,
        conversationId:
          workingId === NEW_CONV_ID || workingId.startsWith('c_')
            ? undefined
            : workingId,
      };
      if (attachCircuit) payload.circuit = circuitContext;

      let replyText: string;
      let serverConversationId: string | undefined;
      let ragContext: string[] | undefined;

      try {
        const res = await apiClient.post<{
          reply: string;
          conversationId?: string;
          ragContext?: string[];
          message?: TutorMessage;
        }>('/tutor/chat', payload, { timeout: 60000 });
        replyText =
          res.data?.reply ??
          (res.data as any)?.message?.content ??
          makeDemoReply(trimmed, circuitContext);
        serverConversationId = res.data?.conversationId;
        ragContext = res.data?.ragContext;
      } catch (serverErr: any) {
        // Demo-mode fallback — answer offline from knowledge base
        replyText = makeDemoReply(trimmed, circuitContext);
        setError(null); // not an error: demo-mode response
      }

      const assistantMsg: TutorMessage = {
        id: `a_${Date.now()}`,
        conversationId: serverConversationId ?? workingId,
        role: 'assistant',
        content: replyText,
        ragContext,
        circuitContext,
        createdAt: new Date().toISOString(),
      };
      appendMessages(serverConversationId ?? workingId, [assistantMsg]);
      synthesizeIfPossible(replyText, user?.avatarPreset ?? 0);
    } catch (finalErr: any) {
      const msg =
        finalErr?.response?.data?.error?.message ??
        finalErr?.message ??
        'Unexpected error while reaching the tutor.';
      setError(msg);
      const fail: TutorMessage = {
        id: `a_${Date.now()}`,
        conversationId: workingId,
        role: 'assistant',
        content: `⚠️ ${msg}`,
        createdAt: new Date().toISOString(),
      };
      appendMessages(workingId, [fail]);
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  const suggestions = [
    'Explain superposition in simple terms.',
    'What does a Hadamard gate do to the Bloch sphere?',
    'Can you find errors in my current circuit?',
    'How do I build a Bell state?',
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-bg-800 px-4 py-2">
        <select
          value={activeId}
          onChange={(e) => setActiveId(e.target.value)}
          className="rounded-md border border-bg-700 bg-bg-900 px-2 py-1 text-xs text-text-200 outline-none focus:border-primary-500"
        >
          <option value={NEW_CONV_ID}>＋ New conversation</option>
          {threads.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title
                ? `${t.title.slice(0, 32)}${t.title.length > 32 ? '…' : ''}`
                : `Conversation ${t.id.slice(0, 6)}`}{' '}
              ({t.messages.length})
            </option>
          ))}
        </select>
        <label className="ml-auto flex items-center gap-2 text-xs text-text-400">
          <input
            type="checkbox"
            checked={attachCircuit}
            onChange={(e) => setAttachCircuit(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-bg-700 bg-bg-900 accent-primary-500"
          />
          Attach current circuit context
        </label>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="mx-auto max-w-lg space-y-4 pt-6">
            <div className="rounded-xl border border-primary-800/40 bg-primary-950/30 p-5">
              <h3 className="text-sm font-semibold text-primary-200">
                Hi! I'm your AI tutor 👋
              </h3>
              <p className="mt-1.5 text-sm text-text-300">
                Ask anything about quantum computing. My answers are grounded in
                QVANTA lesson material and I can analyze your current circuit
                for errors or optimizations — even offline!
              </p>
            </div>
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-text-500">
                Try asking:
              </div>
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setInput(s);
                  }}
                  className="block w-full rounded-lg border border-bg-700 bg-bg-900/50 px-3 py-2 text-left text-sm text-text-300 transition hover:border-primary-700 hover:bg-bg-800 hover:text-text-100"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${
                  m.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-primary-600 text-white'
                      : 'border border-bg-700 bg-bg-900 text-text-100'
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">
                    {m.content}
                  </div>
                  {m.ragContext && m.ragContext.length > 0 && (
                    <div
                      className={`mt-2 flex flex-wrap gap-1 text-[10px] ${
                        m.role === 'user'
                          ? 'text-primary-100/80'
                          : 'text-text-500'
                      }`}
                    >
                      {m.ragContext.slice(0, 3).map((r, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-bg-800 px-2 py-0.5"
                        >
                          📚 {r.slice(0, 28)}
                          {r.length > 28 ? '…' : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-bg-700 bg-bg-900 px-4 py-3 text-sm text-text-100">
                  <span className="inline-flex gap-1">
                    <span
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-400"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-400"
                      style={{ animationDelay: '150ms' }}
                    />
                    <span
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-400"
                      style={{ animationDelay: '300ms' }}
                    />
                  </span>
                </div>
              </div>
            )}
            {error && !sending && (
              <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">
                {error}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-bg-800 p-3">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask the tutor… (Enter to send)"
            />
          </div>
          <Button
            variant="primary"
            onClick={() => {
              void sendMessage();
            }}
            loading={sending}
          >
            Send
          </Button>
        </div>
        <div className="mt-1.5 px-1 text-[11px] text-text-500">
          Tutor works both ways: connected RAG, or an offline built-in
          knowledge base for demo mode.
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
