// DocuFlow AI — User Dashboard
import React, { useState } from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, Files, History, Settings, LogOut, Zap, Menu,
  X, Star, Bell, User, ChevronRight, HardDrive, Bot,
  RefreshCw, BarChart2, Crown, Search, FileText, Image,
  Music, Video, Download, Trash2, Clock
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import apiClient from '@/api/client';
import { FileRecord } from '@/types';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { getDownloadUrlWithToken } from '@/utils/downloadHelper';

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const sidebarItems = [
  { icon: <LayoutDashboard className="w-4 h-4" />, label: 'Overview', path: '/dashboard' },
  { icon: <Files className="w-4 h-4" />, label: 'My Files', path: '/dashboard/files' },
  { icon: <History className="w-4 h-4" />, label: 'History', path: '/dashboard/history' },
  { icon: <Bot className="w-4 h-4" />, label: 'AI Tools', path: '/tools/ai' },
  { icon: <Star className="w-4 h-4" />, label: 'Favorites', path: '/dashboard/favorites' },
  { icon: <BarChart2 className="w-4 h-4" />, label: 'Usage', path: '/dashboard/usage' },
  { icon: <Crown className="w-4 h-4" />, label: 'Subscription', path: '/dashboard/subscription' },
  { icon: <Settings className="w-4 h-4" />, label: 'Settings', path: '/dashboard/settings' },
];

