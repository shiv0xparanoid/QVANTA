import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import Layout from '@/components/layout/Layout';

const LoginPage = lazy(() => import('@/pages/Login'));
const RegisterPage = lazy(() => import('@/pages/Register'));
const AuthGoogleCallbackPage = lazy(() => import('@/pages/AuthGoogleCallback'));
const DashboardPage = lazy(() => import('@/pages/Dashboard'));
const CircuitBuilderPage = lazy(() => import('@/pages/CircuitBuilderPage'));
const TutorPage = lazy(() => import('@/pages/Tutor'));
const BillingPage = lazy(() => import('@/pages/Billing'));
const AdminPage = lazy(() => import('@/pages/AdminPage'));

const LoadingFallback: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center bg-bg-950 text-text-400">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-bg-700 border-t-primary-500" />
      <span className="text-sm">Loading...</span>
    </div>
  </div>
);

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children ?? <Outlet />}</>;
};

const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/auth/google/callback" element={<AuthGoogleCallbackPage />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/circuit/:id?" element={<CircuitBuilderPage />} />
          <Route path="/tutor" element={<TutorPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
};

const App: React.FC = () => {
  return <AppRoutes />;
};

export default App;
