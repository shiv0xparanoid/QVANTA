import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@qvanta/ui';

interface AuthFormProps {
  mode: 'login' | 'register';
  title: string;
  subtitle: string;
  submitLabel: string;
  onSubmit: (values: { email: string; password: string }) => Promise<void>;
  loading?: boolean;
  error?: string | null;
}

const AuthForm: React.FC<AuthFormProps> = ({
  mode,
  title,
  subtitle,
  submitLabel,
  onSubmit,
  loading,
  error,
}) => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit({ email, password });
  };

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const googleIsConfigured = Boolean(googleClientId && googleClientId !== 'your-google-client-id');
  const googleUrl = '/api/auth/google';

  return (
    <div className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_40%),#020617] px-4 py-10">
      <Card className="w-full max-w-md border-bg-800/80 bg-bg-900/90 backdrop-blur">
        <CardHeader className="space-y-3">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 text-sm font-bold text-white">
            Q
          </div>
          <div>
            <CardTitle>{title}</CardTitle>
            <p className="mt-2 text-sm text-text-400">{subtitle}</p>
          </div>
        </CardHeader>

        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@qvanta.ai"
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              required
            />

            {error ? (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </div>
            ) : null}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Please wait...' : submitLabel}
            </Button>

            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => {
                if (!googleIsConfigured) {
                  return;
                }
                window.location.href = googleUrl;
              }}
              disabled={!googleIsConfigured}
            >
              {googleIsConfigured ? 'Continue with Google' : 'Google OAuth not configured'}
            </Button>
            {!googleIsConfigured && (
              <p className="text-center text-xs text-text-400">
                Set VITE_GOOGLE_CLIENT_ID to enable Google sign-in for localhost.
              </p>
            )}
          </form>

          <p className="mt-6 text-center text-sm text-text-400">
            {mode === 'login' ? 'New to QVANTA?' : 'Already have an account?'}{' '}
            <Link
              to={mode === 'login' ? '/register' : '/login'}
              className="font-medium text-primary-300 hover:text-primary-200"
            >
              {mode === 'login' ? 'Create account' : 'Sign in'}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthForm;
