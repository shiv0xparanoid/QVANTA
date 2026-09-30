import React from 'react';
import Editor from '@monaco-editor/react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import HomepageSceneLighting from '@/components/homepage/HomepageSceneLighting';
import { usePrefersReducedMotion, useParticleCount } from '@/hooks';

const BELL_SNIPPET = `# QVANTA — Bell Pair Circuit
# Two qubits, entangled across space.

from qiskit import QuantumCircuit, Aer, execute

qc = QuantumCircuit(2, 2)

# Prepare qubit 0 in a superposition
qc.h(0)

# Entangle: CNOT control=0, target=1
qc.cx(0, 1)

# Read both classical bits
qc.measure([0, 1], [0, 1])

sim = Aer.get_backend('qasm_simulator')
result = execute(qc, sim, shots=1024).result()
print(result.get_counts())
# { "00": ~512, "11": ~512 } — never 01, never 10.
# Measured apart, they always agree. That's entanglement.
`;

interface BlochSphereSVGProps {
  size?: number;
  reducedMotion: boolean;
}

const BlochSphereSVG: React.FC<BlochSphereSVGProps> = ({ size = 220, reducedMotion }) => {
  const [t, setT] = React.useState(0);
  const rafRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (reducedMotion) {
      setT(0.25);
      return undefined;
    }
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setT((prev) => prev + dt * 0.35);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [reducedMotion]);

  const cx = size / 2;
  const cy = size / 2;
  const r = (size / 2) * 0.78;

  const theta = Math.sin(t * 0.6) * 0.9 + 1.1;
  const phi = t * 0.9;
  const x = r * Math.sin(theta) * Math.cos(phi);
  const y = r * Math.sin(theta) * Math.sin(phi);
  const z = r * Math.cos(theta);

  const screenX = cx + x * 0.95;
  const screenY = cy - z * 0.95 + y * 0.2;

  const theta2 = Math.sin(t * 0.6 + Math.PI) * 0.9 + 1.1;
  const phi2 = t * 0.9 + Math.PI;
  const x2 = r * Math.sin(theta2) * Math.cos(phi2);
  const y2 = r * Math.sin(theta2) * Math.sin(phi2);
  const z2 = r * Math.cos(theta2);
  const screenX2 = cx + x2 * 0.95;
  const screenY2 = cy - z2 * 0.95 + y2 * 0.2;

  const gradId = `bloch-grad-${Math.round(Math.random() * 100000)}`;
  const grad2Id = `bloch-grad-2-${Math.round(Math.random() * 100000)}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="drop-shadow-[0_0_40px_rgba(139,107,255,0.25)]"
    >
      <defs>
        <radialGradient id={gradId} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#8b6bff" stopOpacity="0.18" />
          <stop offset="60%" stopColor="#34e0ff" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#06050f" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={grad2Id} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8b6bff" />
          <stop offset="100%" stopColor="#34e0ff" />
        </linearGradient>
      </defs>

      <circle cx={cx} cy={cy} r={r * 1.15} fill={`url(#${gradId})`} />

      <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.28} fill="none" stroke="#9a96bd" strokeOpacity="0.2" strokeWidth="1" />
      <ellipse cx={cx} cy={cy} rx={r * 0.28} ry={r} fill="none" stroke="#9a96bd" strokeOpacity="0.18" strokeWidth="1" transform={`rotate(20 ${cx} ${cy})`} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="url(#bloch-stroke)" strokeOpacity="0.35" strokeWidth="1.2" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#8b6bff" strokeOpacity="0.35" strokeWidth="1.2" />

      <line x1={cx - r * 1.1} y1={cy} x2={cx + r * 1.1} y2={cy} stroke="#9a96bd" strokeOpacity="0.25" strokeWidth="1" strokeDasharray="3 4" />
      <line x1={cx} y1={cy - r * 1.1} x2={cx} y2={cy + r * 1.1} stroke="#9a96bd" strokeOpacity="0.25" strokeWidth="1" strokeDasharray="3 4" />

      <line x1={cx} y1={cy} x2={screenX} y2={screenY} stroke="#8b6bff" strokeWidth="1.6" strokeOpacity="0.85" />
      <line x1={cx} y1={cy} x2={screenX2} y2={screenY2} stroke="#34e0ff" strokeWidth="1.6" strokeOpacity="0.85" />

      <circle cx={screenX} cy={screenY} r="6.5" fill="#8b6bff">
        <animate attributeName="r" values="5.5;7.5;5.5" dur="2.2s" repeatCount="indefinite" />
      </circle>
      <circle cx={screenX} cy={screenY} r="11" fill="none" stroke="#8b6bff" strokeOpacity="0.35">
        <animate attributeName="r" values="9;16;9" dur="2.2s" repeatCount="indefinite" />
        <animate attributeName="stroke-opacity" values="0.45;0;0.45" dur="2.2s" repeatCount="indefinite" />
      </circle>

      <circle cx={screenX2} cy={screenY2} r="6.5" fill="#34e0ff">
        <animate attributeName="r" values="5.5;7.5;5.5" dur="2.2s" begin="1.1s" repeatCount="indefinite" />
      </circle>
      <circle cx={screenX2} cy={screenY2} r="11" fill="none" stroke="#34e0ff" strokeOpacity="0.35">
        <animate attributeName="r" values="9;16;9" dur="2.2s" begin="1.1s" repeatCount="indefinite" />
        <animate attributeName="stroke-opacity" values="0.45;0;0.45" dur="2.2s" begin="1.1s" repeatCount="indefinite" />
      </circle>

      <text x={cx} y={cy - r - 8} textAnchor="middle" fill="#9a96bd" fontSize="10" fontFamily="'JetBrains Mono', monospace">|0⟩</text>
      <text x={cx} y={cy + r + 16} textAnchor="middle" fill="#9a96bd" fontSize="10" fontFamily="'JetBrains Mono', monospace">|1⟩</text>
      <text x={cx + r + 8} y={cy + 4} textAnchor="start" fill="#9a96bd" fontSize="10" fontFamily="'JetBrains Mono', monospace">x</text>
      <text x={cx - r - 8} y={cy + 4} textAnchor="end" fill="#9a96bd" fontSize="10" fontFamily="'JetBrains Mono', monospace">y</text>
      <text x={screenX + 10} y={screenY - 10} fill="#8b6bff" fontSize="9" fontFamily="'JetBrains Mono', monospace">q₀</text>
      <text x={screenX2 - 10} y={screenY2 - 10} textAnchor="end" fill="#34e0ff" fontSize="9" fontFamily="'JetBrains Mono', monospace">q₁</text>
    </svg>
  );
};

