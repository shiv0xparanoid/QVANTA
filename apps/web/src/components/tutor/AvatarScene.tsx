import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { AvatarPresetId } from '@qvanta/ui';
import { useSpeechSynthesisViseme } from '@/hooks/useSpeechSynthesisViseme';

export interface AvatarSceneProps {
  presetId: AvatarPresetId;
}

interface Preset {
  skin: string;
  hair: string;
  accent: string;
  iris: string;
  scale: number;
}

const PRESETS: Preset[] = [
  { skin: '#f3c6a5', hair: '#1e293b', accent: '#4f46e5', iris: '#3b82f6', scale: 1.0 },
  { skin: '#d9a17a', hair: '#7c2d12', accent: '#a855f7', iris: '#16a34a', scale: 1.02 },
  { skin: '#8d5524', hair: '#020617', accent: '#ec4899', iris: '#9333ea', scale: 0.98 }
];

const makeMouthGeometry = (): THREE.BufferGeometry => {
  const width = 0.45;
  const height = 0.04;
  const depth = 0.06;
  const base = new THREE.BoxGeometry(width, height, depth, 10, 3, 1);
  const pos = base.attributes.position;
  const orig = new Float32Array(pos.array as Float32Array);

  base.morphAttributes.position = [];

  // closed = original
  const closed = new THREE.BufferAttribute(new Float32Array(orig), 3);
  base.morphAttributes.position.push(closed);

  // viseme A: mouth open vertical
  const aArr = new Float32Array(orig);
  for (let i = 0; i < pos.count; i++) {
    const y = orig[i * 3 + 1];
    aArr[i * 3 + 1] = y + (y > 0 ? 1 : -1) * 0.11;
    const x = orig[i * 3];
    aArr[i * 3] = x * 0.92;
  }
  const a = new THREE.BufferAttribute(aArr, 3);
  base.morphAttributes.position.push(a);

  // viseme O: rounded
  const oArr = new Float32Array(orig);
  for (let i = 0; i < pos.count; i++) {
    const y = orig[i * 3 + 1];
    oArr[i * 3 + 1] = y + (y > 0 ? 1 : -1) * 0.07;
    const x = orig[i * 3];
    oArr[i * 3] = x * 0.6;
    const z = orig[i * 3 + 2];
    oArr[i * 3 + 2] = z + (z > 0 ? 0.05 : z < 0 ? -0.05 : 0);
  }
  const o = new THREE.BufferAttribute(oArr, 3);
  base.morphAttributes.position.push(o);

  return base;
};

interface AvatarRigProps {
  preset: Preset;
  viseme: number;
  blinking: boolean;
}

