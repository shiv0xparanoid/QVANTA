import React from 'react';
import * as THREE from 'three';
import { usePrefersReducedMotion } from '@/hooks';
import CircuitBlochScreen from './CircuitBlochScreen';
/**
 * ButterflyScreen — interlude showcasing the butterfly effect
 * 
 * Temple Fay's transcendental butterfly curve animated with particle assembly.
 * Demonstrates: sensitivity to initial conditions, chaotic systems, mathematical beauty.
 * 
 * x(t) = sin(t) * ( e^cos(t) - 2cos(4t) - sin^5(t/12) )
 * y(t) = cos(t) * (same)
 * t in [0, 12π]
 */

const ButterflyScreen: React.FC = () => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const sectionRef = React.useRef<HTMLDivElement | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  React.useEffect(() => {
	if (!canvasRef.current || !sectionRef.current) return;

	const canvas = canvasRef.current;
	const section = sectionRef.current;
	const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
	camera.position.set(0, 0, 8);

	const sizeRenderer = () => {
	  const w = section.clientWidth;
	  const h = section.clientHeight;
	  renderer.setSize(w, h);
	  camera.aspect = w / h;
	  camera.updateProjectionMatrix();
	};
	sizeRenderer();
	window.addEventListener('resize', sizeRenderer);

	// ===== Colors =====
	const violet = new THREE.Color(0x8b6bff);
	const cyan = new THREE.Color(0x34e0ff);

	const wingGroup = new THREE.Group();
	scene.add(wingGroup);

	const smoothstep = (t: number) => {
	  t = Math.min(Math.max(t, 0), 1);
	  return t * t * (3 - 2 * t);
	};

	// ===== Temple Fay Butterfly Curve =====
	const COUNT = 3200;
	const posArray = new Float32Array(COUNT * 3);
	const scatterPos = new Float32Array(COUNT * 3);
	const targetPos = new Float32Array(COUNT * 3);
	const colorArray = new Float32Array(COUNT * 3);
	const delayArr = new Float32Array(COUNT);
	const SCALE = 0.62;

	for (let i = 0; i < COUNT; i++) {
	  const t = (i / COUNT) * Math.PI * 12;
	  const r =
		Math.exp(Math.sin(t)) -
		2 * Math.cos(4 * t) -
		Math.pow(Math.sin(t / 12), 5);
	  const bx = Math.sin(t) * r * SCALE;
	  const by = Math.cos(t) * r * SCALE;

	  // Volumetric jitter
	  const jx = (Math.random() - 0.5) * 0.22;
	  const jy = (Math.random() - 0.5) * 0.22;
	  const jz = (Math.random() - 0.5) * 0.55;

	  targetPos[i * 3] = bx + jx;
	  targetPos[i * 3 + 1] = by + jy - 0.3;
	  targetPos[i * 3 + 2] = jz;

	  // Scatter positions
	  const sr = 3.2 + Math.random() * 4.5;
	  const sphi = Math.random() * Math.PI;
	  const stheta = Math.random() * Math.PI * 2;
	  scatterPos[i * 3] = sr * Math.sin(sphi) * Math.cos(stheta);
	  scatterPos[i * 3 + 1] = sr * Math.sin(sphi) * Math.sin(stheta);
	  scatterPos[i * 3 + 2] = sr * Math.cos(sphi);

	  posArray[i * 3] = scatterPos[i * 3];
	  posArray[i * 3 + 1] = scatterPos[i * 3 + 1];
	  posArray[i * 3 + 2] = scatterPos[i * 3 + 2];

	  const c = violet
		.clone()
		.lerp(cyan, Math.abs(Math.sin(t * 0.5)));
	  colorArray[i * 3] = c.r;
	  colorArray[i * 3 + 1] = c.g;
	  colorArray[i * 3 + 2] = c.b;

	  delayArr[i] = Math.random() * 0.55;
	}

	const sharedPos = new THREE.BufferAttribute(posArray, 3);

	// ===== Main particle layer =====
	const ptsGeo = new THREE.BufferGeometry();
	ptsGeo.setAttribute('position', sharedPos);
	ptsGeo.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
	const ptsMat = new THREE.PointsMaterial({
	  size: 0.045,
	  vertexColors: true,
	  transparent: true,
	  opacity: 0.9,
	  blending: THREE.AdditiveBlending,
	  depthWrite: false,
	});
	const points = new THREE.Points(ptsGeo, ptsMat);
	wingGroup.add(points);

	// ===== Glitch layer (RGB-split effect) =====
	const GLITCH_COUNT = 260;
	const glitchIdx: number[] = [];
	for (let i = 0; i < GLITCH_COUNT; i++) {
	  glitchIdx.push(Math.floor(Math.random() * COUNT));
	}
	const glitchArr = new Float32Array(GLITCH_COUNT * 3);
	const glitchGeo = new THREE.BufferGeometry();
	glitchGeo.setAttribute(
	  'position',
	  new THREE.BufferAttribute(glitchArr, 3)
	);
	const glitchMat = new THREE.PointsMaterial({
	  size: 0.09,
	  color: 0x34e0ff,
	  transparent: true,
	  opacity: 0,
	  blending: THREE.AdditiveBlending,
	  depthWrite: false,
	});
	const glitchPoints = new THREE.Points(glitchGeo, glitchMat);
	wingGroup.add(glitchPoints);

	// ===== Floating equation glyphs =====
	const GLYPHS = [
	  '|ψ⟩',
	  'ħ',
	  '∑',
	  '∫',
	  'Δφ',
	  'e^{iθ}',
	  '⊗',
	  '√2',
	  'π',
	  '∇',
	  'U(θ)',
	  '|0⟩',
	  '|1⟩',
	  'α²+β²=1',
	];

	const makeGlyphTexture = (str: string) => {
	  const cnv = document.createElement('canvas');
	  cnv.width = 256;
	  cnv.height = 96;
	  const ctx = cnv.getContext('2d');
	  if (!ctx) return new THREE.CanvasTexture(cnv);

	  ctx.font = '600 44px "JetBrains Mono", monospace';
	  ctx.fillStyle = 'rgba(238,236,255,0.95)';
	  ctx.textAlign = 'center';
	  ctx.textBaseline = 'middle';
	  ctx.shadowColor = 'rgba(139,107,255,0.9)';
	  ctx.shadowBlur = 18;
	  ctx.fillText(str, 128, 48);
	  return new THREE.CanvasTexture(cnv);
	};

	const GLYPH_SAMPLE_COUNT = 22;
	const glyphSprites: THREE.Sprite[] = [];
	for (let g = 0; g < GLYPH_SAMPLE_COUNT; g++) {
	  const i = Math.floor((g / GLYPH_SAMPLE_COUNT) * COUNT);
	  const tex = makeGlyphTexture(GLYPHS[g % GLYPHS.length]);
	  const mat = new THREE.SpriteMaterial({
		map: tex,
		transparent: true,
		opacity: 0,
		blending: THREE.AdditiveBlending,
		depthWrite: false,
	  });
	  const spr = new THREE.Sprite(mat);
	  spr.scale.set(0.9, 0.34, 1);
	  spr.userData.particleIndex = i;
	  spr.userData.floatSeed = Math.random() * Math.PI * 2;
	  wingGroup.add(spr);
	  glyphSprites.push(spr);
	}

	// ===== Scroll Progress =====
	let rawProgress = 0;
	let smoothProgress = 0;

	const updateProgress = () => {
	  const rect = section.getBoundingClientRect();
	  const vh = window.innerHeight;
	  rawProgress = Math.min(Math.max(1 - rect.top / vh, 0), 1);
	};

	window.addEventListener('scroll', updateProgress, { passive: true });
	window.addEventListener('resize', updateProgress);
	updateProgress();

	// ===== Animation Loop =====
	const clock = new THREE.Clock();
	let animationId: number;

	const animate = () => {
	  animationId = requestAnimationFrame(animate);
	  const dt = Math.min(clock.getDelta(), 0.05);
	  const t = reducedMotion ? 0 : clock.elapsedTime;

	  smoothProgress +=
		(rawProgress - smoothProgress) * (reducedMotion ? 0.01 : 0.06);

	  // Gentle flight pattern
	  wingGroup.position.x = Math.sin(t * 0.18) * 0.5;
	  wingGroup.position.y = Math.sin(t * 0.27) * 0.22;
	  wingGroup.rotation.z = Math.sin(t * 0.15) * 0.06;
	  const wingbeat = 1 + Math.sin(t * 1.6) * 0.045 * smoothProgress;
	  wingGroup.scale.set(wingbeat, 1, 1);

	  // Update particle positions
	  for (let i = 0; i < COUNT; i++) {
		const ix = i * 3;
		const iy = i * 3 + 1;
		const iz = i * 3 + 2;

		const localT = smoothstep((smoothProgress - delayArr[i]) / 0.45);
		const wob =
		  Math.sin(t * 0.8 + i) * 0.025 * (1 - localT * 0.6);

		posArray[ix] =
		  THREE.MathUtils.lerp(scatterPos[ix], targetPos[ix], localT) + wob;
		posArray[iy] =
		  THREE.MathUtils.lerp(scatterPos[iy], targetPos[iy], localT) +
		  wob * 0.6;
		posArray[iz] =
		  THREE.MathUtils.lerp(scatterPos[iz], targetPos[iz], localT) + wob;
	  }
	  sharedPos.needsUpdate = true;
	  ptsMat.opacity = 0.5 + smoothProgress * 0.4;

	  // Glitch flicker
	  if (Math.random() < 0.6) {
		for (let g = 0; g < GLITCH_COUNT; g++) {
		  const src = glitchIdx[g];
		  glitchArr[g * 3] =
			posArray[src * 3] + (Math.random() - 0.5) * 0.35;
		  glitchArr[g * 3 + 1] =
			posArray[src * 3 + 1] + (Math.random() - 0.5) * 0.35;
		  glitchArr[g * 3 + 2] =
			posArray[src * 3 + 2] + (Math.random() - 0.5) * 0.35;
		}
		glitchGeo.attributes.position.needsUpdate = true;
	  }
	  glitchMat.opacity =
		(Math.random() < 0.12 ? Math.random() * 0.7 : glitchMat.opacity * 0.85) *
		smoothProgress;
	  glitchMat.color.setHex(Math.random() < 0.5 ? 0x34e0ff : 0x8b6bff);

	  // Equation glyphs
	  glyphSprites.forEach((spr) => {
		const i = spr.userData.particleIndex;
		const localT = smoothstep((smoothProgress - delayArr[i]) / 0.45);
		spr.material.opacity +=
		  (localT * 0.85 - spr.material.opacity) * 0.08;
		const fx = Math.sin(t * 0.5 + spr.userData.floatSeed) * 0.08;
		const fy = Math.cos(t * 0.4 + spr.userData.floatSeed) * 0.08;
		spr.position.set(
		  posArray[i * 3] + fx,
		  posArray[i * 3 + 1] + fy,
		  posArray[i * 3 + 2] + 0.15
		);
	  });

	  renderer.render(scene, camera);
	};

	animate();

	// ===== Cleanup =====
	return () => {
	  cancelAnimationFrame(animationId);
	  window.removeEventListener('scroll', updateProgress);
	  window.removeEventListener('resize', updateProgress);
	  window.removeEventListener('resize', sizeRenderer);
	  renderer.dispose();
	  ptsGeo.dispose();
	  ptsMat.dispose();
	  glitchGeo.dispose();
	  glitchMat.dispose();
	  glyphSprites.forEach((spr) => {
		spr.geometry.dispose();
		(spr.material as THREE.Material).dispose();
	  });
	};
  }, [reducedMotion]);

  return (
	<section
	  ref={sectionRef}
	  id="butterfly"
	  className="relative isolate h-screen w-full overflow-hidden"
	>
	  <canvas
		ref={canvasRef}
		className="absolute inset-0 z-10 block w-full h-full"
	  />

	  {/* Caption overlay */}
	  <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 text-center">
		<div className="font-mono-quantum text-xs tracking-wide text-cyan/85">
		  sensitivity to initial conditions
		</div>
		<h2 className="font-display text-[clamp(1.5rem,2.8vw,2.2rem)] font-medium leading-[1.3] max-w-2xl text-ink">
		  Change one gate, and the whole state changes with it.
		  <br />
		  <span className="text-ink-dim">
			Every equation you run is a wingbeat — small, precise, and impossible to undo.
		  </span>
		</h2>
	  </div>
	</section>
  );
};

export default ButterflyScreen;
