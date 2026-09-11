import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, BarChart3, CreditCard, FileCog, LayoutDashboard, LogOut, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { AnalyticsData, User } from '@/types';

type Tab = 'overview' | 'users' | 'jobs' | 'payments' | 'logs' | 'system';
const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'users', label: 'Users', icon: <Users className="w-4 h-4" /> },
  { id: 'jobs', label: 'Processing Jobs', icon: <FileCog className="w-4 h-4" /> },
  { id: 'payments', label: 'Payments', icon: <CreditCard className="w-4 h-4" /> },
  { id: 'logs', label: 'Audit Logs', icon: <ShieldCheck className="w-4 h-4" /> },
  { id: 'system', label: 'System Monitor', icon: <Activity className="w-4 h-4" /> },
];
const formatBytes = (n = 0) => n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;

export default function AdminPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  const exit = () => { logout(); navigate('/'); };
  return <div className="min-h-screen flex bg-surface-950 text-slate-200">
    <aside className="w-64 shrink-0 border-r border-surface-800 bg-surface-950 p-4 hidden md:flex flex-col min-h-screen sticky top-0 h-screen">
      <Link to="/" className="font-black text-lg text-white px-3 py-4">DocuFlow <span className="gradient-text">Admin</span></Link>
      <nav className="space-y-1 mt-4">{tabs.map(item => <button key={item.id} onClick={() => setTab(item.id)} className={`sidebar-item w-full ${tab === item.id ? 'active' : ''}`}>{item.icon}{item.label}</button>)}</nav>
      <button onClick={exit} className="sidebar-item mt-auto text-red-400"><LogOut className="w-4 h-4" />Logout</button>
    </aside>
    <main className="flex-1 min-w-0 p-4 md:p-8">
      <header className="flex items-center justify-between gap-3 mb-6"><div><p className="text-xs text-brand-400 font-semibold uppercase tracking-wider">Secure workspace</p><h1 className="text-2xl font-bold text-white">{tabs.find(x => x.id === tab)?.label}</h1></div><div className="flex items-center gap-2"><span className="badge badge-info hidden sm:inline-flex">Administrator</span><button onClick={exit} className="btn-ghost md:hidden text-xs text-red-400"><LogOut className="w-4 h-4" />Logout</button></div></header>
      <div className="md:hidden flex gap-2 overflow-x-auto pb-4 -mx-4 px-4 border-b border-surface-800/60">{tabs.map(item => <button key={item.id} onClick={() => setTab(item.id)} className={`btn-ghost whitespace-nowrap text-xs ${tab === item.id ? 'text-brand-300 bg-brand-500/10' : ''}`}>{item.label}</button>)}</div>
      {tab === 'overview' && <Overview />}{tab === 'users' && <UsersView />}{tab === 'jobs' && <JobsView />}{tab === 'payments' && <PaymentsView />}{tab === 'logs' && <LogsView />}{tab === 'system' && <SystemView />}
    </main>
  </div>;
}

function Overview() {
  const { data, isLoading } = useQuery<AnalyticsData>({ queryKey: ['admin', 'analytics'], queryFn: async () => (await apiClient.get('/admin/analytics')).data });
  if (isLoading) return <Loading />;
  const cards = [['Total users', data?.users.total ?? 0], ['Active users', data?.users.active ?? 0], ['Files stored', data?.files.total ?? 0], ['Storage used', formatBytes(data?.files.total_storage_bytes)], ['Conversions', data?.jobs.completed ?? 0], ['Failed jobs', data?.jobs.failed ?? 0]];
  return <div className="space-y-6"><div className="grid grid-cols-2 xl:grid-cols-3 gap-4">{cards.map(([label, value]) => <div className="glass-card rounded-xl p-5" key={String(label)}><p className="text-xs text-slate-500">{label}</p><p className="text-2xl text-white font-bold mt-2">{value}</p></div>)}</div><section className="grid lg:grid-cols-2 gap-5"><DataCard title="Most used tools" rows={data?.top_tools.map(x => [x.tool, x.count]) ?? []} /><DataCard title="Files by category" rows={data?.files_by_category.map(x => [x.category || 'Other', x.count]) ?? []} /></section></div>;
}

