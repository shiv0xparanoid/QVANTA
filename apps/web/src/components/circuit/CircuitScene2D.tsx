import React from 'react';
import { useCircuitStore, GATE_PALETTE } from '@/store/circuit';
import type { Gate, GateOp } from '@qvanta/types';

const CELL_W = 56;
const CELL_H = 56;
const PALETTE_W = 200;

const GATE_FILL: Record<Gate, string> = {
  H: '#4f46e5',
  X: '#a855f7',
  Y: '#ec4899',
  Z: '#10b981',
  CNOT: '#f59e0b',
  Measure: '#ef4444'
};

const CircuitScene2D: React.FC = () => {
  const qubits = useCircuitStore((s) => s.qubits);
  const timesteps = useCircuitStore((s) => s.timesteps);
  const operations = useCircuitStore((s) => s.operations);
  const cursor = useCircuitStore((s) => s.cursor);
  const selectedGate = useCircuitStore((s) => s.selectedGate);
  const setSelected = useCircuitStore((s) => s.setSelectedGate);
  const placeGate = useCircuitStore((s) => s.placeGate);
  const placeGateAtCursor = useCircuitStore((s) => s.placeGateAtCursor);
  const removeAt = useCircuitStore((s) => s.removeAt);
  const setCursor = useCircuitStore((s) => s.setCursor);

  const canvasW = PALETTE_W + (timesteps + 1) * CELL_W;
  const canvasH = Math.max(qubits + 1, 4) * CELL_H + 40;

  const railY = (i: number) => 40 + (i + 0.5) * CELL_H;
  const stepX = (t: number) => PALETTE_W + (t + 0.5) * CELL_W;

  const handleCellClick = (qubit: number, timestep: number) => {
    setCursor({ qubit, timestep });
    if (selectedGate) placeGateAtCursor(selectedGate);
  };

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = useCircuitStore.getState();
      let c = { ...st.cursor };
      let handled = true;
      switch (e.key) {
        case 'ArrowLeft': c.timestep = Math.max(0, c.timestep - 1); break;
        case 'ArrowRight': c.timestep = Math.min(timesteps - 1, c.timestep + 1); break;
        case 'ArrowUp': c.qubit = Math.max(0, c.qubit - 1); break;
        case 'ArrowDown': c.qubit = Math.min(qubits - 1, c.qubit + 1); break;
        case 'Enter': case ' ':
          placeGateAtCursor(selectedGate ?? 'H'); break;
        case 'Delete': case 'Backspace':
          removeAt(st.cursor.qubit, st.cursor.timestep); break;
        default: handled = false;
      }
      if (handled) { e.preventDefault(); setCursor(c); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [qubits, timesteps, selectedGate, setCursor, placeGateAtCursor, removeAt]);

  return (
    <div className="h-full w-full overflow-auto p-4">
      <svg width={canvasW} height={canvasH} className="rounded-lg bg-bg-950">
        <g>
          {GATE_PALETTE.map((g, i) => {
            const x = 20;
            const y = 20 + i * (CELL_H - 8);
            const active = selectedGate === g;
            return (
              <g key={g} style={{ cursor: 'pointer' }} onClick={() => setSelected(g)}>
                <rect
                  x={x}
                  y={y}
                  width={PALETTE_W - 40}
                  height={CELL_H - 16}
                  rx={8}
                  fill={active ? GATE_FILL[g] : '#0f172a'}
                  stroke={active ? '#a5b4fc' : '#334155'}
                  strokeWidth={active ? 2 : 1}
                  opacity={active ? 0.95 : 0.9}
                />
                <text
                  x={x + (PALETTE_W - 40) / 2}
                  y={y + (CELL_H - 16) / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="white"
                  fontSize={14}
                  fontWeight={700}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {g}
                </text>
              </g>
            );
          })}
        </g>

        <g>
          {Array.from({ length: timesteps }).map((_, t) => (
            <text
              key={t}
              x={stepX(t)}
              y={20}
              fill="#64748b"
              fontSize={10}
              textAnchor="middle"
              style={{ userSelect: 'none' }}
            >
              t{t}
            </text>
          ))}
          {Array.from({ length: qubits }).map((_, i) => {
            const y = railY(i);
            return (
              <g key={i}>
                <line
                  x1={PALETTE_W + CELL_W * 0.2}
                  y1={y}
                  x2={PALETTE_W + (timesteps + 0.2) * CELL_W}
                  y2={y}
                  stroke="#475569"
                  strokeWidth={2}
                />
                <text x={PALETTE_W + 8} y={y - 8} fill="#64748b" fontSize={10} style={{ userSelect: 'none' }}>
                  q<tspan baselineShift="sub">{i}</tspan>
                </text>
              </g>
            );
          })}
        </g>

        <g>
          {Array.from({ length: qubits }).map((_, i) =>
            Array.from({ length: timesteps }).map((_, t) => (
              <rect
                key={`c-${i}-${t}`}
                x={PALETTE_W + t * CELL_W + CELL_W * 0.12}
                y={railY(i) - CELL_H * 0.42}
                width={CELL_W * 0.76}
                height={CELL_H * 0.84}
                rx={6}
                fill={cursor.qubit === i && cursor.timestep === t ? 'rgba(99,102,241,0.18)' : 'transparent'}
                stroke={cursor.qubit === i && cursor.timestep === t ? '#6366f1' : 'transparent'}
                strokeDasharray="3 3"
                style={{ cursor: 'crosshair' }}
                onClick={() => handleCellClick(i, t)}
              />
            ))
          )}
        </g>

        <g>
          {operations.map((op, idx) => {
            const cx = stepX(op.timestep);
            const cy = railY(op.qubit);
            const w = op.gate === 'CNOT' ? CELL_H * 0.68 : CELL_H * 0.68;
            const h = CELL_H * 0.68;
            return (
              <g
                key={`${op.gate}-${op.qubit}-${op.timestep}-${op.target ?? 'x'}-${idx}`}
                style={{ cursor: 'pointer' }}
                onDoubleClick={(e) => { e.stopPropagation(); removeAt(op.qubit, op.timestep, op.target); }}
              >
                {op.gate === 'CNOT' && op.target !== undefined && (
                  <line
                    x1={cx}
                    y1={cy}
                    x2={cx}
                    y2={railY(op.target)}
                    stroke="#f59e0b"
                    strokeWidth={2.2}
                    strokeDasharray="2 3"
                  />
                )}
                <rect
                  x={cx - w / 2}
                  y={cy - h / 2}
                  width={w}
                  height={h}
                  rx={8}
                  fill={GATE_FILL[op.gate]}
                  stroke="#1e293b"
                  strokeWidth={1.4}
                />
                <text
                  x={cx}
                  y={cy}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="white"
                  fontSize={op.gate.length > 1 ? 11 : 14}
                  fontWeight={700}
                  style={{ userSelect: 'none', pointerEvents: 'none' }}
                >
                  {op.gate}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};

export default CircuitScene2D;
