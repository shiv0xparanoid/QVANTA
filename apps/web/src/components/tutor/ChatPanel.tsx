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

const ChatPanel: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const [threads, setThreads] = React.useState<Thread[]>([]);
  const [activeId, setActiveId] = React.useState<string>(NEW_CONV_ID);
  const [input, setInput] = React.useState('');
  const [attachCircuit, setAttachCircuit] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const activeThread = threads.find((t) => t.id === activeId);
  const messages: TutorMessage[] = activeThread?.messages ?? [];

  // load conversations on mount
  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await apiClient.get<{ data: Conversation[]; total?: number }>('/tutor/conversations');
        if (cancelled || !res.data) return;
        const convArr: Conversation[] = Array.isArray(res.data)
          ? res.data
          : Array.isArray((res.data as any).data)
            ? (res.data as any).data
            : [];
        const ts: Thread[] = convArr.map((c) => ({
          id: c.id,
          title: c.title,
          messages: Array.isArray(c.messages) ? c.messages : []
        }));
        setThreads(ts);
        setActiveId((prevActive) => {
          if (prevActive !== NEW_CONV_ID) return prevActive;
          return ts.length > 0 ? ts[0].id : NEW_CONV_ID;
        });
      } catch {
        // ignore for MVP — fall back to purely client-side thread
      }
    };
    void load();
  }, []);

  React.useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, sending]);

  const synthesizeIfPossible = (text: string, voiceIdx: number) => {
    const w = window as any;
    if (typeof w.__qvantaTutorSpeak === 'function') {
      try { w.__qvantaTutorSpeak(text, voiceIdx); } catch { /* ignore */ }
    }
  };

  const appendMessages = (id: string, toAdd: TutorMessage[]) => {
    setThreads((prev) => {
      const existing = prev.find((t) => t.id === id);
      const next: Thread = existing
        ? { ...existing, messages: [...existing.messages, ...toAdd] }
        : { id, title: toAdd[0]?.content.slice(0, 40), messages: toAdd };
      return prev.find((t) => t.id === id)
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
      createdAt: new Date().toISOString()
    };

    let circuitContext: Circuit | undefined;
    if (attachCircuit) {
      const s = useCircuitStore.getState();
      circuitContext = { qubits: s.qubits, timesteps: s.timesteps, operations: s.operations };
      userMsg.circuitContext = circuitContext;
    }

    // ensure thread
    let workingId = activeId;
    if (workingId === NEW_CONV_ID) {
      workingId = `c_${Date.now()}`;
      setActiveId(workingId);
    }
    appendMessages(workingId, [userMsg]);
    setInput('');

    try {
      const payload: any = {
        prompt: trimmed,
        conversationId: activeId === NEW_CONV_ID || workingId.startsWith('c_') ? undefined : workingId,
      };
      if (attachCircuit) payload.circuit = circuitContext;

      const res = await apiClient.post<{
        conversation: Conversation;
        reply: TutorMessage;
      }>('/tutor/chat', payload, { timeout: 90000 });

      const chatResp = res.data;
      const replyMessage: TutorMessage | undefined =
        chatResp.reply && typeof chatResp.reply === 'object' && 'content' in chatResp.reply
          ? chatResp.reply
          : undefined;

      const finalWorkingId = chatResp.conversation?.id ?? workingId;
      if (finalWorkingId !== workingId) {
        setActiveId(finalWorkingId);
      }

      if (chatResp.conversation) {
        setThreads((prev) => {
          const found = prev.find((t) => t.id === finalWorkingId);
          const conv: Thread = found
            ? { ...found, id: finalWorkingId, title: chatResp.conversation.title ?? found.title, messages: Array.isArray(chatResp.conversation.messages) ? chatResp.conversation.messages : found.messages }
            : {
                id: finalWorkingId,
                title: chatResp.conversation.title ?? trimmed.slice(0, 40),
                messages: Array.isArray(chatResp.conversation.messages) ? chatResp.conversation.messages : []
              };
          const exists = prev.some((t) => t.id === finalWorkingId);
          const cleaned = prev.filter((t) => t.id !== workingId && t.id !== finalWorkingId);
          return exists ? cleaned.map((t) => (t.id === finalWorkingId ? conv : t)) : [conv, ...cleaned];
        });
      }

      const replyText =
        replyMessage?.content ??
        (typeof chatResp.reply === 'string' ? chatResp.reply : undefined) ??
        'Sorry, I could not formulate a response right now.';

      const assistantMsg: TutorMessage = replyMessage ?? {
        id: `a_${Date.now()}`,
        conversationId: finalWorkingId,
        role: 'assistant',
        content: replyText,
        createdAt: new Date().toISOString()
      };

      if (!chatResp.conversation) {
        appendMessages(finalWorkingId, [assistantMsg]);
      }

      synthesizeIfPossible(replyText, user?.avatarPreset ?? 0);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? 'Network error while reaching the tutor.';
      setError(msg);
      const fail: TutorMessage = {
        id: `a_${Date.now()}`,
        conversationId: workingId,
        role: 'assistant',
        content: `⚠️ ${msg}`,
        createdAt: new Date().toISOString()
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
    'How do I build a Bell state?'
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
              {t.title ? `${t.title.slice(0, 32)}…` : `Conversation ${t.id.slice(0, 6)}`} ({t.messages.length})
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
              <h3 className="text-sm font-semibold text-primary-200">Hi! I'm your AI tutor 👋</h3>
              <p className="mt-1.5 text-sm text-text-300">
                Ask anything about quantum computing. My answers are grounded in QVANTA lesson material and I can analyze your current circuit for errors or optimizations.
              </p>
            </div>
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-text-500">Try asking:</div>
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => { setInput(s); }}
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
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-primary-600 text-white'
                      : 'border border-bg-700 bg-bg-900 text-text-100'
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">{m.content}</div>
                  {m.ragContext && m.ragContext.length > 0 && (
                    <div className={`mt-2 flex flex-wrap gap-1 text-[10px] ${m.role === 'user' ? 'text-primary-100/80' : 'text-text-500'}`}>
                      {m.ragContext.slice(0, 3).map((r, i) => (
                        <span key={i} className="rounded-full bg-bg-800 px-2 py-0.5">📚 {r.slice(0, 28)}{r.length > 28 ? '…' : ''}</span>
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
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-400" style={{ animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-400" style={{ animationDelay: '150ms' }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-400" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </div>
            )}
            {error && !sending && (
              <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">{error}</div>
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
          <Button variant="primary" onClick={() => void sendMessage()} loading={sending}>
            Send
          </Button>
        </div>
        <div className="mt-1.5 px-1 text-[11px] text-text-500">
          Tutor responses are demo-grounded lesson-aware replies. Production deployments use Anthropic Claude + pgvector RAG.
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
