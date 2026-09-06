import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@qvanta/ui';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth';
import type { User } from '@qvanta/types';

type AdminUser = Pick<User, 'id' | 'email' | 'role' | 'tier' | 'usageMonth' | 'usageSims' | 'createdAt'>;

interface AdminStats {
  users: number;
  circuits: number;
  conversations: number;
  simulations: number;
}

const AdminPage: React.FC = () => {
  const authUser = useAuthStore((s) => s.user);
  const [stats, setStats] = React.useState<AdminStats>({ users: 0, circuits: 0, conversations: 0, simulations: 0 });
  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [s, u] = await Promise.all([
          apiClient.get<AdminStats>('/admin/stats'),
          apiClient.get<AdminUser[]>('/admin/users')
        ]);
        if (cancelled) return;
        setStats(s.data);
        setUsers(u.data);
      } catch (err: any) {
        if (!cancelled) setError(err?.response?.data?.error?.message ?? 'Failed to load admin data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const isAdmin = authUser?.role === 'admin' || authUser?.role === 'org_admin';

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-bg-700 border-t-primary-500" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-400">The admin panel is only available to users with the <code className="rounded bg-bg-800 px-1.5 py-0.5 text-xs">admin</code> or <code className="rounded bg-bg-800 px-1.5 py-0.5 text-xs">org_admin</code> role.</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader><CardTitle>Failed to load</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-red-300">{error}</p></CardContent>
      </Card>
    );
  }

  const statCards = [
    { label: 'Total Users', value: stats.users, accent: 'text-primary-400' },
    { label: 'Circuits', value: stats.circuits, accent: 'text-accent-400' },
    { label: 'Tutor Conversations', value: stats.conversations, accent: 'text-emerald-400' },
    { label: 'Simulations Run', value: stats.simulations, accent: 'text-amber-400' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-100">Admin Panel</h1>
        <p className="mt-1 text-sm text-text-400">Platform-wide usage overview and user management.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <div className="text-xs font-medium uppercase tracking-wide text-text-500">{s.label}</div>
              <div className={`mt-2 text-3xl font-bold ${s.accent}`}>{s.value.toLocaleString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {users.length === 0 ? (
            <div className="rounded-lg border border-dashed border-bg-700 p-8 text-center text-sm text-text-400">No users.</div>
          ) : (
            <table className="min-w-full divide-y divide-bg-700 text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-text-500">
                  <th className="px-3 py-3 font-medium">Email</th>
                  <th className="px-3 py-3 font-medium">Role</th>
                  <th className="px-3 py-3 font-medium">Tier</th>
                  <th className="px-3 py-3 font-medium">Sims ({users[0]?.usageMonth ?? 'month'})</th>
                  <th className="px-3 py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bg-800">
                {users.map((u) => (
                  <tr key={u.id} className="text-text-200 hover:bg-bg-800/30">
                    <td className="px-3 py-3">
                      <div className="font-mono text-text-100">{u.email}</div>
                      <div className="text-xs text-text-500">{u.id.slice(0, 8)}…</div>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant={u.role === 'admin' ? 'destructive' : u.role === 'org_admin' ? 'primary' : 'secondary'} className="capitalize">
                        {u.role.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant={u.tier === 'pro' ? 'primary' : u.tier === 'institution' ? 'success' : 'secondary'} className="capitalize">
                        {u.tier}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 font-mono">{u.usageSims.toLocaleString()}</td>
                    <td className="px-3 py-3 text-text-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPage;
