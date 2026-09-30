import { useRef, useEffect, useState } from 'react';
import Logo from '@/components/ui/Logo';

type LandingPhase =
  | 'init'
  | 'text_particles'
  | 'text_break'
  | 'particles_to_logo'
  | 'logo_done'
  | 'qanta_in'
  | 'tagline'
  | 'interaction';

interface LandingProps {
  phase: LandingPhase;
  onStart: () => void;
}

interface Particle {
  x: number;
  y: number;
  tx: number;
  ty: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  ox: number;
  oy: number;
}

const PARTICLE_COUNT = 2400;
const TEXT_STRING = 'MAKE QUANTUM VISIBLE';

const sampleImageData = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  stride: number,
  alphaThreshold = 24,
): Array<{ x: number; y: number; color: string }> => {
  const data = ctx.getImageData(0, 0, width, height).data;
  const out: Array<{ x: number; y: number; color: string }> = [];
  for (let y = 0; y < height; y += stride) {
    for (let x = 0; x < width; x += stride) {
      const idx = (y * width + x) * 4;
      const a = data[idx + 3];
      if (a > alphaThreshold) {
        const r = Math.min(255, data[idx] + 40);
        const g = Math.min(255, data[idx + 1] + 40);
        const b = Math.min(255, data[idx + 2] + 40);
        out.push({ x, y, color: `rgba(${r},${g},${b},1)` });
      }
    }
  }
  return out;
};

