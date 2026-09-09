import React from 'react';
import Editor from '@monaco-editor/react';
import { Button } from '@qvanta/ui';
import { useCircuitStore } from '@/store/circuit';
import { circuitToQiskitCode, parseQiskitCode } from '@/lib/circuit';
import { apiClient } from '@/lib/api-client';
import type { GateOp } from '@qvanta/types';

type SimStatus = 'idle' | 'running' | 'done' | 'error';

export interface CodeEditorPanelProps {
  externalControl: boolean;
  shotsOverride?: number;
  onShotsChange?: (shots: number) => void;
  onStatusChange?: (status: SimStatus, error?: string | null) => void;
  onResult?: (r: {
    counts: Record<string, number>;
    shots: number;
    backend: string;
    blochVectors?: Array<{ x: number; y: number; z: number }>;
  }) => void;
}

interface MonacoMarker {
  severity: 8 | 4;
  message: string;
  startLineNumber: number;
  endLineNumber: number;
  startColumn: number;
  endColumn: number;
}

const CodeEditorPanel: React.FC<CodeEditorPanelProps> = ({ externalControl, shotsOverride, onShotsChange, onStatusChange, onResult }) => {
  const operations = useCircuitStore((s) => s.operations);
  const qubits = useCircuitStore((s) => s.qubits);
  const timesteps = useCircuitStore((s) => s.timesteps);
  const applyOperations = useCircuitStore((s) => s.applyOperations);
  const setQubits = useCircuitStore((s) => s.setQubits);
  const setTimesteps = useCircuitStore((s) => s.setTimesteps);

  const editorRef = React.useRef<any>(null);
  const monacoRef = React.useRef<any>(null);
  const userEditingRef = React.useRef<number>(0);
  const lastSyncedGeneratedRef = React.useRef<string>('');

  const [code, setCode] = React.useState<string>(() =>
    circuitToQiskitCode({ qubits, timesteps, operations })
  );
  const [shotsInternal, setShotsInternal] = React.useState(1024);
  const shots = shotsOverride ?? shotsInternal;
  const setShots = (v: number) => {
    setShotsInternal(v);
    onShotsChange?.(v);
  };
  const [status, setStatus] = React.useState<SimStatus>('idle');
  const [err, setErr] = React.useState<string | null>(null);

  const markUserEditing = () => {
    userEditingRef.current = Date.now();
  };

  React.useEffect(() => {
    const generated = circuitToQiskitCode({ qubits, timesteps, operations });
    if (generated === lastSyncedGeneratedRef.current) return;

    const now = Date.now();
    const editingRecently = now - userEditingRef.current < 1500;
    if (editingRecently) return;

    const current = editorRef.current?.getValue?.() ?? code;
    const gNorm = generated.replace(/\s+/g, ' ').trim();
    const cNorm = current.replace(/\s+/g, ' ').trim();
    if (gNorm !== cNorm) {
      lastSyncedGeneratedRef.current = generated;
      setCode(generated);
      if (editorRef.current?.setValue) {
        editorRef.current.setValue(generated);
      }
    } else {
      lastSyncedGeneratedRef.current = generated;
    }
  }, [qubits, timesteps, operations]);

  const pushStatus = (s: SimStatus, e: string | null = null) => {
    setStatus(s);
    setErr(e);
    onStatusChange?.(s, e);
  };

  const setMarkers = (markers: MonacoMarker[]) => {
    if (monacoRef.current && editorRef.current?.getModel) {
      const model = editorRef.current.getModel();
      if (model) {
        monacoRef.current.editor.setModelMarkers(model, 'qvanta', markers);
      }
    }
  };

  const commitCode = () => {
    const val = editorRef.current?.getValue?.() ?? code;
    try {
      const current = { qubits, timesteps, operations };
      const parsed = parseQiskitCode(val, current);
      setMarkers([]);
      const maxQ = Math.max(
        qubits,
        parsed.qubits,
        ...parsed.operations.flatMap((o: GateOp) => [o.qubit, o.target ?? 0])
      );
      const maxT = Math.max(
        timesteps,
        parsed.timesteps,
        ...parsed.operations.map((o: GateOp) => o.timestep + 1)
      );
      if (maxQ !== qubits) setQubits(maxQ);
      if (maxT !== timesteps) setTimesteps(maxT);
      applyOperations(parsed.operations);
      pushStatus('idle');
    } catch (parseErr: any) {
      const msg = typeof parseErr?.message === 'string' ? parseErr.message : 'Parse error';
      const line = Number(parseErr?.line ?? 1);
      setMarkers([{
        severity: 8,
        message: msg,
        startLineNumber: line,
        endLineNumber: line,
        startColumn: 1,
        endColumn: 1000
      }]);
      pushStatus('error', msg);
    }
  };

  const handleSimulate = async () => {
    commitCode();
    const snapshot = useCircuitStore.getState();
    const circuit = {
      qubits: snapshot.qubits,
      timesteps: snapshot.timesteps,
      operations: snapshot.operations
    };
    pushStatus('running');
    try {
      let tries = 0;
      const res = await apiClient.post('/simulations', {
        format: 'json_ast',
        backend: 'qiskit_aer',
        shots: Math.max(1, Math.floor(shots)),
        circuit: JSON.stringify(circuit)
      });
      let job = res.data;
      const pollMs = 300;
      const maxTries = 40;
      while (job?.status === 'queued' || job?.status === 'running') {
        if (++tries > maxTries) break;
        await new Promise((r) => setTimeout(r, pollMs));
        try {
          const j = await apiClient.get(`/simulate/jobs/${job.id}`).catch(async () => {
            return await apiClient.get(`/simulations/${job.id}`);
          });
          if (j?.data) job = j.data;
        } catch {
          break;
        }
      }
      if (job?.status === 'completed') {
        const result = job.result ?? {};
        const counts: Record<string, number> = result.counts ?? {};
        const shotsVal = Object.values(counts).reduce((a, b) => a + Number(b), 0) || shots;
        const bloch = Array.isArray(result.blochVectors) ? result.blochVectors : undefined;
        onResult?.({ counts, shots: shotsVal, backend: 'qiskit_aer', blochVectors: bloch });
        pushStatus('done');
      } else if (job?.status === 'failed') {
        pushStatus('error', job.error ?? 'Simulation failed');
      } else {
        pushStatus('done');
        onResult?.({
          counts: job?.result?.counts ?? {},
          shots: shots,
          backend: 'qiskit_aer'
        });
      }
    } catch (apiErr: any) {
      const code = apiErr?.response?.data?.error?.code;
      const msg = apiErr?.response?.data?.error?.message ?? 'Simulation failed';
      if (code === 'usage_limit_exceeded') {
        pushStatus('error', `${msg} Upgrade to Pro for unlimited simulations.`);
      } else {
        pushStatus('error', msg);
      }
    }
  };

  if (!externalControl) {
    return (
      <div className="flex flex-wrap items-center gap-2 px-4 py-2">
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
        <Button variant="primary" size="sm" onClick={handleSimulate} loading={status === 'running'}>
          ▶ Simulate (Qiskit Aer)
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-bg-800 px-4 py-2">
        <div className="flex flex-wrap items-center gap-3 text-xs text-text-400">
          <span className="rounded-full border border-primary-800/60 bg-primary-900/20 px-2 py-0.5 text-primary-300">Qiskit</span>
          <span>Save or blur to sync with 3D scene</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          <Button variant="secondary" size="sm" onClick={commitCode}>
            Apply Code
          </Button>
          <Button variant="primary" size="sm" onClick={handleSimulate} loading={status === 'running'}>
            ▶ Simulate
          </Button>
        </div>
      </div>
      {err && status === 'error' && (
        <div className="border-b border-red-900/40 bg-red-950/30 px-4 py-2 text-sm text-red-300">{err}</div>
      )}
      <div style={{ height: 420 }}>
        <Editor
          height="100%"
          defaultLanguage="python"
          theme="vs-dark"
          defaultValue={code}
          path="circuit.py"
          onMount={(editor, monaco) => {
            editorRef.current = editor;
            monacoRef.current = monaco;
            editor.onDidChangeModelContent(() => {
              markUserEditing();
              setCode(editor.getValue());
            });
            editor.onDidBlurEditorText(() => {
              commitCode();
            });
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
              commitCode();
            });
          }}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            renderLineHighlight: 'gutter',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
          }}
        />
      </div>
    </div>
  );
};

export default CodeEditorPanel;
