import React from 'react';
import { Button } from '@qvanta/ui';

export interface CircuitToolbarProps {
  qubits: number;
  timesteps: number;
  setQubits: (n: number) => void;
  setTimesteps: (n: number) => void;
  onReset: () => void;
  lite2D: boolean;
  onToggleLite2D: () => void;
}

const CircuitToolbar: React.FC<CircuitToolbarProps> = ({
  qubits,
  timesteps,
  setQubits,
  setTimesteps,
  onReset,
  lite2D,
  onToggleLite2D
}) => {
  const [copied, setCopied] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleExportJSON = () => {
    try {
      // Import store dynamically to avoid circular stub issues; window object for MVP simplicity
      const w = window as unknown as { __qvantaCircuitStoreGetState?: () => { qubits: number; timesteps: number; operations: unknown[] } };
      const s = w.__qvantaCircuitStoreGetState?.();
      const data = s ?? { qubits, timesteps, operations: [] };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `circuit-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  };

  const handleCopyQasm = async () => {
    try {
      const w = window as unknown as { __qvantaCircuitToQasm?: () => string };
      const qasm = w.__qvantaCircuitToQasm?.() ?? `OPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[${qubits}];\ncreg c[${qubits}];\n`;
      await navigator.clipboard.writeText(qasm);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(String(reader.result));
        const w = window as unknown as { __qvantaCircuitStoreLoad?: (c: { qubits: number; timesteps: number; operations: unknown[] }) => void };
        w.__qvantaCircuitStoreLoad?.({
          qubits: Number(obj.qubits ?? qubits),
          timesteps: Number(obj.timesteps ?? timesteps),
          operations: Array.isArray(obj.operations) ? obj.operations : []
        });
      } catch {
        // ignore parse errors for MVP
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2 rounded-lg border border-bg-700 bg-bg-900/60 px-3 py-2 text-sm">
        <label className="text-text-400">Qubits</label>
        <input
          type="number"
          min={1}
          max={8}
          value={qubits}
          onChange={(e) => setQubits(Number(e.target.value))}
          className="w-16 rounded-md border border-bg-700 bg-bg-950 px-2 py-1 text-right font-mono text-text-100 outline-none focus:border-primary-500"
        />
        <label className="ml-2 text-text-400">Steps</label>
        <input
          type="number"
          min={1}
          max={32}
          value={timesteps}
          onChange={(e) => setTimesteps(Number(e.target.value))}
          className="w-20 rounded-md border border-bg-700 bg-bg-950 px-2 py-1 text-right font-mono text-text-100 outline-none focus:border-primary-500"
        />
      </div>

      <Button variant="ghost" size="sm" onClick={handleCopyQasm}>
        {copied ? '✓ QASM copied' : 'Copy QASM'}
      </Button>
      <Button variant="ghost" size="sm" onClick={handleExportJSON}>
        Export JSON
      </Button>
      <Button variant="ghost" size="sm" onClick={handleImportClick}>
        Import JSON
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button variant="ghost" size="sm" onClick={onReset}>
        Reset
      </Button>
      <Button
        variant={lite2D ? 'primary' : 'secondary'}
        size="sm"
        onClick={onToggleLite2D}
        title="Toggle 2D lite fallback for low-power devices"
      >
        {lite2D ? '2D Lite' : '3D Mode'}
      </Button>
    </div>
  );
};

export default CircuitToolbar;
