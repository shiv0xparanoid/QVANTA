import type { Config } from "tailwindcss";

const qvantaPreset: Config = {
  content: [],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#4f46e5",
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81"
        },
        accent: {
          DEFAULT: "#a855f7",
          50: "#faf5ff",
          100: "#f3e8ff",
          200: "#e9d5ff",
          300: "#d8b4fe",
          400: "#c084fc",
          500: "#a855f7",
          600: "#9333ea",
          700: "#7e22ce",
          800: "#6b21a8",
          900: "#581c87"
        },
        violet: {
          DEFAULT: "#8b6bff",
          500: "#8b6bff",
          600: "#7754ff",
          700: "#633dff"
        },
        cyan: {
          DEFAULT: "#34e0ff",
          500: "#34e0ff",
          600: "#14caff",
          700: "#00b3e6"
        },
        ink: "#eeecff",
        "ink-dim": "#9a96bd",
        bg: {
          DEFAULT: "#06050f",
          1: "#06050f",
          2: "#0a0918",
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617"
        },
        text: {
          DEFAULT: "#eeecff",
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a"
        }
      },
      backgroundColor: {
        DEFAULT: "#06050f"
      },
      textColor: {
        DEFAULT: "#eeecff"
      },
      fontFamily: {
        display: [
          "'Space Grotesk'",
          "ui-sans-serif",
          "system-ui",
          "sans-serif"
        ],
        body: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif"
        ],
        "mono-quantum": [
          "'JetBrains Mono'",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace"
        ]
      }
    }
  }
};

export default qvantaPreset;
export { qvantaPreset };