const DashboardSidebar: React.FC<{ mobile?: boolean; onClose?: () => void }> = ({ mobile, onClose }) => {
  const location = useLocation();
  const { user, logout } = useAuthStore(s => ({ user: s.user, logout: s.logout }));
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await apiClient.post('/auth/logout'); } catch {}
    logout();
    navigate('/');
    toast.success('Logged out successfully');
  };

  return (
    <div className={`flex flex-col h-full ${mobile ? '' : 'w-64 flex-shrink-0'}`}>
      {/* Logo */}
      <div className="flex items-center justify-between p-5 border-b border-surface-800/50">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" fill="white" />
          </div>
          <span className="font-black">DocuFlow <span className="gradient-text">AI</span></span>
        </Link>
        {mobile && (
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* User */}
      <div className="p-4 border-b border-surface-800/30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white font-bold text-sm">
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium text-sm truncate">{user?.full_name || user?.username}</p>
            <p className="text-slate-500 text-xs capitalize">{user?.plan} Plan</p>
          </div>
          <span className={`badge text-xs ${user?.plan === 'free' ? 'badge-pending' : 'badge-info'}`}>
            {user?.plan}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {sidebarItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={`sidebar-item ${isActive ? 'active' : ''}`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-surface-800/30">
        <button onClick={handleLogout} className="sidebar-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/10">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>
    </div>
  );
};

// ─── Dashboard Layout ─────────────────────────────────────────────────────────

export const DashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-surface-950/80">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex glass border-r border-surface-800/30 h-screen sticky top-0">
        <DashboardSidebar />
      </div>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            className="relative w-72 h-full glass border-r border-surface-800/30"
          >
            <DashboardSidebar mobile onClose={() => setSidebarOpen(false)} />
          </motion.div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="glass border-b border-surface-800/30 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-slate-400 hover:text-white"
              id="mobile-sidebar-btn"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="relative hidden sm:flex items-center">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search files..."
                className="input text-xs !pl-10 pr-4 py-2 w-56 focus:w-64 transition-all"
                id="dashboard-search"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative p-2 text-slate-400 hover:text-white btn-ghost" id="notifications-btn">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-brand-500 rounded-full" />
            </button>
            <Link to="/dashboard/settings" className="p-2 text-slate-400 hover:text-white btn-ghost" id="settings-btn">
              <User className="w-5 h-5" />
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

// ─── Dashboard Overview ───────────────────────────────────────────────────────

export const DashboardOverview: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data: files } = useQuery({
    queryKey: ['files', 'recent'],
    queryFn: async () => {
      const { data } = await apiClient.get('/files?per_page=5');
      return data;
    },
  });


  const storagePercent = user
    ? Math.min(100, Math.round((user.storage_used_bytes / (500 * 1024 * 1024)) * 100))
    : 0;

  const stats = [
    {
      label: 'Files Processed',
      value: files?.total ?? 0,
      icon: <Files className="w-5 h-5" />,
      color: 'text-brand-400',
      bg: 'bg-brand-500/10',
    },
    {
      label: 'Conversions',
      value: user?.conversions_used ?? 0,
      icon: <RefreshCw className="w-5 h-5" />,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'AI Requests',
      value: user?.ai_requests_used ?? 0,
      icon: <Bot className="w-5 h-5" />,
      color: 'text-accent-400',
      bg: 'bg-accent-500/10',
    },
    {
      label: 'Storage Used',
      value: `${Math.round((user?.storage_used_bytes ?? 0) / 1024 / 1024)} MB`,
      icon: <HardDrive className="w-5 h-5" />,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
  ];

  const quickTools = [
    { icon: '📄', label: 'PDF to DOCX', route: '/tools/pdf/convert?op=to_docx' },
    { icon: '🗜️', label: 'PDF Compress', route: '/tools/pdf/compress' },
    { icon: '✂️', label: 'MP3 Cutter', route: '/tools/audio/cut' },
    { icon: '🖼️', label: 'Image Crop', route: '/tools/image/crop' },
    { icon: '🎬', label: 'Video Cutter', route: '/tools/video/cut' },
    { icon: '🤖', label: 'AI Summarize', route: '/tools/ai/summarize' },
    { icon: '👁️', label: 'OCR Extract', route: '/tools/ocr' },
    { icon: '🧾', label: 'Invoice AI', route: '/tools/ai/invoice' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {user?.full_name?.split(' ')[0] || user?.username}! 👋
          </h1>
          <p className="text-slate-400 mt-1">Here's what's happening with your files.</p>
        </div>
        <Link to="/tools" className="btn-primary hidden sm:flex items-center gap-2 text-sm">
          <Zap className="w-4 h-4" /> New Conversion
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="glass-card rounded-xl p-4">
            <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color} mb-3`}>
              {stat.icon}
            </div>
            <div className="text-2xl font-bold text-white">{stat.value}</div>
            <div className="text-slate-500 text-xs mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Tools + Storage */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-brand-400" /> Quick Tools
          </h2>
          <div className="grid grid-cols-4 gap-3">
            {quickTools.map(tool => (
              <button
                key={tool.route}
                onClick={() => navigate(tool.route)}
                className="glass-card rounded-xl p-3 text-center hover:border-brand-500/40 transition-all group"
                id={`quick-${tool.label.replace(/\s+/g, '-').toLowerCase()}`}
              >
                <div className="text-2xl mb-1.5 group-hover:scale-110 transition-transform">{tool.icon}</div>
                <div className="text-slate-400 text-xs leading-tight">{tool.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-brand-400" /> Storage
          </h2>
          <div className="glass-card rounded-xl p-5">
            <div className="flex justify-between text-sm mb-3">
              <span className="text-slate-400">Used</span>
              <span className="text-white font-medium">
                {Math.round((user?.storage_used_bytes ?? 0) / 1024 / 1024)} MB / 500 MB
              </span>
            </div>
            <div className="w-full bg-surface-800 rounded-full h-2 mb-4">
              <div
                className="progress-bar h-2 rounded-full transition-all duration-500"
                style={{ width: `${storagePercent}%` }}
              />
            </div>
            <p className="text-slate-500 text-xs mb-3">{storagePercent}% of free storage used</p>
            <Link to="/dashboard/subscription" className="btn-primary w-full text-center text-sm block py-2">
              Upgrade Storage
            </Link>
          </div>

          {/* Plan info */}
          <div className="glass-card rounded-xl p-4 mt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Current Plan</span>
              <span className={`badge ${user?.plan === 'free' ? 'badge-pending' : 'badge-info'} capitalize`}>
                {user?.plan}
              </span>
            </div>
            <Link to="/dashboard/subscription" className="text-brand-400 text-xs hover:text-brand-300 flex items-center gap-1">
              View all plans <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Files */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-400" /> Recent Files
          </h2>
          <Link to="/dashboard/files" className="text-brand-400 text-sm hover:text-brand-300 flex items-center gap-1">
            View all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="glass-card rounded-xl overflow-hidden">
          {files?.items?.length ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>File</th>
                  <th className="hidden sm:table-cell">Tool</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.items.map((file: FileRecord) => (
                  <tr key={file.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <FileTypeIcon mime={file.mime_type} />
                        <span className="truncate max-w-[140px] text-xs font-medium text-white">
                          {file.filename}
                        </span>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell">
                      <span className="text-xs text-slate-500">{file.tool_type || '—'}</span>
                    </td>
                    <td>
                      <StatusBadge status={file.status} />
                    </td>
                    <td>
                      <span className="text-xs text-slate-500">
                        {formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        {file.download_url && (
                          <a
                            href={getDownloadUrlWithToken(file.download_url, file.filename)}
                            download={file.filename}
                            className="p-1.5 text-slate-500 hover:text-brand-400 transition-colors"
                            id={`download-${file.id}`}
                            title={`Download ${file.filename}`}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center text-slate-500">
              <Files className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No files yet. Start by converting a file!</p>
              <Link to="/tools" className="btn-primary inline-flex mt-4 text-sm">Browse Tools</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── My Files Page ────────────────────────────────────────────────────────────

export const MyFilesPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['files', page, category],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), per_page: '20' });
      if (category) params.append('category', category);
      const { data } = await apiClient.get(`/files?${params}`);
      return data;
    },
  });

  const deleteFile = async (id: string) => {
    if (!confirm('Delete this file?')) return;
    try {
      await apiClient.delete(`/files/${id}`);
      toast.success('File deleted');
      refetch();
    } catch {
      toast.error('Failed to delete file');
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">My Files</h1>
        <div className="flex items-center gap-2">
          <select className="select text-sm py-2 pr-8 w-36" value={category}
            onChange={e => setCategory(e.target.value)} id="file-category-filter">
            <option value="">All Categories</option>
            <option value="pdf">PDF</option>
            <option value="image">Images</option>
            <option value="audio">Audio</option>
            <option value="video">Video</option>
            <option value="ai">AI</option>
          </select>
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-slate-500">
            <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin opacity-30" />
            Loading files...
          </div>
        ) : data?.items?.length ? (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Filename</th>
                  <th className="hidden md:table-cell">Type</th>
                  <th className="hidden sm:table-cell">Size</th>
                  <th>Status</th>
                  <th className="hidden sm:table-cell">Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((file: FileRecord) => (
                  <tr key={file.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <FileTypeIcon mime={file.mime_type} />
                        <div>
                          <p className="text-white text-xs font-medium truncate max-w-[150px]">{file.filename}</p>
                          {file.is_output && <span className="text-brand-400 text-xs">Output</span>}
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell">
                      <span className="text-xs text-slate-500 font-mono">{file.mime_type.split('/')[1]?.toUpperCase()}</span>
                    </td>
                    <td className="hidden sm:table-cell">
                      <span className="text-xs text-slate-500">{formatSize(file.size)}</span>
                    </td>
                    <td><StatusBadge status={file.status} /></td>
                    <td className="hidden sm:table-cell">
                      <span className="text-xs text-slate-500">
                        {formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        {file.download_url && (
                          <a
                            href={getDownloadUrlWithToken(file.download_url, file.filename)}
                            download={file.filename}
                            className="p-1.5 text-slate-500 hover:text-brand-400 transition-colors"
                            id={`dl-${file.id}`}
                            title={`Download ${file.filename}`}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button onClick={() => deleteFile(file.id)}
                          className="p-1.5 text-slate-500 hover:text-red-400" id={`del-${file.id}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="px-4 py-3 border-t border-surface-800/30 flex items-center justify-between text-sm text-slate-500">
              <span>{data.total} total files</span>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="btn-ghost text-xs disabled:opacity-30">← Prev</button>
                <span className="py-1 px-2 text-white">Page {page}</span>
                <button disabled={data.items.length < 20} onClick={() => setPage(p => p + 1)}
                  className="btn-ghost text-xs disabled:opacity-30">Next →</button>
              </div>
            </div>
          </>
        ) : (
          <div className="py-16 text-center text-slate-500">
            <Files className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No files found</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Helper Components ────────────────────────────────────────────────────────

const FileTypeIcon: React.FC<{ mime: string }> = ({ mime }) => {
  const icons: Record<string, { icon: JSX.Element; bg: string }> = {
    'application/pdf': { icon: <FileText className="w-3.5 h-3.5" />, bg: 'bg-red-500/20 text-red-400' },
    'image/': { icon: <Image className="w-3.5 h-3.5" />, bg: 'bg-violet-500/20 text-violet-400' },
    'audio/': { icon: <Music className="w-3.5 h-3.5" />, bg: 'bg-emerald-500/20 text-emerald-400' },
    'video/': { icon: <Video className="w-3.5 h-3.5" />, bg: 'bg-blue-500/20 text-blue-400' },
  };
  const match = Object.entries(icons).find(([k]) => mime.startsWith(k));
  const { icon, bg } = match?.[1] ?? { icon: <FileText className="w-3.5 h-3.5" />, bg: 'bg-slate-500/20 text-slate-400' };
  return <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${bg}`}>{icon}</div>;
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, string> = {
    completed: 'badge-success', failed: 'badge-error',
    processing: 'badge-warn', uploaded: 'badge-info', pending: 'badge-pending',
  };
  return <span className={`badge text-xs ${map[status] || 'badge-pending'}`}>{status}</span>;
};

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};
