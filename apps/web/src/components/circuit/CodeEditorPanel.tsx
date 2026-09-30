import React from 'react';
import Editor from '@monaco-editor/react';
import { Button } from '@qvanta/ui';
import { useCircuitStore } from '@/store/circuit';
import { circuitToQiskitCode, parseQiskitCode } from '@/lib/circuit';
import { apiClient } from '@/lib/api-client';
import type { GateOp } from '@qvanta/types';

type SimStatus = 'idle' | 'running' | 'done' | 'error';

export interface CodeEditorSharedState {
  code: string;
  setCode: (c: string) => void;
  shots: number;
  setShots: (n: number) => void;
  status: SimStatus;
  setStatus: (s: SimStatus) => void;
  err: string | null;
  setErr: (e: string | null) => void;
  onStatusChange?: (status: SimStatus, error?: string | null) => void;
  onResult?: (r: {
    counts: Record<string, number>;
    shots: number;
    backend: string;
    blochVectors?: Array<{ x: number; y: number; z: number }>;
  }) => void;
}

export interface CodeEditorPanelProps {
  variant: 'toolbar-only' | 'full';
  shared: CodeEditorSharedState;
}

interface MonacoMarker {
  severity: 8 | 4;
  message: string;
  startLineNumber: number;
  endLineNumber: number;
  startColumn: number;
  endColumn: number;
}

const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();

