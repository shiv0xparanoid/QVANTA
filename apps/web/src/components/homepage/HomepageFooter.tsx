import React from 'react';
import { Link } from 'react-router-dom';

const HomepageFooter: React.FC = () => {
  const year = new Date().getFullYear();
  return (
    <footer
      aria-label="Site"
      className="relative z-10 border-t border-white/5 bg-bg-1/60 backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-8">
        <div className="flex items-center gap-2 text-ink">
          <span className="font-mono-quantum text-base font-semibold" aria-hidden>
            <span className="text-violet">|</span>
            <span className="qvanta-gradient-text">ψ</span>
            <span className="text-violet">⟩</span>
          </span>
          <span className="font-display text-base font-semibold">QVANTA</span>
          {/* <span className="ml-3 text-xs text-ink-dim">
            © {year} · Quantum learning, interactive.
          </span> */}
        </div>

        <nav aria-label="Footer" className="flex flex-wrap items-center gap-6 text-sm">
        
          <a href="mailto:hello@qvanta.com" className="text-ink-dim transition-colors hover:text-ink">
            Contact
          </a>
        </nav>
      </div>
    </footer>
  );
};

export default HomepageFooter;