function UsersView() {
  const client = useQueryClient();
  const { data, isLoading } = useQuery<{ items: User[] }>({ queryKey: ['admin', 'users'], queryFn: async () => (await apiClient.get('/admin/users')).data });
  const change = useMutation({ mutationFn: async ({ id, active, plan }: { id: string; active?: boolean; plan?: string }) => plan ? apiClient.patch(`/admin/users/${id}/plan`, null, { params: { plan } }) : apiClient.patch(`/admin/users/${id}/activate`, null, { params: { active } }), onSuccess: () => { client.invalidateQueries({ queryKey: ['admin', 'users'] }); client.invalidateQueries({ queryKey: ['admin', 'analytics'] }); toast.success('User updated'); }, onError: () => toast.error('Could not update user') });
  if (isLoading) return <Loading />;
  return <Table headers={['User', 'Plan', 'Storage', 'Status', 'Actions']}>{data?.items.map(u => <tr key={u.id}><td><p className="text-white font-medium">{u.full_name || u.username}</p><p className="text-xs text-slate-500">{u.email}</p></td><td><select aria-label="Subscription plan" value={u.plan} onChange={e => change.mutate({ id: u.id, plan: e.target.value })} className="select text-xs py-1"><option value="free">Free</option><option value="student">Student</option><option value="pro">Pro</option><option value="business">Business</option><option value="enterprise">Enterprise</option></select></td><td>{formatBytes(u.storage_used_bytes)}</td><td><span className={`badge ${u.is_active ? 'badge-success' : 'badge-error'}`}>{u.is_active ? 'Active' : 'Disabled'}</span></td><td><button disabled={change.isPending} onClick={() => change.mutate({ id: u.id, active: !u.is_active })} className="btn-ghost text-xs">{u.is_active ? 'Disable' : 'Enable'}</button></td></tr>)}</Table>;
}

function JobsView() { const { data, isLoading } = useQuery<{ items: { id: string; user_id: string; job_type: string; status: string; progress: number; created_at: string }[] }>({ queryKey: ['admin','jobs'], queryFn: async () => (await apiClient.get('/admin/jobs')).data }); if (isLoading) return <Loading />; return <Table headers={['Job', 'User', 'Tool', 'Progress', 'Status']}>{data?.items.map(j => <tr key={j.id}><td className="font-mono text-xs">{j.id.slice(0, 8)}</td><td className="font-mono text-xs">{j.user_id.slice(0, 8)}</td><td>{j.job_type}</td><td>{j.progress}%</td><td><span className="badge badge-info">{j.status}</span></td></tr>)}</Table>; }
function PaymentsView() { const { data, isLoading } = useQuery<{ items: { id: string; user_id: string; plan: string; amount: number; currency: string; status: string }[] }>({ queryKey: ['admin','payments'], queryFn: async () => (await apiClient.get('/admin/payments')).data }); if (isLoading) return <Loading />; return <Table headers={['Transaction', 'User', 'Plan', 'Amount', 'Status']}>{data?.items.map(p => <tr key={p.id}><td className="font-mono text-xs">{p.id.slice(0, 8)}</td><td className="font-mono text-xs">{p.user_id.slice(0, 8)}</td><td className="capitalize">{p.plan}</td><td>{p.currency} {p.amount}</td><td><span className="badge badge-success">{p.status}</span></td></tr>)}</Table>; }
function LogsView() { const { data, isLoading } = useQuery<{ id: string; user_id: string; action: string; details?: string; created_at: string }[]>({ queryKey: ['admin','logs'], queryFn: async () => (await apiClient.get('/admin/logs')).data }); if (isLoading) return <Loading />; return <Table headers={['Time', 'Administrator', 'Action', 'Details']}>{data?.map(l => <tr key={l.id}><td className="text-xs">{new Date(l.created_at).toLocaleString()}</td><td className="font-mono text-xs">{l.user_id?.slice(0, 8)}</td><td>{l.action}</td><td className="text-xs text-slate-400">{l.details || '—'}</td></tr>)}</Table>; }
function SystemView() { const { data, isLoading, refetch } = useQuery<{ backend: string; database: string; storage: string; queue: { pending: number; failed: number } }>({ queryKey: ['admin','system'], queryFn: async () => (await apiClient.get('/admin/system')).data }); if (isLoading) return <Loading />; return <div className="space-y-5"><div className="flex justify-end"><button onClick={() => refetch()} className="btn-ghost text-sm"><RefreshCw className="w-4 h-4" />Refresh</button></div><div className="grid sm:grid-cols-3 gap-4">{[['Backend', data?.backend], ['Database', data?.database], ['Storage', data?.storage]].map(([name, status]) => <div className="glass-card rounded-xl p-5" key={String(name)}><p className="text-slate-400">{name}</p><p className="text-emerald-400 uppercase mt-2 font-semibold">{status}</p></div>)}</div><DataCard title="Queue health" rows={[['Pending / processing', data?.queue.pending ?? 0], ['Failed jobs', data?.queue.failed ?? 0]]} /></div>; }
function DataCard({ title, rows }: { title: string; rows: (string | number)[][] }) { return <div className="glass-card rounded-xl p-5"><h2 className="font-semibold text-white mb-4 flex gap-2 items-center"><BarChart3 className="w-4 h-4 text-brand-400" />{title}</h2>{rows.length ? <div className="space-y-3">{rows.map(([a,b]) => <div className="flex justify-between text-sm" key={String(a)}><span className="text-slate-400 capitalize">{a}</span><span className="text-white font-medium">{b}</span></div>)}</div> : <p className="text-sm text-slate-500">No data yet</p>}</div>; }
function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) { return <div className="glass-card rounded-xl overflow-x-auto"><table className="data-table min-w-full"><thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>; }
function Loading() { return <div className="py-20 text-center text-slate-500"><RefreshCw className="w-7 h-7 animate-spin mx-auto mb-3" />Loading administrator data…</div>; }
