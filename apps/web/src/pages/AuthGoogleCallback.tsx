import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { apiClient } from '@/lib/api-client';
import type { User } from '@qvanta/types';

const AuthGoogleCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setUser = useAuthStore((s) => s.setUser);
  const [status, setStatus] = React.useState<'loading' | 'done' | 'error'>('loading');
  const [message, setMessage] = React.useState<string>('Completing sign-in with Google...');

  useEffect(() => {
    let cancelled = false;

    const finish = async () => {
      const accessToken = searchParams.get('accessToken');
      const refreshToken = searchParams.get('refreshToken');
      const userId = searchParams.get('userId');
      const error = searchParams.get('error');

      if (error) {
        if (!cancelled) {
          setStatus('error');
          setMessage(error);
          setTimeout(() => navigate('/login?oauth=error', { replace: true }), 1500);
        }
        return;
      }

      if (!accessToken) {
        if (!cancelled) {
          setStatus('error');
          setMessage('Missing access token');
          setTimeout(() => navigate('/login?oauth=error', { replace: true }), 1500);
        }
        return;
      }

      try {
        const res = await apiClient.get<User>('/users/me', {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
        });
        const user = res.data;

        if (!cancelled) {
          setAuth(user, { accessToken, refreshToken: refreshToken ?? undefined });
          setUser(user);
          setStatus('done');
          setMessage('Signed in. Redirecting to dashboard...');
          setTimeout(() => navigate('/dashboard', { replace: true }), 600);
        }
      } catch (err: any) {
        if (!cancelled) {
          setStatus('error');
          setMessage(err?.response?.data?.error?.message ?? 'Failed to load user');
          setTimeout(() => navigate('/login?oauth=error', { replace: true }), 1500);
        }
      }
    };

    void finish();

    return () => {
      cancelled = true;
    };
  }, [searchParams, navigate, setAuth, setUser]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-950 px-4 text-text-100">
      <div className="w-full max-w-md rounded-xl border border-bg-800 bg-bg-900/60 p-8 text-center backdrop-blur">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-600/20 text-primary-400">
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="2">
            <path d="M12 2a10 10 0 1 0 10 10" strokeLinecap="round" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold">QVANTA</h1>
        <p className="mt-2 text-sm text-text-400">{message}</p>
        {status === 'loading' && (
          <div className="mx-auto mt-5 h-8 w-8 animate-spin rounded-full border-2 border-bg-700 border-t-primary-500" />
        )}
        {status === 'error' && (
          <p className="mt-3 text-sm text-red-400">Redirecting to login...</p>
        )}
      </div>
    </div>
  );
};

export default AuthGoogleCallbackPage;
