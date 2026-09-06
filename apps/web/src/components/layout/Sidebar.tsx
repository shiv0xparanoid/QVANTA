import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Button } from '@qvanta/ui';
import { useAuthStore } from '@/store/auth';
import { useUIStore } from '@/store/ui';

function cn(...inputs: (string | undefined | null | false)[]): string {
  return twMerge(clsx(inputs));
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const IconDashboard: React.FC<{ className?: string }> = ({ className }) => (
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
    <rect x="3" y="3" width="7" height="9" />
    <rect x="14" y="3" width="7" height="5" />
    <rect x="14" y="12" width="7" height="9" />
    <rect x="3" y="16" width="7" height="5" />
  </svg>
);

const IconCircuit: React.FC<{ className?: string }> = ({ className }) => (
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
    <circle cx="6" cy="6" r="2" />
    <circle cx="18" cy="18" r="2" />
    <path d="M8 6h4a4 4 0 0 1 4 4v0a2 2 0 0 0 2 2h2" />
    <path d="M18 16v-2a4 4 0 0 0-4-4h0a2 2 0 0 1-2-2V8" />
  </svg>
);

const IconTutor: React.FC<{ className?: string }> = ({ className }) => (
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
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <path d="M8 10h.01" />
    <path d="M12 10h.01" />
    <path d="M16 10h.01" />
  </svg>
);

const IconBilling: React.FC<{ className?: string }> = ({ className }) => (
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
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
  </svg>
);

const IconAdmin: React.FC<{ className?: string }> = ({ className }) => (
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
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const navItems: NavItem[] = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: <IconDashboard className="h-5 w-5" />
  },
  {
    to: '/circuit/new',
    label: 'Circuit Builder',
    icon: <IconCircuit className="h-5 w-5" />
  },
  {
    to: '/tutor',
    label: 'AI Tutor',
    icon: <IconTutor className="h-5 w-5" />
  },
  {
    to: '/billing',
    label: 'Billing',
    icon: <IconBilling className="h-5 w-5" />
  },
  {
    to: '/admin',
    label: 'Admin',
    icon: <IconAdmin className="h-5 w-5" />,
    adminOnly: true
  }
];

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ className, onNavigate }) => {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);

  const isAdmin = user?.role === 'admin' || user?.role === 'org_admin';

  const visibleItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <nav
      className={cn(
        'flex h-full w-64 flex-col border-r border-bg-800 bg-bg-900',
        className
      )}
      aria-label="Primary"
    >
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-bg-800 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-md">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
            <path d="M2 12h20" />
          </svg>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-base font-bold text-text-50 tracking-tight">
            QVANTA
          </span>
          <span className="text-[11px] font-medium uppercase tracking-wider text-text-500">
            Quantum Platform
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="flex flex-col gap-1">
          {visibleItems.map((item) => {
            const isActive =
              item.to === '/circuit/new'
                ? location.pathname.startsWith('/circuit')
                : location.pathname === item.to;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => {
                  if (onNavigate) onNavigate();
                  setSidebarOpen(false);
                }}
                className={({ isActive: navActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-950',
                    (isActive || navActive)
                      ? 'bg-primary-600/15 text-primary-300'
                      : 'text-text-300 hover:bg-bg-800 hover:text-text-100'
                  )
                }
              >
                <span
                  className={cn(
                    'shrink-0',
                    isActive ? 'text-primary-400' : 'text-text-500 group-hover:text-text-200'
                  )}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
                {item.adminOnly && (
                  <span className="ml-auto rounded bg-bg-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-400">
                    Admin
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>

      <div className="shrink-0 border-t border-bg-800 p-4">
        <div className="flex items-center gap-3 rounded-lg bg-bg-800/50 p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-accent-500 text-sm font-semibold text-white">
            {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-text-100">
              {user?.email ?? 'User'}
            </div>
            <div className="truncate text-xs text-text-500">
              {user?.tier === 'pro'
                ? 'Pro Plan'
                : user?.tier === 'institution'
                ? 'Institution'
                : 'Free Plan'}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;