const ParticleOrb: React.FC = () => {
  const reduced = usePrefersReducedMotion();
  const maxCount = 1400;
  const activeCount = useParticleCount(maxCount, 380);
  const pointsRef = React.useRef<THREE.Points | null>(null);
  const tRef = React.useRef(0);

  const geom = React.useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(maxCount * 3);
    const seed = new Float32Array(maxCount * 3);
    for (let i = 0; i < maxCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const radius = 1.8 + Math.random() * 0.6;
      seed[i * 3 + 0] = u;
      seed[i * 3 + 1] = v;
      seed[i * 3 + 2] = Math.random();
      pos[i * 3 + 0] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = radius * Math.cos(phi);
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3));
    g.setDrawRange(0, activeCount);
    return g;
  }, [activeCount]);

  React.useEffect(() => {
    geom.setDrawRange(0, activeCount);
  }, [activeCount, geom]);

  useFrame(({ clock }) => {
    const pts = pointsRef.current;
    if (!pts) return;
    const time = clock.elapsedTime;
    const speed = reduced ? 0.04 : 0.35;
    const posAttr = pts.geometry.attributes.position as THREE.BufferAttribute;
    const seedAttr = pts.geometry.attributes.aSeed as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const seeds = seedAttr.array as Float32Array;
    for (let i = 0; i < activeCount; i++) {
      const u = seeds[i * 3 + 0];
      const v = seeds[i * 3 + 1];
      const w = seeds[i * 3 + 2];
      const thetaOff = time * speed * (0.4 + w * 0.8);
      const phiOff = Math.sin(time * speed * 0.6 + w * 6.28) * 0.35;
      const theta = 2 * Math.PI * u + thetaOff;
      const phi = Math.acos(2 * v - 1) + phiOff;
      const radius = 1.85 + Math.sin(time * 0.7 + w * 8) * 0.22 + w * 0.25;
      arr[i * 3 + 0] = radius * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = radius * Math.cos(phi);
    }
    posAttr.needsUpdate = true;
    pts.rotation.y = time * speed * 0.25;
    pts.rotation.x = Math.sin(time * speed * 0.18) * 0.15;
    tRef.current = time;
  });

  return (
    <points ref={pointsRef} geometry={geom}>
      <pointsMaterial
        size={0.028}
        sizeAttenuation
        transparent
        opacity={0.72}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        color="#8b6bff"
      />
    </points>
  );
};