const CodeEditorPanel: React.FC<CodeEditorPanelProps> = ({ variant, shared }) => {
  const operations = useCircuitStore((s) => s.operations);
  const qubits = useCircuitStore((s) => s.qubits);
  const timesteps = useCircuitStore((s) => s.timesteps);
  const applyOperations = useCircuitStore((s) => s.applyOperations);
  const setQubits = useCircuitStore((s) => s.setQubits);
  const setTimesteps = useCircuitStore((s) => s.setTimesteps);

  const editorRef = React.useRef<any>(null);
  const monacoRef = React.useRef<any>(null);
  const codeRef = React.useRef<string>('');
  const suppressAstSyncRef = React.useRef<boolean>(false);

  const {
    code,
    setCode,
    shots,
    setShots,
    status,
    setStatus,
    err,
    setErr,
    onStatusChange,
    onResult,
  } = shared;

  React.useEffect(() => {
    codeRef.current = code;
  }, [code]);

  const pushStatus = React.useCallback(
    (s: SimStatus, e: string | null = null) => {
      setStatus(s);
      setErr(e);
      onStatusChange?.(s, e);
    },
    [setStatus, setErr, onStatusChange]
  );

  const setMarkers = React.useCallback(
    (markers: MonacoMarker[]) => {
      if (variant !== 'full') return;
      if (monacoRef.current && editorRef.current?.getModel) {
        const model = editorRef.current.getModel();
        if (model) {
          monacoRef.current.editor.setModelMarkers(model, 'qvanta', markers);
        }
      }
    },
    [variant]
  );

  const commitCode = React.useCallback(() => {
    const val =
      variant === 'full'
        ? (editorRef.current?.getValue?.() as string | undefined) ?? codeRef.current
        : codeRef.current;
    try {
      const current = { qubits, timesteps, operations };
      const parsed = parseQiskitCode(val, current);
      setMarkers([]);
      const targetQubits: number[] = [qubits, parsed.qubits];
      for (const o of parsed.operations) {
        targetQubits.push(o.qubit);
        if (typeof o.target === 'number') targetQubits.push(o.target);
      }
      const targetTimesteps: number[] = [timesteps, parsed.timesteps];
      for (const o of parsed.operations) {
        targetTimesteps.push(o.timestep + 1);
      }
      const safeQ = targetQubits.map((n) =>
        Number.isFinite(n) && n > 0 ? n : qubits
      );
      const safeT = targetTimesteps.map((n) =>
        Number.isFinite(n) && n > 0 ? n : timesteps
      );
      const maxQ = Math.max(1, ...safeQ);
      const maxT = Math.max(1, ...safeT);
      if (maxQ !== qubits) setQubits(maxQ);
      if (maxT !== timesteps) setTimesteps(maxT);
      suppressAstSyncRef.current = true;
      applyOperations(parsed.operations);
      queueMicrotask(() => {
        suppressAstSyncRef.current = false;
      });
      pushStatus('idle');
    } catch (parseErr: any) {
      const msg =
        typeof parseErr?.message === 'string'
          ? parseErr.message
          : 'Parse error';
      const line = Number(parseErr?.line ?? 1);
      setMarkers([
        {
          severity: 8,
          message: msg,
          startLineNumber: line,
          endLineNumber: line,
          startColumn: 1,
          endColumn: 1000,
        },
      ]);
      pushStatus('error', msg);
    }
  }, [
    variant,
    qubits,
    timesteps,
    operations,
    setMarkers,
    setQubits,
    setTimesteps,
    applyOperations,
    pushStatus,
  ]);

  const handleSimulate = React.useCallback(async () => {
    commitCode();
    const snapshot = useCircuitStore.getState();
    const circuit = {
      qubits: snapshot.qubits,
      timesteps: snapshot.timesteps,
      operations: snapshot.operations,
    };
    pushStatus('running');
    try {
      let tries = 0;
      const res = await apiClient.post('/simulations', {
        format: 'json_ast',
        backend: 'qiskit_aer',
        shots: Math.max(1, Math.floor(shots)),
        circuit: JSON.stringify(circuit),
      });
      let job = res.data;
      const pollMs = 300;
      const maxTries = 40;
      while (job?.status === 'queued' || job?.status === 'running') {
        if (++tries > maxTries) break;
        await new Promise((r) => setTimeout(r, pollMs));
        try {
          const j = await apiClient
            .get(`/simulate/jobs/${job.id}`)
            .catch(async () => apiClient.get(`/simulations/${job.id}`));
          if (j?.data) job = j.data;
        } catch {
          break;
        }
      }
      if (job?.status === 'completed') {
        const result = job.result ?? {};
        const counts: Record<string, number> = result.counts ?? {};
        const shotsVal =
          Object.values(counts).reduce((a, b) => a + Number(b), 0) || shots;
        const bloch = Array.isArray(result.blochVectors)
          ? result.blochVectors
          : undefined;
        onResult?.({
          counts,
          shots: shotsVal,
          backend: 'qiskit_aer',
          blochVectors: bloch,
        });
        pushStatus('done');
      } else if (job?.status === 'failed') {
        pushStatus('error', job.error ?? 'Simulation failed');
      } else {
        pushStatus('done');
        onResult?.({
          counts: job?.result?.counts ?? {},
          shots: shots,
          backend: 'qiskit_aer',
        });
      }
    } catch (apiErr: any) {
      const code = apiErr?.response?.data?.error?.code;
      const msg =
        apiErr?.response?.data?.error?.message ?? 'Simulation failed';
      if (code === 'usage_limit_exceeded') {
        pushStatus(
          'error',
          `${msg} Upgrade to Pro for unlimited simulations.`
        );
      } else {
        pushStatus('error', msg);
      }
    }
  }, [commitCode, shots, onResult, pushStatus]);

  // One-way sync: AST → editor code (when 3D/scene changes the circuit).
  // When user types we do NOT go through this — onChange handles it directly.
  // After commitCode → applyOperations → this fires, we suppress one cycle.
  React.useEffect(() => {
    if (suppressAstSyncRef.current) return;
    const generated = circuitToQiskitCode({ qubits, timesteps, operations });
    const cur = codeRef.current;
    if (normalize(cur) === normalize(generated)) return;
    setCode(generated);
    codeRef.current = generated;
    if (variant === 'full' && editorRef.current?.pushUndoStop) {
      try {
        editorRef.current.pushUndoStop();
      } catch {
        /* ignore */
      }
    }
  }, [qubits, timesteps, operations, variant, setCode]);

  const ShotsInput = (
    <label className="flex items-center gap-2 text-xs text-text-400">
      Shots
      <input
        type="number"
        min={1}
        max={65536}
        value={shots}
        onChange={(e) => setShots(Number(e.target.value))}
        className="w-24 rounded-md border border-bg-700 bg-bg-950 px-2 py-1 text-right font-mono text-sm text-text-100 outline-none focus:border-primary-500"
      />
    </label>
  );

  if (variant === 'toolbar-only') {
    return (
      <div className="flex flex-wrap items-center gap-2 px-4 py-2">
        {ShotsInput}
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            void handleSimulate();
          }}
          loading={status === 'running'}
        >
          ▶ Simulate (Qiskit Aer)
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-bg-800 px-4 py-2">
        <div className="flex flex-wrap items-center gap-3 text-xs text-text-400">
          <span className="rounded-full border border-primary-800/60 bg-primary-900/20 px-2 py-0.5 text-primary-300">
            Qiskit
          </span>
          <span>Save or blur to sync with 3D scene</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {ShotsInput}
          <Button variant="secondary" size="sm" onClick={commitCode}>
            Apply Code
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              void handleSimulate();
            }}
            loading={status === 'running'}
          >
            ▶ Simulate
          </Button>
        </div>
      </div>
      {err && status === 'error' && (
        <div className="border-b border-red-900/40 bg-red-950/30 px-4 py-2 text-sm text-red-300">
          {err}
        </div>
      )}
      <div style={{ height: 420 }}>
        <Editor
          height="100%"
          defaultLanguage="python"
          theme="vs-dark"
          value={code}
          path="circuit.py"
          loading={
            <div className="flex h-full items-center justify-center text-xs text-text-500">
              Loading editor…
            </div>
          }
          onChange={(value: string | undefined) => {
            if (typeof value === 'string') {
              setCode(value);
              codeRef.current = value;
            }
          }}
          onMount={(editor, monaco) => {
            editorRef.current = editor;
            monacoRef.current = monaco;
            editor.onDidBlurEditorText(() => {
              commitCode();
            });
            editor.addCommand(
              monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
              () => {
                commitCode();
              }
            );
            editor.focus();
          }}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            renderLineHighlight: 'gutter',
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            readOnly: false,
            domReadOnly: false,
            cursorBlinking: 'smooth',
            smoothScrolling: true,
            wordWrap: 'on',
            padding: { top: 10, bottom: 10 },
          }}
        />
      </div>
    </div>
  );
};

export default CodeEditorPanel;

