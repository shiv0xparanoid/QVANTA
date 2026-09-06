import React from 'react';
import { useParams } from 'react-router-dom';
import { Button, Card, CardHeader, CardTitle, CardContent } from '@qvanta/ui';
import CircuitScene from '@/components/circuit/CircuitScene';
import BlochPanel from '@/components/circuit/BlochPanel';
import CodeEditorPanel from '@/components/circuit/CodeEditorPanel';
import SimulationResults from '@/components/circuit/SimulationResults';
import CircuitToolbar from '@/components/circuit/CircuitToolbar';
import { useUIStore } from '@/store/ui';
import { useCircuitStore } from '@/store/circuit';

type TabKey = 'editor' | 'results';

const CircuitBuilderPage: React.FC = () => {
  const { id } = useParams();
  const lite2DMode = useUIStore((s) => s.lite2DMode);
  const toggleLite2D = useUIStore((s) => s.toggleLite2D);

  const resetCircuit = useCircuitStore((s) => s.reset);
  const setQubits = useCircuitStore((s) => s.setQubits);
  const setTimesteps = useCircuitStore((s) => s.setTimesteps);
  const qubits = useCircuitStore((s) => s.qubits);
  const timesteps = useCircuitStore((s) => s.timesteps);

  const [tab, setTab] = React.useState<TabKey>('editor');
  const [simStatus, setSimStatus] = React.useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [simError, setSimError] = React.useState<string | null>(null);
  const [simOutput, setSimOutput] = React.useState<{
    counts: Record<string, number>;
    shots: number;
    backend: string;
    blochVectors?: Array<{ x: number; y: number; z: number }>;
  } | null>(null);

  React.useEffect(() => {
    return () => {
      // no-op cleanup placeholder; will load/save circuit by id later
    };
  }, [id]);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-100">
            Circuit Builder{id ? <span className="ml-2 text-sm font-normal text-text-500">#{id.slice(0, 8)}</span> : null}
          </h1>
          <p className="mt-1 text-sm text-text-400">
            Drag gates onto the 3D rails, or use the keyboard. Changes sync with the code editor in real time.
          </p>
        </div>
        <CircuitToolbar
          qubits={qubits}
          timesteps={timesteps}
          setQubits={setQubits}
          setTimesteps={setTimesteps}
          onReset={resetCircuit}
          lite2D={lite2DMode}
          onToggleLite2D={toggleLite2D}
        />
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
        <Card className="flex min-h-[480px] flex-col xl:col-span-1">
          <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 border-b border-bg-800 pb-3">
            <CardTitle className="text-base">{lite2DMode ? 'Circuit (2D Lite)' : '3D Circuit Scene'}</CardTitle>
            <div className="flex items-center gap-2 text-xs text-text-500">
              <span className="font-mono">{qubits} qubits × {timesteps} steps</span>
            </div>
          </CardHeader>
          <CardContent className="relative flex-1 p-0">
            <CircuitScene />
          </CardContent>
        </Card>

        <Card className="flex min-h-[480px] flex-col">
          <BlochPanel />
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4 space-y-0 border-b border-bg-800 pb-3">
          <div className="flex items-center gap-2">
            <Button
              variant={tab === 'editor' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setTab('editor')}
            >
              Code Editor
            </Button>
            <Button
              variant={tab === 'results' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setTab('results')}
            >
              Simulation Results
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {simStatus === 'loading' && (
              <span className="text-xs text-text-400">Running simulation…</span>
            )}
            {simStatus === 'error' && simError && (
              <span className="text-xs text-red-400">{simError}</span>
            )}
            <CodeEditorPanel
              externalControl={false}
              onStatusChange={(st, err) => {
                setSimStatus(st === 'running' ? 'loading' : st as any);
                setSimError(err ?? null);
                if (st === 'done') {
                  // results also set inside SimulationResults; mirror via store later
                }
              }}
              onResult={(r) => setSimOutput(r)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {tab === 'editor' ? (
            <CodeEditorPanel
              externalControl
              onStatusChange={(st, err) => {
                setSimStatus(st === 'running' ? 'loading' : st as any);
                setSimError(err ?? null);
              }}
              onResult={(r) => setSimOutput(r)}
            />
          ) : (
            <SimulationResults
              status={simStatus}
              error={simError}
              result={simOutput}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CircuitBuilderPage;