interface ChatMessage {
  id: number;
  role: 'tutor' | 'user';
  content: string;
  isTyping?: boolean;
  highlight?: 'violet' | 'cyan' | 'math';
}

const TUTOR_REPLIES: Record<string, string> = {
  superposition:
    'Great question! Superposition means a qubit can be in a weighted mix of |0⟩ and |1⟩ simultaneously — until measurement. The H (Hadamard) gate takes |0⟩ → (|0⟩ + |1⟩)/√2. Think of it as spinning a coin: while it spins, it\'s not heads or tails — it\'s both.',
  entanglement:
    'Entanglement is the superpower of quantum computing. After qc.cx(0, 1), q₀ and q₁ share a single state |φ⁺⟩ = (|00⟩ + |11⟩)/√2. Measuring either qubit instantly tells you the result of the other — no matter how far apart they are. Einstein called it "spooky action at a distance."',
  measure:
    'Measurement collapses the wavefunction. Before qc.measure, both qubits are in a superposition of 00 and 11. When you measure q₀ and get |0⟩, the whole state "snaps" to |00⟩. If you get |1⟩, it snaps to |11⟩. That\'s why 01 and 10 never show up — they\'re not in the entangled state!',
  hadamard:
    'The H (Hadamard) gate is the "quantum coin flip." Its unitary matrix is (1/√2)·[[1,1],[1,-1]]. It maps |0⟩ ↔ |+⟩ and |1⟩ ↔ |−⟩. Put two Hadamards back-to-back: H·H = I (identity). So flipping a coin twice brings it back to the original face!',
  default:
    'That\'s a great angle. Here\'s how to think about it: every line in bell_pair.py maps to a real unitary operation on the 2-qubit state vector. The gates don\'t just "draw" — they multiply 4×4 matrices under the hood. Try changing qc.h(0) to qc.x(0) first and watch the histogram flip: instead of 00/11 you\'d get 01/10.'
};

const getReply = (question: string): string => {
  const q = question.toLowerCase();
  if (q.includes('superpos')) return TUTOR_REPLIES.superposition;
  if (q.includes('entangle') || q.includes('cx') || q.includes('cnot')) return TUTOR_REPLIES.entanglement;
  if (q.includes('measure') || q.includes('collapse') || q.includes('histogram')) return TUTOR_REPLIES.measure;
  if (q.includes('hadamard') || q.includes(' h ') || q.includes('h gate')) return TUTOR_REPLIES.hadamard;
  return TUTOR_REPLIES.default;
};

