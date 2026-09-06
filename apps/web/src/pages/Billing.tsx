import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Card, CardHeader, CardTitle, CardContent, Badge } from '@qvanta/ui';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth';
import type { User, SubscriptionTier } from '@qvanta/types';

const CHECKLIST_PRO = [
  'Unlimited quantum simulations / month',
  'Up to 65536 shots per simulation',
  'Full lesson library access',
  'Priority AI tutor responses',
  'Export circuits as QASM & JSON'
];

const CHECKLIST_FREE = [
  '50 simulations / month',
  'Up to 1024 shots per simulation',
  'Intro lessons (qubits, superposition, gates)',
  'AI tutor with rate-limited responses'
];

const BillingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const authUser = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [user, setLocalUser] = React.useState<User | null>(authUser);
  const [tiers, setTiers] = React.useState<SubscriptionTier[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [checkoutLoading, setCheckoutLoading] = React.useState(false);
  const [portalLoading, setPortalLoading] = React.useState(false);
  const [toast, setToast] = React.useState<{ kind: 'error' | 'success'; msg: string } | null>(null);

  const showToast = (kind: 'error' | 'success', msg: string) => {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 4500);
  };

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [me, trs] = await Promise.all([
          apiClient.get<User>('/users/me'),
          apiClient.get<SubscriptionTier[]>('/billing/tiers').catch(() => ({ data: [] as SubscriptionTier[] }))
        ]);
        if (cancelled) return;
        setLocalUser(me.data);
        setUser(me.data);
        setTiers(Array.isArray(trs) ? trs : trs.data ?? []);
        const success = searchParams.get('success');
        const canceled = searchParams.get('canceled');
        const tierParam = searchParams.get('tier');
        if (success === 'true') showToast('success', 'Thank you! Your subscription is now active.');
        else if (canceled === 'true') showToast('error', 'Checkout canceled. Your subscription was not changed.');
        else if (tierParam === 'free') showToast('success', 'Plan set to Free tier.');
      } catch (err: any) {
        if (!cancelled) showToast('error', err?.response?.data?.error?.message ?? 'Failed to load billing');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [searchParams, setUser]);

  const handleCheckout = async (tier: 'pro' | 'free') => {
    setCheckoutLoading(true);
    try {
      const res = await apiClient.post<{ checkoutUrl: string }>('/billing/checkout', { tier });
      if (res.data?.checkoutUrl) window.location.href = res.data.checkoutUrl;
    } catch (err: any) {
      showToast('error', err?.response?.data?.error?.message ?? 'Failed to start checkout');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const res = await apiClient.get<{ portalUrl: string }>('/billing/portal');
      if (res.data?.portalUrl) window.location.href = res.data.portalUrl;
    } catch (err: any) {
      showToast('error', err?.response?.data?.error?.message ?? 'Failed to open billing portal');
    } finally {
      setPortalLoading(false);
    }
  };

  const proTier = tiers.find(t => t.tier === 'pro');

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
          'border-emerald-900/60 bg-emerald-950/40 text-emerald-300'
        }`}>
          {toast.msg}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-text-100">Billing & Subscription</h1>
        <p className="mt-1 text-sm text-text-400">Manage your QVANTA plan, payment methods, and invoices.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="primary" className="capitalize">{user?.tier ?? 'free'}</Badge>
              <span className="text-sm text-text-400">
                {user?.stripeCustomerId ? 'Subscription active' : 'No active paid subscription'}
              </span>
            </div>
            <p className="mt-2 text-sm text-text-300">
              Simulations used this month: <span className="font-mono text-text-100">{user?.usageSims ?? 0}</span>
              {user?.tier === 'free' && <span className="text-text-500"> / 50</span>}
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={handlePortal}
            loading={portalLoading}
            disabled={!user?.stripeCustomerId}
          >
            Open Billing Portal
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className={`${user?.tier === 'free' ? '' : 'border-bg-700'}`}>
          <CardHeader>
            <div className="flex items-baseline justify-between">
              <CardTitle>Free</CardTitle>
              <div className="text-right">
                <div className="text-2xl font-bold text-text-100">$0<span className="text-base font-normal text-text-400">/mo</span></div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-text-400">Start learning quantum computing with core lessons and limited compute.</p>
            <ul className="space-y-2 text-sm">
              {CHECKLIST_FREE.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span className="text-text-200">{item}</span>
                </li>
              ))}
            </ul>
            <Button
              variant={user?.tier === 'free' ? 'secondary' : 'ghost'}
              className="w-full"
              disabled={user?.tier === 'free'}
              onClick={() => handleCheckout('free')}
            >
              {user?.tier === 'free' ? 'Current plan' : 'Downgrade to Free'}
            </Button>
          </CardContent>
        </Card>

        <Card className="relative border-primary-600/60 shadow-[0_0_0_1px_rgba(99,102,241,0.25)]">
          <div className="absolute -top-2.5 left-4 rounded-full bg-primary-600 px-3 py-0.5 text-xs font-semibold text-white">POPULAR</div>
          <CardHeader>
            <div className="flex items-baseline justify-between">
              <CardTitle>Pro</CardTitle>
              <div className="text-right">
                <div className="text-2xl font-bold text-text-100">$19<span className="text-base font-normal text-text-400">/mo</span></div>
                <p className="text-xs text-text-500">{proTier ? `(${proTier.simsPerMonth.toLocaleString()} sims/mo cap)` : 'Unlimited'}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-text-400">Full access for serious learners and quantum enthusiasts.</p>
            <ul className="space-y-2 text-sm">
              {CHECKLIST_PRO.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span className="text-text-200">{item}</span>
                </li>
              ))}
            </ul>
            <Button
              variant="primary"
              className="w-full"
              loading={checkoutLoading && user?.tier !== 'pro'}
              disabled={user?.tier === 'pro'}
              onClick={() => handleCheckout('pro')}
            >
              {user?.tier === 'pro' ? 'Current plan' : 'Upgrade to Pro'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BillingPage;
