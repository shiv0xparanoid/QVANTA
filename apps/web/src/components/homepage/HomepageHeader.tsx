import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { Button } from '@qvanta/ui';

const HomepageHeader: React.FC = () => {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={[
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled
          ? 'border-b border-white/5 bg-bg-1/75 backdrop-blur-md backdrop-saturate-150'
          : 'bg-transparent'
      ].join(' ')}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
        <Link to="/home" className="flex items-center gap-2 text-ink no-underline">
          <span
            className="font-mono-quantum text-lg font-semibold tracking-tight"
            aria-hidden
          >
            <span className="text-violet">|</span>
            <span className="qvanta-gradient-text">ψ</span>
            <span className="text-violet">⟩</span>
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">
            QVANTA
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {!isAuthenticated ? (
            <>
              <Button
                variant="ghost"
                size="md"
                onClick={() => navigate('/login')}
                className="!h-9"
              >
                Log in
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => navigate('/register')}
                style={{
                  background: 'linear-gradient(135deg,#8b6bff 0%,#633dff 100%)',
                  boxShadow: '0 6px 24px -8px rgba(139,107,255,0.55)'
                }}
              >
                Sign up free
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="md"
                onClick={() => navigate('/dashboard')}
                className="!h-9"
              >
                Dashboard
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  logout();
                  navigate('/home');
                }}
                className="!h-9"
              >
                Log out
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default HomepageHeader;