const logoColorForY = (pct: number): string => {
  const c1 = [139, 92, 246];
  const c2 = [99, 102, 241];
  const c3 = [59, 130, 246];
  const c4 = [34, 211, 238];
  const c5 = [236, 72, 153];
  let r: number, g: number, b: number;
  if (pct < 0.25) {
    const t = pct / 0.25;
    r = c1[0] + (c2[0] - c1[0]) * t;
    g = c1[1] + (c2[1] - c1[1]) * t;
    b = c1[2] + (c2[2] - c1[2]) * t;
  } else if (pct < 0.55) {
    const t = (pct - 0.25) / 0.3;
    r = c2[0] + (c3[0] - c2[0]) * t;
    g = c2[1] + (c3[1] - c2[1]) * t;
    b = c2[2] + (c3[2] - c2[2]) * t;
  } else if (pct < 0.85) {
    const t = (pct - 0.55) / 0.3;
    r = c3[0] + (c4[0] - c3[0]) * t;
    g = c3[1] + (c4[1] - c3[1]) * t;
    b = c3[2] + (c4[2] - c3[2]) * t;
  } else {
    const t = (pct - 0.85) / 0.15;
    r = c4[0] + (c5[0] - c4[0]) * t;
    g = c4[1] + (c5[1] - c4[1]) * t;
    b = c4[2] + (c5[2] - c4[2]) * t;
  }
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},1)`;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInCubic = (t: number) => t * t * t;
const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t);
const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

export default function Landing({ phase, onStart }: LandingProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const phaseTimingRef = useRef<Record<string, number>>({});
  const prevPhaseRef = useRef<LandingPhase>('init');
  const sizeRef = useRef({ W: 0, H: 0, fontSize: 40 });
  const [logoRendered, setLogoRendered] = useState(false);
  const [showQanta, setShowQanta] = useState(false);

  useEffect(() => {
    if (phase === prevPhaseRef.current) return;
    phaseTimingRef.current[phase] = performance.now();
    prevPhaseRef.current = phase;

    if (phase === 'particles_to_logo') {
      buildLogoTargets();
    }
    if (phase === 'logo_done') {
      setLogoRendered(true);
    }
    if (phase === 'qanta_in') {
      setLogoRendered(true);
      setShowQanta(true);
    }
    if (phase === 'text_break') {
      const particles = particlesRef.current;
      const { W, H } = sizeRef.current;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const angle = Math.random() * Math.PI * 2;
        const speed = 3.5 + Math.random() * 6;
        p.vx = Math.cos(angle) * speed * (0.5 + Math.random() * 1.1);
        p.vy =
          Math.sin(angle) * speed * (0.5 + Math.random() * 1.1) -
          Math.random() * 2.5;
        p.tx = p.x + (Math.random() - 0.5) * Math.max(W, H) * 1.8;
        p.ty = p.y + (Math.random() - 0.5) * Math.max(W, H) * 1.8;
      }
    }
  }, [phase]);

  const buildLogoTargets = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = canvas.width / dpr;
    const H = canvas.height / dpr;

    const off = document.createElement('canvas');
    off.width = W;
    off.height = H;
    const octx = off.getContext('2d');
    if (!octx) return;

    const logoRatio = 1 / 0.72;
    const targetW = Math.min(W * 0.42, 520);
    const targetH = targetW / logoRatio;
    const lx = Math.round((W - targetW) / 2 - 60);
    const ly = Math.round((H - targetH) / 2);

    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgEl.setAttribute('width', String(targetW));
    svgEl.setAttribute('height', String(targetH));
    svgEl.setAttribute('viewBox', `0 0 ${targetW} ${targetH}`);

    const mkGrad = (id: string, stops: Array<[number, string]>) => {
      const g = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'linearGradient',
      );
      g.setAttribute('id', id);
      g.setAttribute('x1', '0');
      g.setAttribute('y1', '0');
      g.setAttribute('x2', '0');
      g.setAttribute('y2', '1');
      g.innerHTML = stops
        .map(
          ([o, c]) => `<stop offset="${o}%" stop-color="${c}"/>`,
        )
        .join('');
      return g;
    };
    svgEl.appendChild(
      mkGrad('gl', [
        [0, '#8B5CF6'],
        [50, '#A855F7'],
        [100, '#EC4899'],
      ]),
    );
    svgEl.appendChild(
      mkGrad('gc', [
        [0, '#6366F1'],
        [40, '#3B82F6'],
        [100, '#22D3EE'],
      ]),
    );
    svgEl.appendChild(
      mkGrad('gr', [
        [0, '#8B5CF6'],
        [50, '#A855F7'],
        [100, '#EC4899'],
      ]),
    );

    const left = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'rect',
    );
    left.setAttribute('x', String(targetW * 0.06));
    left.setAttribute('y', String(targetH * 0.14));
    left.setAttribute('width', String(targetW * 0.095));
    left.setAttribute('height', String(targetH * 0.72));
    left.setAttribute('rx', String(targetW * 0.045));
    left.setAttribute('fill', 'url(#gl)');
    svgEl.appendChild(left);

    const cxInner = targetW * 0.56;
    const cyInner = targetH * 0.72;
    const cxOffsetX = targetW * 0.21;
    const cxOffsetY = targetH * 0.14;
    const innerG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    innerG.setAttribute('transform', `translate(${cxOffsetX},${cxOffsetY})`);

    const mkRect = (x: number, y: number, w: number, h: number, r: number) => {
      const rect = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'rect',
      );
      rect.setAttribute('x', String(x));
      rect.setAttribute('y', String(y));
      rect.setAttribute('width', String(w));
      rect.setAttribute('height', String(h));
      rect.setAttribute('rx', String(r));
      rect.setAttribute('fill', 'url(#gc)');
      return rect;
    };
    innerG.appendChild(
      mkRect(
        cxInner * (2 / 56),
        0,
        cxInner * (10.5 / 56),
        cyInner * (50 / 72),
        cxInner * (5.25 / 56),
      ),
    );
    innerG.appendChild(
      mkRect(
        cxInner * (22.5 / 56),
        0,
        cxInner * (11 / 56),
        cyInner,
        cxInner * (5.5 / 56),
      ),
    );
    innerG.appendChild(
      mkRect(
        cxInner * (43.5 / 56),
        0,
        cxInner * (10.5 / 56),
        cyInner * (50 / 72),
        cxInner * (5.25 / 56),
      ),
    );

    const sw = cyInner * (10.5 / 72);
    const pY1 = cyInner * (44 / 72);
    const pY2 = cyInner * (66 / 72);
    const midX = cxInner / 2;
    const p1x = cxInner * (7.25 / 56);
    const p2x = cxInner * (48.75 / 56);
    const path = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'path',
    );
    path.setAttribute(
      'd',
      `M ${p1x} ${pY1} Q ${p1x} ${pY2} ${midX} ${pY2} Q ${p2x} ${pY2} ${p2x} ${pY1}`,
    );
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'url(#gc)');
    path.setAttribute('stroke-width', String(sw));
    path.setAttribute('stroke-linecap', 'round');
    innerG.appendChild(path);
    svgEl.appendChild(innerG);

    const rW = targetW * 0.14;
    const rH = targetH * 0.72;
    const rX = targetW * 0.8;
    const rY = targetH * 0.14;
    const ket = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'polygon',
    );
    ket.setAttribute(
      'points',
      `${rX + 2},${rY} ${rX + rW - 2},${rY + rH / 2} ${rX + 2},${rY + rH} ${rX + rW * 0.28},${rY + rH} ${rX + rW},${rY + rH / 2} ${rX + rW * 0.28},${rY}`,
    );
    ket.setAttribute('fill', 'url(#gr)');
    svgEl.appendChild(ket);

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const img = new Image();
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      octx.drawImage(img, lx, ly, targetW, targetH);
      const logoPts = sampleImageData(octx, W, H, 3, 40);
      URL.revokeObjectURL(url);

      const particles = particlesRef.current;
      if (logoPts.length === 0) return;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const pt = logoPts[i % logoPts.length];
        p.tx = pt.x + (Math.random() - 0.5) * 1.5;
        p.ty = pt.y + (Math.random() - 0.5) * 1.5;
        const yPct = Math.max(
          0,
          Math.min(1, (pt.y - ly) / Math.max(1, targetH)),
        );
        p.color = logoColorForY(yPct);
      }
    };
    img.src = url;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const buildTextParticles = (W: number, H: number) => {
      const fontSize = Math.max(22, Math.min(W * 0.065, 72));
      sizeRef.current = { W, H, fontSize };

      const off = document.createElement('canvas');
      off.width = W;
      off.height = H;
      const octx = off.getContext('2d');
      if (!octx) return;

      octx.fillStyle = '#ffffff';
      octx.font = `600 ${fontSize}px Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
      octx.textAlign = 'center';
      octx.textBaseline = 'middle';
      octx.shadowColor = 'rgba(120,170,255,0.7)';
      octx.shadowBlur = 18;
      octx.fillText(TEXT_STRING, W / 2, H / 2 - 10);
      octx.shadowBlur = 0;

      let pts = sampleImageData(octx, W, H, 2, 24);

      if (pts.length < 400) {
        octx.clearRect(0, 0, W, H);
        octx.fillStyle = '#ffffff';
        octx.font = `700 ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`;
        octx.textAlign = 'center';
        octx.textBaseline = 'middle';
        octx.shadowColor = 'rgba(120,170,255,0.7)';
        octx.shadowBlur = 22;
        octx.fillText(TEXT_STRING, W / 2, H / 2 - 10);
        octx.shadowBlur = 0;
        pts = sampleImageData(octx, W, H, 2, 20);
      }

      const particles: Particle[] = [];
      const totalPts = pts.length;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const pt = totalPts > 0 ? pts[i % totalPts] : null;
        const sx = pt
          ? pt.x + (Math.random() - 0.5) * 1.5
          : W / 2 + (i - PARTICLE_COUNT / 2) * 0.4;
        const sy = pt ? pt.y + (Math.random() - 0.5) * 1.5 : H / 2;
        const randomStartX = sx + (Math.random() - 0.5) * W * 0.95;
        const randomStartY = sy + (Math.random() - 0.5) * H * 0.95;
        const r = 155 + Math.floor(Math.random() * 55);
        const g = 190 + Math.floor(Math.random() * 55);
        const b = 225 + Math.floor(Math.random() * 30);
        const col =
          pt && pt.color !== 'rgba(255,255,255,1)'
            ? pt.color
            : `rgba(${r},${g},${b},1)`;

        particles.push({
          x: randomStartX,
          y: randomStartY,
          tx: sx,
          ty: sy,
          ox: randomStartX,
          oy: randomStartY,
          vx: 0,
          vy: 0,
          size: 1.1 + Math.random() * 1.6,
          color: col,
          alpha: 0,
          life: Math.random(),
        });
      }
      particlesRef.current = particles;
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = container.clientWidth;
      const H = container.clientHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildTextParticles(W, H);
    };

    resize();
    window.addEventListener('resize', resize);

    let fontsReady = false;
    const onFontsReady = () => {
      if (fontsReady) return;
      fontsReady = true;
      const W = sizeRef.current.W;
      const H = sizeRef.current.H;
      if (W === 0 || H === 0) return;

      const off = document.createElement('canvas');
      off.width = W;
      off.height = H;
      const octx = off.getContext('2d');
      if (!octx) return;

      const fontSize = sizeRef.current.fontSize;
      octx.fillStyle = '#ffffff';
      octx.font = `600 ${fontSize}px Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
      octx.textAlign = 'center';
      octx.textBaseline = 'middle';
      octx.shadowColor = 'rgba(120,170,255,0.7)';
      octx.shadowBlur = 18;
      octx.fillText(TEXT_STRING, W / 2, H / 2 - 10);
      octx.shadowBlur = 0;

      const pts = sampleImageData(octx, W, H, 2, 24);
      if (pts.length < 500) return;

      const particles = particlesRef.current;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const pt = pts[i % pts.length];
        const jitter = (1 - Math.random()) * 1.2;
        p.tx = pt.x + (Math.random() - 0.5) * jitter;
        p.ty = pt.y + (Math.random() - 0.5) * jitter;
        const r = 155 + Math.floor(Math.random() * 55);
        const g = 190 + Math.floor(Math.random() * 55);
        const b = 225 + Math.floor(Math.random() * 30);
        p.color =
          pt.color !== 'rgba(255,255,255,1)'
            ? pt.color
            : `rgba(${r},${g},${b},1)`;
        if (
          phase === 'text_particles' &&
          phaseTimingRef.current['text_particles']
        ) {
          const elapsed =
            performance.now() - phaseTimingRef.current['text_particles'];
          if (elapsed > 500) {
            p.ox = p.x;
            p.oy = p.y;
            phaseTimingRef.current['text_particles'] =
              performance.now() - 200;
          }
        }
      }
    };

    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(onFontsReady).catch(() => onFontsReady());
      const to = setTimeout(onFontsReady, 900);
      const cleanupFonts = () => clearTimeout(to);
      window.addEventListener('beforeunload', cleanupFonts);
    } else {
      onFontsReady();
    }

    const ctx = canvas.getContext('2d')!;

    const draw = () => {
      const { W, H } = sizeRef.current;
      const now = performance.now();
      const particles = particlesRef.current;
      const phases = phaseTimingRef.current;

      const tpStart = phases['text_particles'];
      let showT: number;
      if (phase === 'init') showT = 0;
      else if (tpStart)
        showT = easeOutExpo(
          Math.min(1, Math.max(0, now - tpStart) / 700),
        );
      else showT = 0;

      let breakT = 0;
      if (phases['text_break']) {
        breakT = easeInCubic(
          Math.min(1, Math.max(0, now - phases['text_break']) / 900),
        );
      }

      let formT = 0;
      if (phases['particles_to_logo']) {
        formT = Math.min(
          1,
          Math.max(0, now - phases['particles_to_logo']) / 1800,
        );
        formT = easeOutCubic(formT);
      }

      let glowT = 0;
      if (phases['logo_done']) {
        glowT = Math.min(1, Math.max(0, now - phases['logo_done']) / 500);
      }

      ctx.clearRect(0, 0, W, H);
      if (phase === 'text_break' || phase === 'particles_to_logo') {
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.fillRect(0, 0, W, H);
      } else if (
        phase === 'logo_done' ||
        phase === 'qanta_in' ||
        phase === 'tagline' ||
        phase === 'interaction'
      ) {
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(0, 0, W, H);
      }

      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (phase === 'init') {
          p.alpha = 0;
        } else if (phase === 'text_particles') {
          const t = showT;
          const jitterAmt = (1 - t) * 14;
          p.x =
            lerp(p.ox, p.tx, easeOutQuad(t)) +
            (Math.random() - 0.5) * jitterAmt;
          p.y =
            lerp(p.oy, p.ty, easeOutQuad(t)) +
            (Math.random() - 0.5) * jitterAmt;
          const flick = 0.82 + Math.sin(now / 130 + p.life * 20) * 0.16;
          const targetAlpha = flick * t;
          p.alpha = lerp(p.alpha, targetAlpha, 0.32);
          p.size = 1.15 + Math.random() * 0.05 + t * 0.85;
        } else if (phase === 'text_break') {
          const t = breakT;
          p.vy +=
            -0.03 + Math.sin(now / 170 + p.life * 13) * 0.02;
          p.vx +=
            Math.sin(now / 150 + p.life * 19) *
            0.025 *
            (p.life < 0.5 ? 1 : -1);
          p.vx *= 1 - t * 0.013;
          p.vy *= 1 - t * 0.007;
          p.x += p.vx * (1 + t * 1.8);
          p.y += p.vy * (1 + t * 1.8);
          p.alpha = lerp(p.alpha, Math.max(0.6, 0.95 - t * 0.3), 0.14);
          p.size = 1.15 + Math.random() * 0.05 + (1 - t * 0.6) * 0.75;
        } else {
          const t = Math.max(formT, phase !== 'particles_to_logo' ? 1 : 0);
          const dx = p.tx - p.x;
          const dy = p.ty - p.y;
          const pull = 0.032 + t * 0.095;
          p.vx = lerp(p.vx, dx * pull, 0.11 + t * 0.06);
          p.vy = lerp(p.vy, dy * pull, 0.11 + t * 0.06);
          p.vx *= 0.88;
          p.vy *= 0.88;
          p.x += p.vx;
          p.y += p.vy;
          const pulse =
            0.72 +
            Math.sin(now / 380 + p.life * Math.PI * 2) * 0.23 +
            glowT * 0.22;
          p.alpha = lerp(p.alpha, pulse, 0.14);
          p.size = 1.2 + t * 0.6 + Math.random() * 0.02;
        }

        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.85 + glowT * 0.25), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isTaglineVisible = ['tagline', 'interaction'].includes(phase);
  const isButtonVisible = phase === 'interaction';

  const logoContainerStyle: React.CSSProperties = {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: `translate(-50%, -50%) ${
      logoRendered ? 'scale(1)' : 'scale(0.96)'
    }`,
    opacity: logoRendered ? 1 : 0,
    transition: 'opacity 0.9s ease, transform 1s cubic-bezier(0.16,1,0.3,1)',
    pointerEvents: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: 28,
    willChange: 'transform, opacity',
  };

  const logoSize = 240;

  const qantaStyle: React.CSSProperties = {
    opacity: showQanta ? 1 : 0,
    transform: showQanta
      ? 'translateX(0) scale(1)'
      : 'translateX(-22px) scale(1.1)',
    filter: showQanta ? 'blur(0px)' : 'blur(12px)',
    transition:
      'opacity 1.2s cubic-bezier(0.16,1,0.3,1), transform 1.2s cubic-bezier(0.16,1,0.3,1), filter 1.2s ease',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  };

  const taglineWrapperStyle: React.CSSProperties = {
    position: 'absolute',
    left: '50%',
    bottom: '15%',
    transform: `translateX(-50%) ${
      isTaglineVisible ? 'translateY(0)' : 'translateY(16px)'
    }`,
    opacity: isTaglineVisible ? 1 : 0,
    transition: 'opacity 1.1s ease, transform 1.1s ease',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 20,
    maxWidth: 560,
    padding: '0 24px',
    textAlign: 'center',
  };

  const buttonStyle: React.CSSProperties = {
    position: 'absolute',
    left: '50%',
    bottom: '6%',
    transform: `translateX(-50%) ${
      isButtonVisible ? 'translateY(0)' : 'translateY(14px)'
    }`,
    opacity: isButtonVisible ? 1 : 0,
    pointerEvents: isButtonVisible ? ('auto' as const) : ('none' as const),
    padding: '14px 40px',
    background: 'rgba(255, 255, 255, 0.025)',
    border: '1px solid rgba(160, 130, 255, 0.35)',
    borderRadius: '3px',
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    letterSpacing: '0.28em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    transition:
      'opacity 1.2s ease, transform 1.2s ease, background 0.3s, border-color 0.3s, box-shadow 0.3s',
    backdropFilter: 'blur(6px)',
    outline: 'none',
    fontFamily: "'Inter', sans-serif",
    fontWeight: 500,
    boxShadow: isButtonVisible
      ? '0 0 40px -10px rgba(139,107,255,0.45), 0 0 80px -30px rgba(34,211,238,0.35)'
      : 'none',
  };

  return (
    <div
      ref={containerRef}
      style={{
        minHeight: '100vh',
        height: '100vh',
        width: '100vw',
        background: '#000',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
      />

      <div style={logoContainerStyle}>
        <Logo size={logoSize} />
        <div style={qantaStyle}>
          <div
            style={{
              fontSize: 68,
              fontWeight: 200,
              letterSpacing: '0.28em',
              color: 'rgba(255,255,255,0.97)',
              textShadow:
                '0 0 14px rgba(139,107,255,0.55), 0 0 40px rgba(34,211,238,0.35)',
              fontFamily: "'Inter', sans-serif",
              lineHeight: 1,
              paddingLeft: '0.28em',
            }}
          >
            QVANTA
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              fontWeight: 300,
              letterSpacing: '0.5em',
              color: 'rgba(160,180,255,0.5)',
              paddingLeft: '0.5em',
              textTransform: 'uppercase',
            }}
          >
            Quantum Platform
          </div>
        </div>
      </div>

      <div style={taglineWrapperStyle}>
        <div
          style={{
            fontSize: 13,
            letterSpacing: '0.32em',
            color: 'rgba(180,200,255,0.45)',
            textTransform: 'uppercase',
          }}
        >
          Think in states · Build with qubits
        </div>
        <div
          style={{
            fontSize: 14,
            lineHeight: 1.7,
            color: 'rgba(210,220,255,0.58)',
            fontWeight: 300,
            letterSpacing: '0.01em',
          }}
        >
          An interactive quantum computing workspace. Design circuits, explore
          Bloch spheres, and learn quantum mechanics — one qubit at a time.
        </div>
      </div>

      <button
        style={buttonStyle}
        onClick={onStart}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(160,130,255,0.12)';
          e.currentTarget.style.borderColor = 'rgba(180,150,255,0.6)';
          e.currentTarget.style.boxShadow =
            '0 0 50px -6px rgba(139,107,255,0.65), 0 0 100px -20px rgba(34,211,238,0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.025)';
          e.currentTarget.style.borderColor = 'rgba(160, 130, 255, 0.35)';
          e.currentTarget.style.boxShadow =
            '0 0 40px -10px rgba(139,107,255,0.45), 0 0 80px -30px rgba(34,211,238,0.35)';
        }}
      >
        Get Started
      </button>
    </div>
  );
}
