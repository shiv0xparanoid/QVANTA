import React from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useParticleCount, usePrefersReducedMotion } from '@/hooks';

interface AmbientStarfieldProps {
  extent?: [number, number, number];
  color?: string;
  density?: number;
}

const AmbientStarfield: React.FC<AmbientStarfieldProps> = ({
  extent = [40, 26, 30],
  color = '#eeecff',
  density
}) => {
  const reduced = usePrefersReducedMotion();
  const desktopCount = density ?? 250;
  const count = useParticleCount(desktopCount, 120);
  const pointsRef = React.useRef<THREE.Points | null>(null);
  const geomRef = React.useRef<THREE.BufferGeometry | null>(null);

  React.useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const baseCol = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * extent[0];
      pos[i * 3 + 1] = (Math.random() - 0.5) * extent[1];
      pos[i * 3 + 2] = (Math.random() - 0.5) * extent[2];
      const tint = 0.5 + Math.random() * 0.5;
      col[i * 3 + 0] = baseCol.r * tint;
      col[i * 3 + 1] = baseCol.g * tint;
      col[i * 3 + 2] = baseCol.b * tint;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geomRef.current = g;
    return g;
  }, [count, color, extent]);

  useFrame((_, dt) => {
    if (reduced || !pointsRef.current) return;
    const positions = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const arr = positions.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      arr[idx + 1] += dt * (0.05 + ((i * 0.013) % 0.1));
      arr[idx + 0] += dt * 0.02 * ((i % 5) - 2);
      if (arr[idx + 1] > extent[1] * 0.55) arr[idx + 1] = -extent[1] * 0.55;
      if (arr[idx + 0] > extent[0] * 0.6) arr[idx + 0] = -extent[0] * 0.6;
    }
    positions.needsUpdate = true;
  });

  if (!geomRef.current) return null;
  return (
    <points ref={pointsRef} geometry={geomRef.current}>
      <pointsMaterial
        size={0.035}
        vertexColors
        sizeAttenuation
        transparent
        opacity={0.8}
        depthWrite={false}
      />
    </points>
  );
};

export default AmbientStarfield;