const TutorEditorScreen: React.FC = () => {
  const reduced = usePrefersReducedMotion();
  const sectionRef = React.useRef<HTMLElement | null>(null);
  const chatContainerRef = React.useRef<HTMLDivElement | null>(null);
  const [input, setInput] = React.useState('');
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      id: 1,
      role: 'tutor',
      content:
        'This line qc.h(0) drops qubit 0 into superposition. It\'s 50% |0⟩, 50% |1⟩ — a coin still spinning in the air.',
      highlight: 'violet'
    },
    {
      id: 2,
      role: 'tutor',
      content:
        'Then qc.cx(0, 1) entangles it with qubit 1. Not two separate coins anymore. One shared state.',
      highlight: 'cyan'
    },
    {
      id: 3,
      role: 'tutor',
      content:
        'When I measure q₀ and see |1⟩, q₁ — even if it\'s on the other side of the room — immediately reads |1⟩ too. No signal. Just correlation that classical physics can\'t explain.'
    },
    {
      id: 4,
      role: 'tutor',
      content: '⟨ψ| = (⟨00| + ⟨11|) / √2  →  always agree, never 01 or 10',
      highlight: 'math'
    }
  ]);

  React.useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const sendQuestion = () => {
    const text = input.trim();
    if (!text) return;
    const userMsg: ChatMessage = {
      id: Date.now(),
      role: 'user',
      content: text
    };
    const typingMsg: ChatMessage = {
      id: Date.now() + 1,
      role: 'tutor',
      content: '',
      isTyping: true
    };
    setMessages((prev) => [...prev, userMsg, typingMsg]);
    setInput('');
    const replyText = getReply(text);
    // Simulate typing delay + streaming effect
    setTimeout(() => {
      let i = 0;
      const stream = setInterval(() => {
        i += 3;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (!last.isTyping) {
            clearInterval(stream);
            return prev;
          }
          const slice = replyText.slice(0, Math.min(i, replyText.length));
          if (i >= replyText.length) {
            clearInterval(stream);
            const copy = [...prev];
            copy[copy.length - 1] = { ...last, content: replyText, isTyping: false };
            return copy;
          }
          const copy = [...prev];
          copy[copy.length - 1] = { ...last, content: slice };
          return copy;
        });
      }, 28);
    }, 650);
  };

  return (
    <section
      id="tutor-editor"
      ref={sectionRef}
      className="relative isolate min-h-[110svh] w-full overflow-hidden py-24"
      aria-labelledby="tutor-editor-title"
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <Canvas
          frameloop="always"
          dpr={[1, 1.6]}
          camera={{ position: [0, 0, 6.5], fov: 46 }}
          gl={{ antialias: true, alpha: true }}
        >
          <HomepageSceneLighting />
          <ParticleOrb />
        </Canvas>
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-bg-1/85 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-bg-1/95 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 md:px-8">
        <div className="mb-10 text-center">
          <p className="mb-3 font-mono-quantum text-xs tracking-wider text-cyan/80">
            live session · qiskit · bell |φ⁺⟩
          </p>
          <h2
            id="tutor-editor-title"
            className="font-display text-[clamp(1.6rem,2.8vw,2.4rem)] font-semibold leading-[1.1] text-ink"
          >
            Your tutor reads the circuit you build and answers in{' '}
            <span className="qvanta-gradient-text">state vectors you can see</span>.
          </h2>
        </div>

        <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-5">
          {/* Code Editor */}
          <div className="lg:col-span-5">
            <div className="group relative overflow-hidden rounded-2xl border border-white/5 bg-bg-2/70 shadow-[0_20px_60px_-20px_rgba(139,107,255,0.28)] backdrop-blur-sm">
              <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-300/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                  <span className="ml-3 font-mono-quantum text-[11px] tracking-wide text-ink-dim">
                    bell_pair.py
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-violet/30 bg-violet/10 px-2.5 py-0.5 font-mono-quantum text-[10px] text-violet">
                    python
                  </span>
                  <span className="rounded-full border border-cyan/30 bg-cyan/10 px-2.5 py-0.5 font-mono-quantum text-[10px] text-cyan">
                    qiskit
                  </span>
                </div>
              </div>
              <div className="h-[520px] w-full overflow-hidden [&_.monaco-editor]:!bg-transparent">
                <Editor
                  height="100%"
                  defaultLanguage="python"
                  value={BELL_SNIPPET}
                  theme="vs-dark"
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 12.5,
                    lineNumbers: 'on',
                    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                    renderLineHighlight: 'all',
                    scrollBeyondLastLine: false,
                    smoothScrolling: !reduced,
                    cursorBlinking: reduced ? 'solid' : 'blink',
                    automaticLayout: true,
                    padding: { top: 16, bottom: 16 },
                    guides: { indentation: false },
                    occurrencesHighlight: 'off',
                    selectionHighlight: false as any,
                    scrollbar: { vertical: 'hidden', horizontal: 'hidden' },
                    overviewRulerLanes: 0,
                    hideCursorInOverviewRuler: true,
                    colorDecorators: false,
                    renderValidationDecorations: 'off'
                  }}
                  beforeMount={(monaco) => {
                    monaco.editor.defineTheme('qvanta-bell', {
                      base: 'vs-dark',
                      inherit: true,
                      rules: [
                        { token: 'comment', foreground: '9a96bd', fontStyle: 'italic' },
                        { token: 'keyword', foreground: 'c084fc', fontStyle: 'bold' },
                        { token: 'keyword.import', foreground: '8b6bff' },
                        { token: 'string', foreground: '67e8f9' },
                        { token: 'number', foreground: 'fde68a' },
                        { token: 'type', foreground: 'c7bfff' },
                        { token: 'function', foreground: 'a78bfa' },
                        { token: 'method', foreground: '22d3ee' },
                        { token: 'delimiter', foreground: '9a96bd' },
                        { token: 'operator', foreground: '34e0ff' },
                        { token: 'variable', foreground: 'eeecff' },
                        { token: 'constant', foreground: 'fca5a5' },
                        { token: 'attribute', foreground: 'fcd34d' }
                      ],
                      colors: {
                        'editor.background': '#080714',
                        'editor.foreground': '#eeecff',
                        'editorLineNumber.foreground': '#3d3a60',
                        'editorLineNumber.activeForeground': '#8b6bff',
                        'editor.lineHighlightBackground': '#13102a',
                        'editorCursor.foreground': '#34e0ff',
                        'editor.selectionBackground': '#8b6bff40',
                        'editor.inactiveSelectionBackground': '#8b6bff1a',
                        'editorIndentGuide.background': '#1a1733',
                        'editorGutter.background': '#080714',
                        'editorBracketMatch.border': '#34e0ff55',
                        'editorBracketMatch.background': '#34e0ff10'
                      }
                    });
                  }}
                  onMount={(editor, monaco) => {
                    monaco.editor.setTheme('qvanta-bell');
                    editor.revealLineNearTop(1);
                    // Highlight key lines for attention
                    try {
                      const model = editor.getModel();
                      if (model) {
                        // qc.h(0) and qc.cx(0,1) are lines 17 & 20 (1-indexed)
                        editor.deltaDecorations(
                          [],
                          [
                            {
                              range: new monaco.Range(17, 1, 17, 999),
                              options: {
                                isWholeLine: true,
                                linesDecorationsClassName: 'qvanta-line-violet',
                                overviewRuler: { color: '#8b6bff', position: monaco.editor.OverviewRulerLane.Full }
                              }
                            },
                            {
                              range: new monaco.Range(20, 1, 20, 999),
                              options: {
                                isWholeLine: true,
                                linesDecorationsClassName: 'qvanta-line-cyan',
                                overviewRuler: { color: '#34e0ff', position: monaco.editor.OverviewRulerLane.Full }
                              }
                            }
                          ]
                        );
                      }
                    } catch {
                      /* ignore decoration errors in SSR edge cases */
                    }
                  }}
                />
                <style>{`
                  .qvanta-line-violet { background: linear-gradient(90deg, rgba(139,107,255,0.16), rgba(139,107,255,0.02) 80%); border-left: 2px solid #8b6bff; }
                  .qvanta-line-cyan   { background: linear-gradient(90deg, rgba(52,224,255,0.14), rgba(52,224,255,0.02) 80%); border-left: 2px solid #34e0ff; }
                `}</style>
              </div>
            </div>
            {/* Histogram below editor on small screens, inline on large */}
            <div className="mt-4 rounded-2xl border border-white/5 bg-bg-2/40 p-4 backdrop-blur-sm lg:hidden">
              <div className="mb-2 flex items-center justify-between">
                <div className="font-mono-quantum text-[11px] text-ink-dim">expected counts · 1024 shots</div>
                <div className="font-mono-quantum text-[10px] text-violet">qasm_simulator</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { bit: '00', col: 'from-violet to-violet/60', text: 'text-violet', w: 50, val: '~512' },
                  { bit: '11', col: 'from-cyan/70 to-cyan', text: 'text-cyan', w: 50, val: '~512' },
                  { bit: '01', col: 'bg-ink-dim/10', text: 'text-ink-dim/40 line-through', w: 0, val: '0' },
                  { bit: '10', col: 'bg-ink-dim/10', text: 'text-ink-dim/40 line-through', w: 0, val: '0' }
                ].map((r) => (
                  <div key={r.bit} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={`font-mono-quantum text-[11px] ${r.text}`}>{r.bit}</span>
                      <span className={`font-mono-quantum text-[11px] ${r.text}`}>{r.val}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-bg-800">
                      <div
                        className={`h-full rounded-full ${r.w === 0 ? r.col : `bg-gradient-to-r ${r.col}`}`}
                        style={{ width: `${r.w}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bloch sphere center */}
          <div className="flex flex-col items-center justify-center lg:col-span-3">
            <div className="relative">
              <div className="absolute -inset-8 rounded-full bg-gradient-to-br from-violet/15 via-transparent to-cyan/10 blur-2xl" />
              <BlochSphereSVG size={300} reducedMotion={reduced} />
            </div>
            <p className="mt-4 max-w-[280px] text-center font-mono-quantum text-[11px] leading-relaxed text-ink-dim">
              |φ⁺⟩ = (|00⟩ + |11⟩) / √2
              <br />
              q₀ <span className="text-violet">●</span> &nbsp; q₁ <span className="text-cyan">●</span> always agree.
            </p>
          </div>

          {/* AI Tutor chat panel */}
          <div className="flex flex-col justify-center gap-4 lg:col-span-4">
            <div className="relative flex min-h-[520px] flex-col rounded-2xl border border-white/5 bg-bg-2/60 shadow-[0_20px_60px_-20px_rgba(52,224,255,0.2)] backdrop-blur-sm">
              <div className="mb-2 flex items-center justify-between border-b border-white/5 bg-bg-1/40 px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet to-cyan shadow-[0_0_20px_rgba(139,107,255,0.4)]">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#06050f" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2a5 5 0 0 0-5 5v1a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5z" />
                      <path d="M5 12v3a7 7 0 0 0 14 0v-3" />
                      <line x1="8" y1="20" x2="16" y2="20" />
                    </svg>
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-bg-2 bg-emerald-400" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-ink">Dr. Aria — QVANTA Tutor</div>
                    <div className="flex items-center gap-2 font-mono-quantum text-[10px] text-cyan/80">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan animate-pulse" />
                      context-aware · reading bell_pair.py
                    </div>
                  </div>
                </div>
              </div>

              <div
                ref={chatContainerRef}
                className="flex-1 space-y-3 overflow-y-auto px-5 py-4 pr-3"
                style={{ maxHeight: 340 }}
              >
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={[
                      'flex w-full',
                      m.role === 'user' ? 'justify-end' : 'justify-start'
                    ].join(' ')}
                  >
                    <div
                      className={[
                        'max-w-[92%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                        m.role === 'user'
                          ? 'rounded-br-md bg-gradient-to-br from-violet/90 to-violet-70/90 text-white shadow-[0_6px_18px_-6px_rgba(139,107,255,0.5)]'
                          : [
                              'rounded-bl-md border text-ink-dim',
                              m.highlight === 'violet'
                                ? 'border-violet/20 bg-violet/6'
                                : m.highlight === 'cyan'
                                  ? 'border-cyan/20 bg-cyan/5'
                                  : m.highlight === 'math'
                                    ? 'border-ink/10 bg-bg-1/50 font-mono-quantum text-[12px] text-cyan/90'
                                    : 'border-white/5 bg-bg-1/40'
                            ].join(' ')
                      ].join(' ')}
                    >
                      {m.role === 'tutor' && m.isTyping ? (
                        <div className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan/80 [animation-delay:0ms]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan/80 [animation-delay:140ms]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan/80 [animation-delay:280ms]" />
                        </div>
                      ) : (
                        m.content
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Suggested questions */}
              <div className="flex flex-wrap gap-1.5 px-5 pb-2 text-[11px]">
                {['What is superposition?', 'Explain entanglement', 'Why H gate?', 'What does measurement do?'].map((q) => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="rounded-full border border-white/8 bg-bg-1/60 px-2.5 py-1 font-mono-quantum text-ink-dim transition hover:border-cyan/30 hover:text-cyan"
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* Input */}
              <div className="border-t border-white/5 p-3">
                <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-bg-1/70 px-3 py-2 focus-within:border-cyan/40 focus-within:shadow-[0_0_0_3px_rgba(52,224,255,0.08)] transition">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#9a96bd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') sendQuestion();
                    }}
                    placeholder="Ask Dr. Aria about this circuit…"
                    className="w-full bg-transparent text-sm text-ink placeholder:text-ink-dim/50 focus:outline-none"
                  />
                  <button
                    onClick={sendQuestion}
                    disabled={!input.trim()}
                    className="flex h-8 items-center gap-1 rounded-lg bg-gradient-to-br from-violet to-cyan px-3 text-xs font-semibold text-bg-1 shadow-[0_4px_14px_-4px_rgba(139,107,255,0.6)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                  >
                    Send
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Histogram - only on large screens */}
            <div className="hidden rounded-2xl border border-white/5 bg-bg-2/40 p-4 backdrop-blur-sm lg:block">
              <div className="mb-2 flex items-center justify-between">
                <div className="font-mono-quantum text-[11px] text-ink-dim">expected counts · 1024 shots</div>
                <div className="font-mono-quantum text-[10px] text-violet">qasm_simulator</div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="w-10 font-mono-quantum text-[11px] text-violet">00</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-violet to-violet/60" style={{ width: '50%' }} />
                  </div>
                  <span className="w-16 text-right font-mono-quantum text-[11px] text-ink-dim">~512</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-10 font-mono-quantum text-[11px] text-ink-dim/40 line-through">01</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg-800">
                    <div className="h-full rounded-full bg-ink-dim/10" style={{ width: '0%' }} />
                  </div>
                  <span className="w-16 text-right font-mono-quantum text-[11px] text-ink-dim/40">0</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-10 font-mono-quantum text-[11px] text-ink-dim/40 line-through">10</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg-800">
                    <div className="h-full rounded-full bg-ink-dim/10" style={{ width: '0%' }} />
                  </div>
                  <span className="w-16 text-right font-mono-quantum text-[11px] text-ink-dim/40">0</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-10 font-mono-quantum text-[11px] text-cyan">11</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan/70 to-cyan" style={{ width: '50%' }} />
                  </div>
                  <span className="w-16 text-right font-mono-quantum text-[11px] text-ink-dim">~512</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TutorEditorScreen;
