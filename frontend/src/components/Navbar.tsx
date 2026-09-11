import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Zap, BarChart2, ArrowRight, X, Menu, LogOut, Crown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';

export const Navbar: React.FC = () => {
  const { isAuthenticated, logout, user } = useAuthStore();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activePlan, setActivePlan] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const checkPlan = () => {
      const stored = localStorage.getItem('docuflow_active_plan');
      setActivePlan(user?.plan || stored || null);
    };
    checkPlan();
    window.addEventListener('storage', checkPlan);
    window.addEventListener('docuflow_plan_changed', checkPlan);
    return () => {
      window.removeEventListener('storage', checkPlan);
      window.removeEventListener('docuflow_plan_changed', checkPlan);
    };
  }, [user?.plan, location.pathname]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Do not render navbar on dashboard or standalone auth pages
  if (
    location.pathname.startsWith('/dashboard') ||
    location.pathname === '/login' ||
    location.pathname === '/register'
  ) {
    return null;
  }

  const navLinks = [
    { label: 'All Tools', to: '/tools' },
    { label: 'Social Downloader', to: '/tools/social/instagram', badge: 'HD' },
    { label: 'AI Suite', to: '/tools/ai' },
    { label: 'PDF Tools', to: '/tools/pdf/merge' },
    { label: 'Pricing', to: '/pricing' },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#030712]/85 backdrop-blur-xl border-b border-white/[0.08] shadow-2xl py-3'
          : 'bg-transparent py-4 sm:py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform">
            <Zap className="w-5 h-5 text-white" fill="white" />
          </div>
          <span className="font-black text-xl tracking-tight text-white">
            DocuFlow <span className="gradient-text">AI</span>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          {navLinks.map((link) => {
            const isActive = location.pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg transition-colors ${
                  isActive
                    ? 'text-white bg-white/10 font-semibold'
                    : 'hover:text-white hover:bg-white/5'
                }`}
              >
                {link.label}
                {link.badge && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-gradient-to-r from-pink-500 to-purple-600 text-white leading-tight">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Right CTA Actions */}
        <div className="hidden md:flex items-center gap-3">
          {activePlan && activePlan !== 'free' && (
            <Link
              to={isAuthenticated ? "/dashboard/subscription" : "/pricing"}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wider bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-slate-950 uppercase shadow-lg shadow-amber-500/20 hover:brightness-110 transition-all cursor-pointer"
            >
              <Crown className="w-3.5 h-3.5 fill-current" />
              <span>{activePlan} Tier</span>
            </Link>
          )}

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Link
                to="/dashboard"
                className="btn-primary flex items-center gap-2 text-sm py-2 px-4 shadow-glow"
              >
                <BarChart2 className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>
              <button
                onClick={() => logout()}
                title="Logout"
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/login" className="btn-ghost text-sm py-2 px-3">
                Login
              </Link>
              <Link
                to="/register"
                className="btn-primary flex items-center gap-2 text-sm py-2 px-4 shadow-glow"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu trigger */}
        <button
          className="md:hidden text-slate-300 p-2 hover:bg-white/10 rounded-xl"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle Menu"
          id="mobile-menu-btn"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[#030712]/95 backdrop-blur-2xl border-b border-white/10 px-4 py-4 space-y-2"
          >
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="block py-2.5 px-3 rounded-lg text-slate-200 hover:text-white hover:bg-white/5 font-medium text-sm"
              >
                <div className="flex items-center justify-between">
                  <span>{link.label}</span>
                  {link.badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-pink-500 text-white">
                      {link.badge}
                    </span>
                  )}
                </div>
              </Link>
            ))}

            <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
              {activePlan && activePlan !== 'free' && (
                <div className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase">
                  <Crown className="w-3.5 h-3.5 fill-current" />
                  <span>Active {activePlan} Tier</span>
                </div>
              )}

              {isAuthenticated ? (
                <>
                  <Link to="/dashboard" className="btn-primary text-center py-2.5">
                    Go to Dashboard
                  </Link>
                  <button
                    onClick={() => logout()}
                    className="btn-secondary text-center py-2 text-sm"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn-secondary text-center py-2.5">
                    Login
                  </Link>
                  <Link to="/register" className="btn-primary text-center py-2.5">
                    Get Started Free
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