const AvatarRig: React.FC<AvatarRigProps> = ({ preset, viseme, blinking }) => {
  const mouthRef = React.useRef<THREE.Mesh>(null);
  const [mouthGeo] = React.useState(() => makeMouthGeometry());

  React.useEffect(() => {
    const m = mouthRef.current;
    if (!m) return;
    const closed = 1 - viseme * 0.2;
    const a = viseme * 0.8;
    const o = viseme * 0.35 * (1 - viseme);
    // morph target order: [closed, A, O]
    m.morphTargetInfluences![0] = Math.max(0, closed);
    m.morphTargetInfluences![1] = Math.max(0, a);
    m.morphTargetInfluences![2] = Math.max(0, o);
  }, [viseme]);

  const eyeScaleY = blinking ? 0.08 : 1;

  return (
    <group scale={preset.scale}>
      {/* Neck */}
      <mesh position={[0, -0.85, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.28, 0.5, 24]} />
        <meshStandardMaterial color={preset.skin} roughness={0.7} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0, 0]} castShadow>
        <sphereGeometry args={[0.88, 48, 40]} />
        <meshStandardMaterial color={preset.skin} roughness={0.65} />
      </mesh>

      {/* Hair cap */}
      <mesh position={[0, 0.42, -0.05]} castShadow>
        <sphereGeometry args={[0.9, 36, 28, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
        <meshStandardMaterial color={preset.hair} roughness={0.9} />
      </mesh>

      {/* Ears */}
      <mesh position={[-0.82, -0.05, 0]}>
        <sphereGeometry args={[0.14, 16, 14]} />
        <meshStandardMaterial color={preset.skin} roughness={0.7} />
      </mesh>
      <mesh position={[0.82, -0.05, 0]}>
        <sphereGeometry args={[0.14, 16, 14]} />
        <meshStandardMaterial color={preset.skin} roughness={0.7} />
      </mesh>

      {/* Eyes */}
      <group>
        <mesh position={[-0.28, 0.08, 0.78]} scale={[1, eyeScaleY, 1]}>
          <sphereGeometry args={[0.13, 24, 18]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} />
        </mesh>
        <mesh position={[-0.28, 0.08, 0.9]} scale={[1, eyeScaleY, 1]}>
          <sphereGeometry args={[0.065, 20, 14]} />
          <meshStandardMaterial color={preset.iris} roughness={0.2} />
        </mesh>
        <mesh position={[-0.26, 0.09, 0.95]} scale={[1, eyeScaleY, 1]}>
          <sphereGeometry args={[0.025, 12, 10]} />
          <meshBasicMaterial color="#020617" />
        </mesh>

        <mesh position={[0.28, 0.08, 0.78]} scale={[1, eyeScaleY, 1]}>
          <sphereGeometry args={[0.13, 24, 18]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} />
        </mesh>
        <mesh position={[0.28, 0.08, 0.9]} scale={[1, eyeScaleY, 1]}>
          <sphereGeometry args={[0.065, 20, 14]} />
          <meshStandardMaterial color={preset.iris} roughness={0.2} />
        </mesh>
        <mesh position={[0.3, 0.09, 0.95]} scale={[1, eyeScaleY, 1]}>
          <sphereGeometry args={[0.025, 12, 10]} />
          <meshBasicMaterial color="#020617" />
        </mesh>
      </group>

      {/* Brows */}
      <mesh position={[-0.28, 0.3, 0.79]} rotation={[0.2, 0, 0.08]}>
        <boxGeometry args={[0.26, 0.035, 0.02]} />
        <meshStandardMaterial color={preset.hair} roughness={0.9} />
      </mesh>
      <mesh position={[0.28, 0.3, 0.79]} rotation={[0.2, 0, -0.08]}>
        <boxGeometry args={[0.26, 0.035, 0.02]} />
        <meshStandardMaterial color={preset.hair} roughness={0.9} />
      </mesh>

      {/* Nose */}
      <mesh position={[0, -0.14, 0.88]} rotation={[0.4, 0, 0]}>
        <coneGeometry args={[0.09, 0.22, 16]} />
        <meshStandardMaterial color={preset.skin} roughness={0.75} />
      </mesh>

      {/* Mouth with viseme morph targets */}
      <mesh
        ref={mouthRef}
        geometry={mouthGeo}
        position={[0, -0.46, 0.8]}
      >
        <meshStandardMaterial color="#7f1d1d" roughness={0.8} />
      </mesh>

      {/* Accent earring / chip (preset personality) */}
      <mesh position={[-0.85, -0.3, 0]}>
        <torusGeometry args={[0.045, 0.015, 12, 24]} />
        <meshStandardMaterial color={preset.accent} metalness={0.9} roughness={0.15} />
      </mesh>

      {/* Collar accent */}
      <mesh position={[0, -1.12, 0.12]}>
        <torusGeometry args={[0.36, 0.05, 16, 48, Math.PI]} />
        <meshStandardMaterial color={preset.accent} metalness={0.4} roughness={0.5} />
      </mesh>
    </group>
  );
};

const AvatarScene: React.FC<AvatarSceneProps> = ({ presetId }) => {
  const numericPresetId: number = typeof presetId === 'number' ? presetId : 0;
  const preset = PRESETS[numericPresetId] ?? PRESETS[0];
  const { currentViseme, isSpeaking, speak } = useSpeechSynthesisViseme();
  const [blinking, setBlinking] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    const loop = () => {
      if (cancelled) return;
      const wait = 2500 + Math.random() * 3500;
      setTimeout(() => {
        if (cancelled) return;
        setBlinking(true);
        setTimeout(() => {
          if (!cancelled) setBlinking(false);
          loop();
        }, 140 + Math.random() * 80);
      }, wait);
    };
    loop();
    return () => { cancelled = true; };
  }, []);

  // expose speak API globally for chat panel
  React.useEffect(() => {
    const w = window as any;
    w.__qvantaTutorSpeak = (text: string, voiceIdx?: number) => speak(text, voiceIdx ?? numericPresetId);
  }, [speak, numericPresetId]);

  return (
    <div className="h-full w-full">
      <Canvas camera={{ position: [0, 0.15, 3.1], fov: 42 }}>
        <color attach="background" args={['#020617']} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 4, 4]} intensity={0.6} castShadow />
        <directionalLight position={[-3, 2, 2]} intensity={0.2} color={preset.accent} />

        {/* Soft glow disk behind avatar */}
        <mesh position={[0, 0, -1.6]} rotation={[0, 0, 0]}>
          <circleGeometry args={[2.1, 48]} />
          <meshBasicMaterial color={preset.accent} transparent opacity={0.08} />
        </mesh>

        <group position={[0, -0.1, 0]}>
          <AvatarRig preset={preset} viseme={currentViseme} blinking={blinking} />
        </group>

        <OrbitControls
          enablePan={false}
          minDistance={2.2}
          maxDistance={5}
          minPolarAngle={Math.PI * 0.28}
          maxPolarAngle={Math.PI * 0.75}
          target={[0, -0.05, 0]}
        />
      </Canvas>
      <div className="pointer-events-none absolute bottom-3 left-4 text-[10px] uppercase tracking-wide text-text-600">
        {isSpeaking ? 'Speaking…' : 'Idle · drag to rotate'}
      </div>
    </div>
  );
};

export default AvatarScene;
