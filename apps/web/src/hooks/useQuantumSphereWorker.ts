import React from 'react';

type WorkerApi = {
  step: (args: {
    t: number;
    cursorWorld: { x: number; y: number; z: number };
    cursorRadius: number;
    timeMs: number;
    reducedMotion: boolean;
    particleCount: number;
  }) => void;
  getPositionsRef: () => Float32Array | null;
  getVersionRef: () => React.MutableRefObject<number>;
  dispose: () => void;
};

export function useQuantumSphereWorker(
  desktopCount: number,
  activeCount: number,
  uDim: number,
  vDim: number,
  seed: number = 42
): WorkerApi {
  const workerRef = React.useRef<Worker | null>(null);
  const positionsRef = React.useRef<Float32Array | null>(null);
  const versionRef = React.useRef<number>(0);
  const initializedCount = React.useRef<number>(-1);
  const latestCount = React.useRef<number>(activeCount);

  latestCount.current = activeCount;

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const worker = new Worker(
      new URL('../workers/quantumSphere.worker.ts', import.meta.url),
      { type: 'module' }
    );
    workerRef.current = worker;

    const onMsg = (ev: MessageEvent) => {
      if (ev.data && ev.data.type === 'update') {
        positionsRef.current = ev.data.positions as Float32Array;
        versionRef.current = ev.data.version as number;
      }
    };
    worker.addEventListener('message', onMsg);

    return () => {
      worker.removeEventListener('message', onMsg);
      worker.terminate();
      workerRef.current = null;
      initializedCount.current = -1;
      positionsRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    const w = workerRef.current;
    if (!w) return;
    if (initializedCount.current !== desktopCount) {
      w.postMessage({
        type: 'init',
        count: desktopCount,
        uDim,
        vDim,
        seed
      });
      initializedCount.current = desktopCount;
    }
  }, [desktopCount, uDim, vDim, seed]);

  return {
    step: (args) => {
      const w = workerRef.current;
      if (!w) return;
      w.postMessage({
        type: 'step',
        ...args,
        particleCount: latestCount.current
      });
    },
    getPositionsRef: () => positionsRef.current,
    getVersionRef: () => versionRef,
    dispose: () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    }
  };
}
