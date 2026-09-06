import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

export interface SimulationResultsProps {
  status: 'idle' | 'loading' | 'done' | 'error';
  error: string | null;
  result: {
    counts: Record<string, number>;
    shots: number;
    backend: string;
    blochVectors?: Array<{ x: number; y: number; z: number }>;
  } | null;
}

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16'];

const SimulationResults: React.FC<SimulationResultsProps> = ({ status, error, result }) => {
  if (status === 'idle' && !result) {
    return (
      <div className="flex min-h-[420px] items-center justify-center p-8 text-center">
        <div className="max-w-md space-y-2 text-sm text-text-400">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full border border-bg-700 bg-bg-900 text-text-500">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
              <path d="M3 3v18h18" strokeLinecap="round" />
              <rect x="6" y="12" width="3" height="6" rx="1" />
              <rect x="11" y="8" width="3" height="10" rx="1" />
              <rect x="16" y="5" width="3" height="13" rx="1" />
            </svg>
          </div>
          <p className="font-medium text-text-300">No simulation run yet</p>
          <p>Build a circuit, then click <span className="rounded bg-bg-800 px-1 text-text-200">Simulate</span> in the Code Editor tab to see measurement outcome histograms here.</p>
        </div>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 py-10">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-bg-700 border-t-primary-500" />
        <p className="text-sm text-text-400">Running simulation on Qiskit Aer backend…</p>
      </div>
    );
  }

  if (status === 'error' && error) {
    return (
      <div className="mx-4 my-8 rounded-lg border border-red-900/50 bg-red-950/30 p-5">
        <div className="text-sm font-semibold text-red-300">Simulation failed</div>
        <p className="mt-1 text-sm text-red-200">{error}</p>
      </div>
    );
  }

  const entries = Object.entries(result?.counts ?? {});
  const total = entries.reduce((a, [, n]) => a + Number(n), 0) || result?.shots || 0;

  type ChartRow = { label: string; count: number; pct: string; color: string };
  const data: ChartRow[] =
    entries.length === 0
      ? [{ label: '0', count: 0, pct: '0.0', color: COLORS[0] }]
      : entries
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([label, count], i): ChartRow => ({
            label,
            count: Number(count),
            pct: total ? ((Number(count) / total) * 100).toFixed(1) : '0.0',
            color: COLORS[i % COLORS.length]
          }));

  return (
    <div className="flex min-h-[420px] flex-col p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-text-100">Measurement Histogram</h3>
          <p className="text-xs text-text-500">
            {result?.backend ?? 'qiskit_aer'} · {total.toLocaleString()} shots · {entries.length} outcome{entries.length === 1 ? '' : 's'}
          </p>
        </div>
        {data.length > 0 && data[0].count > 0 && (
          <div className="rounded-lg border border-bg-700 bg-bg-900/50 px-3 py-1.5 text-xs text-text-400">
            Top:{' '}
            <span className="font-mono text-primary-300">{data.reduce((max, d) => (d.count > max.count ? d : max), data[0]).label}</span>
            {' · '}
            <span className="font-mono text-text-200">
              {data.reduce((max, d) => (d.count > max.count ? d : max), data[0]).pct}%
            </span>
          </div>
        )}
      </div>
      <div className="min-h-[340px] flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 32 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: '#64748b', fontSize: 12, fontFamily: 'ui-monospace, monospace' }}
              axisLine={{ stroke: '#334155' }}
              tickLine={false}
              angle={-18}
              textAnchor="end"
              height={44}
            />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 12 }}
              axisLine={{ stroke: '#334155' }}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(99,102,241,0.06)' }}
              contentStyle={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: 8,
                color: '#f1f5f9',
                fontSize: 12
              }}
              formatter={(value: any, _name: any, item: any) => [
                `${Number(value).toLocaleString()} shots (${item.payload.pct}%)`,
                'Measurement'
              ]}
              labelStyle={{ color: '#a5b4fc', fontFamily: 'ui-monospace, monospace' }}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={56}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SimulationResults;
