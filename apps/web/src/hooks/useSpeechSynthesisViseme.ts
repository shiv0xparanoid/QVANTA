import React from 'react';

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export interface SpeechVisemeState {
  currentViseme: number;
  isSpeaking: boolean;
  speak: (text: string, voicePresetIndex?: number) => Promise<void>;
  stop: () => void;
}

type VisemeKind = 'A' | 'O' | 'closed';

const classifyChar = (ch: string): VisemeKind => {
  const c = ch.toLowerCase();
  const vowelsA: string[] = ['a', 'e', 'i', 'á', 'é', 'í'];
  const vowelsO: string[] = ['o', 'u', 'ó', 'ú'];
  if (vowelsA.includes(c)) return 'A';
  if (vowelsO.includes(c)) return 'O';
  return 'closed';
};

const GLOBAL: Window | undefined = typeof window !== 'undefined' ? window : undefined;
const setInt: typeof GLOBAL extends undefined ? never : (typeof setInterval) = GLOBAL?.setInterval as any;
const clearInt: typeof GLOBAL extends undefined ? never : (typeof clearInterval) = GLOBAL?.clearInterval as any;

export const useSpeechSynthesisViseme = (): SpeechVisemeState => {
  const [currentViseme, setCurrentViseme] = React.useState(0);
  const [isSpeaking, setIsSpeaking] = React.useState(false);
  const utteranceRef = React.useRef<any>(null);
  const intervalIdRef = React.useRef<number | null>(null);
  const fadeIdRef = React.useRef<number | null>(null);
  const currentVisemeRef = React.useRef(0);

  React.useEffect(() => {
    currentVisemeRef.current = currentViseme;
  }, [currentViseme]);

  const clearTimers = () => {
    if (intervalIdRef.current != null) {
      clearInt(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    if (fadeIdRef.current != null) {
      clearInt(fadeIdRef.current);
      fadeIdRef.current = null;
    }
  };

  const stopInternals = () => {
    clearTimers();
    setIsSpeaking(false);
    let t = 0;
    const start = currentVisemeRef.current;
    fadeIdRef.current = setInt(() => {
      t += 0.06;
      const v = start * Math.max(0, 1 - t);
      const clamped = clamp(v, 0, 1);
      setCurrentViseme(clamped);
      if (t >= 1) {
        if (fadeIdRef.current != null) {
          clearInt(fadeIdRef.current);
          fadeIdRef.current = null;
        }
        setCurrentViseme(0);
      }
    }, 40) as unknown as number;
  };

  const pickVoice = (idx: number): SpeechSynthesisVoice | null => {
    if (!GLOBAL || !('speechSynthesis' in GLOBAL)) return null;
    const voices = GLOBAL.speechSynthesis.getVoices();
    if (voices.length === 0) return null;
    const preferLang = ['en-US', 'en-GB', 'en'];
    for (const lang of preferLang) {
      const pool = voices.filter((v) => v.lang?.startsWith(lang));
      if (pool.length > 0) {
        return pool[clamp(idx, 0, pool.length - 1)] ?? pool[0];
      }
    }
    return voices[0] ?? null;
  };

  const speak = async (text: string, voicePresetIndex: number = 0): Promise<void> => {
    clearTimers();
    const chars = text.split('');
    const hasNative = GLOBAL && 'speechSynthesis' in GLOBAL;

    if (!hasNative) {
      setIsSpeaking(true);
      let i = 0;
      intervalIdRef.current = setInt(() => {
        if (i >= chars.length) {
          stopInternals();
          return;
        }
        const kind = classifyChar(chars[i]);
        const next =
          kind === 'A' ? 0.85 + Math.random() * 0.15 :
          kind === 'O' ? 0.5 + Math.random() * 0.3 :
          0.05 + Math.random() * 0.1;
        setCurrentViseme((prev) => prev + (next - prev) * 0.55);
        i++;
      }, 80) as unknown as number;
      return;
    }

    try {
      GLOBAL!.speechSynthesis.cancel();
    } catch {
      /* swallow */
    }

    const u = new (GLOBAL as any).SpeechSynthesisUtterance(text);
    const voice = pickVoice(voicePresetIndex);
    if (voice) u.voice = voice;
    u.rate = 1.0;
    u.pitch = 1.0;
    u.volume = 1;

    utteranceRef.current = u;
    setIsSpeaking(true);

    const timeline: Array<[number, VisemeKind]> = chars.map((ch, i) => [i * 80, classifyChar(ch)]);
    const startT = (typeof performance !== 'undefined') ? performance.now() : Date.now();

    intervalIdRef.current = setInt(() => {
      const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
      const elapsed = now - startT;
      let target = 0;
      for (let k = timeline.length - 1; k >= 0; k--) {
        if (elapsed >= timeline[k][0]) {
          const kind = timeline[k][1];
          target =
            kind === 'A' ? 0.9 :
            kind === 'O' ? 0.6 :
            0.05;
          break;
        }
      }
      const jitter = (Math.sin(elapsed * 0.03) * 0.5 + 0.5) * 0.1;
      const goal = clamp(target + jitter, 0, 1);
      setCurrentViseme((prev) => prev + (goal - prev) * 0.6);
    }, 50) as unknown as number;

    const boundaryHandler = (e: any) => {
      const charIdx: number = typeof e.charIndex === 'number' ? e.charIndex : 0;
      const ch = chars[charIdx] ?? ' ';
      const kind = classifyChar(ch);
      const target =
        kind === 'A' ? 0.92 : kind === 'O' ? 0.6 : 0.1;
      setCurrentViseme((prev) => prev + (target - prev) * 0.8);
    };

    if (typeof u.addEventListener === 'function') {
      u.addEventListener('boundary', boundaryHandler);
      u.addEventListener('end', stopInternals);
      u.addEventListener('error', stopInternals);
    } else {
      u.onend = stopInternals;
      u.onerror = stopInternals;
    }

    try {
      GLOBAL!.speechSynthesis.speak(u);
    } catch {
      stopInternals();
    }
  };

  const stop = () => {
    if (GLOBAL && 'speechSynthesis' in GLOBAL) {
      try { GLOBAL.speechSynthesis.cancel(); } catch { /* swallow */ }
    }
    stopInternals();
  };

  React.useEffect(() => {
    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { currentViseme, isSpeaking, speak, stop };
};
