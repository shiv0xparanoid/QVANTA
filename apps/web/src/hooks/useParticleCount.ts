import React from 'react';

let cachedGlCap: number | null = null;

function detectLowEndGpu(): boolean {
  if (typeof navigator === 'undefined') return false;
  try {
    if (cachedGlCap === null) {
      const canvas = document.createElement('canvas');
      const gl =
        (canvas.getContext('webgl2') as WebGL2RenderingContext | null) ??
        (canvas.getContext('webgl') as WebGLRenderingContext | null);
      if (!gl) {
        cachedGlCap = 0;
      } else {
        const isGL2 = typeof (gl as WebGL2RenderingContext).MAX_SAMPLES === 'number';
        const maxSamples = isGL2
          ? ((gl as WebGL2RenderingContext).getParameter(
              (gl as WebGL2RenderingContext).MAX_SAMPLES
            ) as number)
          : 0;
        cachedGlCap = typeof maxSamples === 'number' ? maxSamples : 0;
      }
    }
    return (cachedGlCap ?? 0) < 4;
  } catch {
    return false;
  }
}

export function useParticleCount(desktopCount: number, mobileMax: number): number {
  const [count, setCount] = React.useState<number>(desktopCount);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const hardware =
      typeof navigator.hardwareConcurrency === 'number'
        ? navigator.hardwareConcurrency
        : 4;
    const isMobile =
      typeof window.matchMedia === 'function' &&
      (window.matchMedia('(max-width: 768px)').matches ||
        window.matchMedia('(pointer: coarse)').matches);
    const lowEnd = detectLowEndGpu();

    const effective = Math.min(
      desktopCount,
      Math.max(
        200,
        Math.min(
          mobileMax,
          isMobile ? mobileMax : lowEnd ? Math.floor(desktopCount * 0.5) : desktopCount
        )
      ),
      hardware <= 4 ? Math.floor(desktopCount * 0.45) : desktopCount
    );
    setCount(effective);
  }, [desktopCount, mobileMax]);

  return count;
}
