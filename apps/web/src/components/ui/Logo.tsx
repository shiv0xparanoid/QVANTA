import React from 'react';

interface LogoProps {
  size?: number;
}

const Logo: React.FC<LogoProps> = ({ size = 220 }) => {
  const s = size;
  const w = s;
  const h = s * 0.72;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id="gradLeft" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="50%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>

        <linearGradient id="gradCenter" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="40%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#22D3EE" />
        </linearGradient>

        <linearGradient id="gradRight" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="50%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>

        <filter id="logoGlow">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter="url(#logoGlow)">
        {/* Left: Vertical bar | */}
        <rect
          x={w * 0.06}
          y={h * 0.14}
          width={w * 0.095}
          height={h * 0.72}
          rx={w * 0.045}
          fill="url(#gradLeft)"
        />

        {/* Center: Psi ψ */}
        <svg
          x={w * 0.21}
          y={h * 0.14}
          width={w * 0.56}
          height={h * 0.72}
          viewBox="0 0 56 72"
          preserveAspectRatio="xMidYMid meet"
        >
          <rect x="2" y="0" width="10.5" height="50" rx="5.25" fill="url(#gradCenter)" />
          <rect x="22.5" y="0" width="11" height="72" rx="5.5" fill="url(#gradCenter)" />
          <rect x="43.5" y="0" width="10.5" height="50" rx="5.25" fill="url(#gradCenter)" />
          <path
            d="M 7.25 44 Q 7.25 66 28 66 Q 48.75 66 48.75 44"
            fill="none"
            stroke="url(#gradCenter)"
            strokeWidth="10.5"
            strokeLinecap="round"
          />
        </svg>

        {/* Right: Ket ⟩ */}
        <svg
          x={w * 0.8}
          y={h * 0.14}
          width={w * 0.14}
          height={h * 0.72}
          viewBox="0 0 14 72"
          preserveAspectRatio="xMidYMid meet"
        >
          <polygon
            points="2,0 12,36 2,72 4.5,72 13,36 4.5,0"
            fill="url(#gradRight)"
          />
        </svg>
      </g>
    </svg>
  );
};

export default Logo;
