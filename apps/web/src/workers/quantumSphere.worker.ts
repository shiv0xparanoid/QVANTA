import {
  clamp,
  generatePerParticleDelay,
  generateScatterPosition,
  generateTorusTargetPosition,
  lerp,
  smoothstep
} from '../lib/quantumTorus';

type InitMsg = {
  type: 'init';
  count: number;
  uDim: number;
  vDim: number;
  seed: number;
};

type StepMsg = {
  type: 'step';
  t: number;
  cursorWorld: { x: number; y: number; z: number };
  cursorRadius: number;
  timeMs: number;
  reducedMotion: boolean;
  particleCount: number;
};

type InMsg = InitMsg | StepMsg;

interface LocalState {
  count: number;
  uDim: number;
  vDim: number;
  seed: number;
  targets: Float32Array;
  scatters: Float32Array;
  delays: Float32Array;
  positions: Float32Array;
  version: number;
}

const s: LocalState = {
  count: 0,
  uDim: 0,
  vDim: 0,
  seed: 1,
  targets: new Float32Array(),
  scatters: new Float32Array(),
  delays: new Float32Array(),
  positions: new Float32Array(),
  version: 0
};

function alloc(count: number) {
  s.count = count;
  s.targets = new Float32Array(count * 3);
  s.scatters = new Float32Array(count * 3);
  s.delays = new Float32Array(count);
  s.positions = new Float32Array(count * 3);
}

function init(msg: InitMsg) {
  const { count, uDim, vDim, seed } = msg;
  s.uDim = uDim;
  s.vDim = vDim;
  s.seed = seed >>> 0;
  alloc(count);
  const total = uDim * vDim;
  for (let i = 0; i < count; i++) {
    const idx = i % total;
    const u = Math.floor(idx / vDim) / uDim;
    const v = (idx % vDim) / vDim;
    generateTorusTargetPosition(u, v, s.targets, i * 3);
    generateScatterPosition(i, s.seed, s.scatters, i * 3, 6.5);
    s.delays[i] = generatePerParticleDelay(i, s.seed);
    s.positions[i * 3 + 0] = s.scatters[i * 3 + 0];
    s.positions[i * 3 + 1] = s.scatters[i * 3 + 1];
    s.positions[i * 3 + 2] = s.scatters[i * 3 + 2];
  }
}

function step(msg: StepMsg) {
  const { t, cursorWorld, cursorRadius, timeMs, reducedMotion, particleCount } = msg;
  const count = Math.min(s.count, Math.max(0, particleCount || s.count));
  const tSec = timeMs / 1000;
  const wobAmp = reducedMotion ? 0.003 : 0.015;
  const repulsionAmp = reducedMotion ? 0.02 : 0.18;
  const cursorRepulsionScale = lerp(0.2, 1.0, t);
  const cx = cursorWorld?.x ?? 0;
  const cy = cursorWorld?.y ?? 0;
  const cz = cursorWorld?.z ?? 0;
  const cr2 = cursorRadius * cursorRadius;

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const delay = s.delays[i];
    const localRaw = clamp((t - delay) / 0.45, 0, 1);
    const local = smoothstep(0, 1, localRaw);

    const tx = s.targets[i3 + 0];
    const ty = s.targets[i3 + 1];
    const tz = s.targets[i3 + 2];
    const sx = s.scatters[i3 + 0];
    const sy = s.scatters[i3 + 1];
    const sz = s.scatters[i3 + 2];

    let px = lerp(sx, tx, local);
    let py = lerp(sy, ty, local);
    let pz = lerp(sz, tz, local);

    if (!reducedMotion || wobAmp > 0.0001) {
      const wobSeed = i * 0.07;
      px += Math.sin(tSec * 0.8 + wobSeed) * wobAmp;
      py += Math.cos(tSec * 0.73 + wobSeed * 1.3) * wobAmp;
      pz += Math.sin(tSec * 0.61 + wobSeed * 0.7) * wobAmp;
    }

    if (cr2 > 0) {
      const dx = px - cx;
      const dy = py - cy;
      const dz = pz - cz;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < cr2 && d2 > 1e-6) {
        const d = Math.sqrt(d2);
        const falloff = 1 - d / cursorRadius;
        const strength = repulsionAmp * cursorRepulsionScale * falloff * falloff;
        const inv = 1 / d;
        px += dx * inv * strength;
        py += dy * inv * strength;
        pz += dz * inv * strength;
      }
    }

    s.positions[i3 + 0] = px;
    s.positions[i3 + 1] = py;
    s.positions[i3 + 2] = pz;
  }

  s.version++;
}

self.onmessage = function (ev: MessageEvent<InMsg>) {
  const msg = ev.data;
  switch (msg.type) {
    case 'init':
      init(msg);
      self.postMessage({
        type: 'update',
        positions: s.positions,
        version: s.version
      });
      break;
    case 'step':
      step(msg);
      const transferOpts =
        s.positions.buffer instanceof SharedArrayBuffer
          ? undefined
          : ({ transfer: [s.positions.buffer] } as StructuredSerializeOptions);
      self.postMessage(
        {
          type: 'update',
          positions: s.positions,
          version: s.version
        },
        transferOpts as any
      );
      break;
  }
};

export {};
