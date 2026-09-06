import React from 'react';
import { useNavigate } from 'react-router-dom';
import AuthForm from '@/components/auth/AuthForm';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (values: { email: string; password: string }) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post('/auth/register', values);
      setAuth(response.data.user, response.data.tokens);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.error?.message ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthForm
      mode="register"
      title="Create your account"
      subtitle="Start your quantum learning journey with QVANTA — build circuits, run simulations, and learn with an AI tutor."
      submitLabel="Create account"
      onSubmit={handleSubmit}
      loading={loading}
      error={error}
    />
  );
};

export default RegisterPage;
