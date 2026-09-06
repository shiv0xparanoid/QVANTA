import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge
} from '@qvanta/ui';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth';
import type { User, LessonModule, SubscriptionTier } from '@qvanta/types';

const FREE_TIER_CAP = 50;

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const authUser = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [user, setLocalUser] = React.useState<User | null>(authUser);
  const [modules, setModules] = React.useState<LessonModule[]>([]);
  const [tiers, setTiers] = React.useState<SubscriptionTier[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [toast, setToast] = React.useState<{ kind: 'info' | 'error' | 'success'; msg: string } | null>(null);
  const [checkoutLoading, setCheckoutLoading] = React.useState(false);

  const showToast = (kind: 'info' | 'error' | 'success', msg: string) => {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 4500);
  };

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [me, mods, trs] = await Promise.all([
          apiClient.get<User>('/users/me'),
          apiClient.get<LessonModule[]>('/lessons'),
          apiClient.get<SubscriptionTier[]>('/billing/tiers').catch(() => ({ data: [] as SubscriptionTier[] }))
        ]);
        if (cancelled) return;
        setLocalUser(me.data);
        setUser(me.data);
        setModules(mods.data);
        setTiers(Array.isArray(trs) ? trs : trs.data ?? []);
      } catch (err: any) {
        if (!cancelled) {
          const code = err?.response?.data?.error?.code;
          if (code === 'usage_limit_exceeded') {
            showToast('error', 'You have reached your monthly simulation limit. Upgrade to Pro for unlimited simulations.');
          } else {
            showToast('error', err?.response?.data?.error?.message ?? 'Failed to load dashboard');
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [setUser]);

  const handleNewCircuit = () => navigate('/circuit/new');

  const handleUpgradePro = async () => {
    setCheckoutLoading(true);
    try {
      const res = await apiClient.post<{ checkoutUrl: string }>('/billing/checkout', { tier: 'pro' });
      if (res.data?.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
      }
    } catch (err: any) {
      showToast('error', err?.response?.data?.error?.message ?? 'Failed to start checkout');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const usageUsed = user?.usageSims ?? 0;
  const usageMax = user?.tier === 'pro' || user?.tier === 'institution' ? 999999 : FREE_TIER_CAP;
  const usagePct = Math.min(100, Math.round((usageUsed / Math.max(1, usageMax)) * 100));
  const atCap = usageUsed >= FREE_TIER_CAP && user?.tier === 'free';

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-bg-700 border-t-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${
          toast.kind === 'error' ? 'border-red-900/60 bg-red-950/40 text-red-300' :
          toast.kind === 'success' ? 'border-emerald-900/60 bg-emerald-950/40 text-emerald-300' :
          'border-bg-700 bg-bg-800/60 text-text-200'
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-100">Dashboard</h1>
          <p className="mt-1 text-sm text-text-400">
            Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}. Pick up where you left off.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary" className="capitalize">Tier: {user?.tier ?? 'free'}</Badge>
          <Button onClick={handleNewCircuit}>
            <span className="mr-1.5">+</span> New Circuit
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Simulation Usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-text-400">
                {user?.tier === 'free' ? 'Free tier simulations this month' : 'Simulations this month'}
              </span>
              <span className="font-mono text-text-200">
                {usageUsed.toLocaleString()}
                <span className="text-text-500"> / {user?.tier === 'free' ? FREE_TIER_CAP.toLocaleString() : '∞'}</span>
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-bg-800">
              <div
                className={`h-full rounded-full transition-all ${atCap ? 'bg-red-500' : 'bg-primary-500'}`}
                style={{ width: `${user?.tier === 'free' ? usagePct : Math.min(100, usagePct * 0.1)}%` }}
              />
            </div>
            {atCap && (
              <div className="rounded-lg border border-red-900/50 bg-red-950/40 p-3 text-sm text-red-300">
                You've reached your 50 free simulations for the month. Upgrade to Pro for unlimited.
              </div>
            )}
            {user?.tier === 'free' && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-text-500">
                  {tiers.find(t => t.tier === 'pro')?.description ?? 'Unlock unlimited simulations, full lesson library, and more.'}
                </span>
                <Button variant="primary" onClick={handleUpgradePro} loading={checkoutLoading}>
                  Upgrade to Pro
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Start</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" onClick={handleNewCircuit}>
              Build a new quantum circuit
            </Button>
            <Button variant="secondary" className="w-full justify-start" onClick={() => navigate('/tutor')}>
              Chat with AI Tutor
            </Button>
            <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/billing')}>
              Manage subscription
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Learning Modules</CardTitle>
        </CardHeader>
        <CardContent>
          {modules.length === 0 ? (
            <div className="rounded-lg border border-dashed border-bg-700 p-8 text-center text-sm text-text-400">
              No lessons yet. Modules will appear here as the course library is populated.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {modules.map((m) => (
                <div
                  key={m.id}
                  className="group flex flex-col justify-between rounded-lg border border-bg-700 bg-bg-900/40 p-4 transition hover:border-primary-600/60 hover:bg-bg-800/60"
                >
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-mono text-text-500">#{String(m.order).padStart(2, '0')}</span>
                      <Badge variant={m.progress === 'completed' ? 'success' : m.progress === 'started' ? 'primary' : 'secondary'}>
                        {m.progress ?? 'not_started'}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-text-100 group-hover:text-primary-300">{m.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-text-400">{m.description}</p>
                  </div>
                  <Button variant="ghost" className="mt-4 w-full justify-start px-0 text-primary-400 hover:text-primary-300">
                    Open module →
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;
