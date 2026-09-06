import React from 'react';
import { useUIStore } from '@/store/ui';
import CircuitScene3D from './CircuitScene3D';
import CircuitScene2D from './CircuitScene2D';

const CircuitScene: React.FC = () => {
  const lite2DMode = useUIStore((s) => s.lite2DMode);
  const containerRef = React.useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="relative h-[560px] w-full bg-bg-950/50">
      {lite2DMode ? <CircuitScene2D /> : <CircuitScene3D />}
      <div className="pointer-events-none absolute bottom-2 right-3 text-[10px] uppercase tracking-wide text-text-600">
        Arrow keys: move cursor · Enter: place · Del: remove gate
      </div>
    </div>
  );
};

export default CircuitScene;
