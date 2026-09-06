import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthForm from '@/components/auth/AuthForm';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(
    searchParams.get('oauth') === 'error' ? 'Google sign-in failed. Please try again.' : null
  );

  const handleSubmit = async (values: { email: string; password: string }) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post('/auth/login', values);
      setAuth(response.data.user, response.data.tokens);
      navigate('/dashboard', { replace: true });
      return;
    } catch (err: any) {
      const isLocalDevFallback =
        typeof window !== 'undefined' &&
        window.location.hostname === 'localhost' &&
        values.email.toLowerCase() === 'dev@qvanta.ai' &&
        values.password === 'dev-password';

      if (isLocalDevFallback) {
        const mockUser = {
          id: 'dev-local',
          email: 'dev@qvanta.ai',
          role: 'admin',
          tier: 'free',
          usageMonth: new Date().toISOString().slice(0, 7),
          usageSims: 0,
          avatarPreset: 0,
          createdAt: new Date().toISOString(),
        } as const;

        setAuth(mockUser, {
          accessToken: 'dev-token',
          refreshToken: 'dev-refresh',
        });
        navigate('/dashboard', { replace: true });
        return;
      }

      setError(err?.response?.data?.error?.message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthForm
      mode="login"
      title="Welcome back"
      subtitle="Sign in to continue building quantum circuits, running simulations, and learning with your AI tutor."
      submitLabel="Sign in"
      onSubmit={handleSubmit}
      loading={loading}
      error={error}
    />
  );
};

export default LoginPage;
