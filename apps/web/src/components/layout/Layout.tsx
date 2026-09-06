import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Button } from '@qvanta/ui';
import Sidebar from './Sidebar';
import { useAuthStore } from '@/store/auth';
import { useUIStore } from '@/store/ui';

const IconMenu: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const IconClose: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconLogout: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const IconCube: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const TopBar: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const lite2DMode = useUIStore((s) => s.lite2DMode);
  const toggleLite2D = useUIStore((s) => s.toggleLite2D);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-bg-800 bg-bg-950/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-bg-950/60 sm:px-6">
      <Button
        variant="ghost"
        size="sm"
        className="lg:hidden"
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
        aria-expanded={sidebarOpen}
      >
        {sidebarOpen ? (
          <IconClose className="h-5 w-5" />
        ) : (
          <IconMenu className="h-5 w-5" />
        )}
      </Button>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="text-sm font-semibold text-text-100 sm:hidden">
          QVANTA
        </span>
        <div className="hidden items-center gap-2 sm:flex">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          <span className="text-xs text-text-500">Systems operational</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant={lite2DMode ? 'secondary' : 'ghost'}
          size="sm"
          onClick={toggleLite2D}
          aria-pressed={lite2DMode}
          className="hidden gap-1.5 sm:inline-flex"
        >
          <IconCube className="h-4 w-4" />
          Lite 2D Fallback
        </Button>

        <div className="hidden items-center gap-2 rounded-full bg-bg-900 px-3 py-1.5 sm:flex">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-accent-500 text-[11px] font-semibold text-white">
            {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
          </div>
          <span className="max-w-[140px] truncate text-xs font-medium text-text-200">
            {user?.email ?? 'User'}
          </span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          aria-label="Logout"
        >
          <IconLogout className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
};

const MobileSidebar: React.FC = () => {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);

  if (!sidebarOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />
      <div
        className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] transform transition-transform duration-300 ease-out lg:hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <Sidebar />
      </div>
    </>
  );
};

const Layout: React.FC = () => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-950 text-text-100">
      <aside className="hidden shrink-0 lg:block">
        <Sidebar />
      </aside>

      <MobileSidebar />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
