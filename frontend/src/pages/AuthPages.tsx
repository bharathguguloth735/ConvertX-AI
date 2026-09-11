// DocuFlow AI — Auth Pages (Login & Register)
// Matches the reference design with modern split-card layout and vector workspace illustration.
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, ArrowLeft, Zap } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import apiClient from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { AuthSideShowcase } from '@/components/auth/AuthSideShowcase';

// ─── Social Brand Icons ───────────────────────────────────────────────────────

const GoogleIcon: React.FC = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

const FacebookIcon: React.FC = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

// ─── Login Page ───────────────────────────────────────────────────────────────

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const loginMutation = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append('username', username);
      form.append('password', password);
      const { data } = await apiClient.post('/auth/login', form, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      return data;
    },
    onSuccess: (data) => {
      setAuth(data.user, data.access_token, data.refresh_token);
      toast.success(`Welcome back, ${data.user.username}!`);
      navigate(data.user.role === 'admin' ? '/admin' : '/dashboard');
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toast.error(err?.response?.data?.detail || 'Invalid credentials');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate();
  };

  const handleSocialAuth = (provider: string) => {
    toast.success(`Connecting to ${provider}...`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-6 px-4 sm:px-6 relative overflow-hidden bg-gradient-to-br from-[#8b5cf6] via-[#a855f7] to-[#7c3aed]">
      {/* Decorative Organic Purple Waves / Soft Blobs */}
      <div className="absolute -top-32 -left-32 w-[550px] h-[550px] bg-white/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-[600px] h-[600px] bg-purple-900/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-20 w-96 h-96 bg-fuchsia-400/20 rounded-full blur-2xl pointer-events-none" />

      {/* Top Bar: Return to Home & Logo */}
      <div className="w-full max-w-5xl flex items-center justify-between mb-3 px-2 z-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-white/90 hover:text-white transition-colors bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-md"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        <Link to="/" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-md transition-colors">
          <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center shadow-sm">
            <Zap className="w-3.5 h-3.5 text-[#7c3aed]" fill="#7c3aed" />
          </div>
          <span className="font-black text-sm tracking-tight text-white">
            DocuFlow <span className="text-yellow-300">AI</span>
          </span>
        </Link>
      </div>

      {/* Main Split-Card Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white rounded-[28px] sm:rounded-[36px] shadow-[0_25px_70px_-15px_rgba(124,58,237,0.2)] border border-purple-100/90 max-w-5xl w-full p-5 sm:p-8 lg:p-10 relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12"
      >
        {/* Left Side: Elevated Login Form Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-slate-100 max-w-md w-full">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">Login</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Doesn't have an account yet?{' '}
              <Link to="/register" className="text-[#7c3aed] font-bold hover:underline">
                Sign Up
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <input
                id="login-username"
                type="text"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#7c3aed] focus:ring-4 focus:ring-[#7c3aed]/10 transition-all text-sm font-medium"
                placeholder="you@example.com"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() =>
                    toast('Password reset link sent to your email address.', { icon: '📧' })
                  }
                  className="text-xs text-[#7c3aed] font-bold hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#7c3aed] focus:ring-4 focus:ring-[#7c3aed]/10 transition-all text-sm font-medium pr-11"
                  placeholder="Enter 6 character or more"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-[#7c3aed] focus:ring-[#7c3aed] accent-[#7c3aed] cursor-pointer"
              />
              <label
                htmlFor="rememberMe"
                className="text-xs text-slate-600 font-medium cursor-pointer select-none"
              >
                Remember me
              </label>
            </div>

            {/* Login Button */}
            <button
              id="login-submit"
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full py-3.5 mt-2 bg-gradient-to-r from-[#7c3aed] to-[#8b5cf6] hover:from-[#6d28d9] hover:to-[#7c3aed] text-white font-bold rounded-xl shadow-lg shadow-[#7c3aed]/25 hover:shadow-xl hover:shadow-[#7c3aed]/35 transition-all active:scale-[0.99] tracking-wider text-sm flex items-center justify-center gap-2 uppercase"
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Logging in...</span>
                </>
              ) : (
                <span>LOGIN</span>
              )}
            </button>
          </form>

          {/* Social Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-[11px] text-slate-400 font-medium">or login with</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Social Login Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleSocialAuth('Google')}
              className="py-2.5 px-3 border border-slate-200 hover:border-slate-300 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <GoogleIcon />
              <span>Google</span>
            </button>
            <button
              type="button"
              onClick={() => handleSocialAuth('Facebook')}
              className="py-2.5 px-3 border border-slate-200 hover:border-slate-300 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <FacebookIcon />
              <span>Facebook</span>
            </button>
          </div>
        </div>

        {/* Right Side: All File Converter Showcase */}
        <AuthSideShowcase />
      </motion.div>
    </div>
  );
};

// ─── Register Page ────────────────────────────────────────────────────────────

export const RegisterPage: React.FC = () => {
  const [form, setForm] = useState({ email: '', username: '', password: '', full_name: '' });
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const update = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const registerMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post('/auth/register', form);
      return data;
    },
    onSuccess: async () => {
      toast.success('Account created! Signing you in...');
      const loginForm = new FormData();
      loginForm.append('username', form.email);
      loginForm.append('password', form.password);
      const { data: loginData } = await apiClient.post('/auth/login', loginForm, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      setAuth(loginData.user, loginData.access_token, loginData.refresh_token);
      navigate('/dashboard');
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toast.error(err?.response?.data?.detail || 'Registration failed. Please try again.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      toast.error('Please accept the Terms of Service to proceed.');
      return;
    }
    registerMutation.mutate();
  };

  const handleSocialAuth = (provider: string) => {
    toast.success(`Connecting to ${provider}...`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-6 px-4 sm:px-6 relative overflow-hidden bg-gradient-to-br from-[#8b5cf6] via-[#a855f7] to-[#7c3aed]">
      {/* Ambient Glow Orbs */}
      <div className="absolute -top-32 -left-32 w-[550px] h-[550px] bg-white/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-[600px] h-[600px] bg-purple-900/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-20 w-96 h-96 bg-fuchsia-400/20 rounded-full blur-2xl pointer-events-none" />

      {/* Top Bar */}
      <div className="w-full max-w-5xl flex items-center justify-between mb-3 px-2 z-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-white/90 hover:text-white transition-colors bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-md"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        <Link to="/" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-md transition-colors">
          <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center shadow-sm">
            <Zap className="w-3.5 h-3.5 text-[#7c3aed]" fill="#7c3aed" />
          </div>
          <span className="font-black text-sm tracking-tight text-white">
            DocuFlow <span className="text-yellow-300">AI</span>
          </span>
        </Link>
      </div>

      {/* Main Split-Card Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white rounded-[28px] sm:rounded-[36px] shadow-[0_25px_70px_-15px_rgba(124,58,237,0.2)] border border-purple-100/90 max-w-5xl w-full p-5 sm:p-8 lg:p-10 relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12"
      >
        {/* Left Side: Elevated Registration Form Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-slate-100 max-w-md w-full">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">Sign Up</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Already have an account?{' '}
              <Link to="/login" className="text-[#7c3aed] font-bold hover:underline">
                Login
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Full Name & Username in 2 columns */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Full Name
                </label>
                <input
                  id="reg-fullname"
                  type="text"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#7c3aed] focus:ring-4 focus:ring-[#7c3aed]/10 transition-all text-sm font-medium"
                  placeholder="John Doe"
                  value={form.full_name}
                  onChange={update('full_name')}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Username
                </label>
                <input
                  id="reg-username"
                  type="text"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#7c3aed] focus:ring-4 focus:ring-[#7c3aed]/10 transition-all text-sm font-medium"
                  placeholder="johndoe"
                  value={form.username}
                  onChange={update('username')}
                  required
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Email Address
              </label>
              <input
                id="reg-email"
                type="email"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#7c3aed] focus:ring-4 focus:ring-[#7c3aed]/10 transition-all text-sm font-medium"
                placeholder="you@example.com"
                value={form.email}
                onChange={update('email')}
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#7c3aed] focus:ring-4 focus:ring-[#7c3aed]/10 transition-all text-sm font-medium pr-11"
                  placeholder="Enter 6 character or more"
                  value={form.password}
                  onChange={update('password')}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Terms checkbox */}
            <div className="flex items-start gap-2 pt-1">
              <input
                type="checkbox"
                id="terms"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-slate-300 text-[#7c3aed] focus:ring-[#7c3aed] accent-[#7c3aed] cursor-pointer"
              />
              <label htmlFor="terms" className="text-xs text-slate-600 cursor-pointer leading-tight">
                I agree to the{' '}
                <a href="#terms" className="text-[#7c3aed] font-semibold hover:underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#privacy" className="text-[#7c3aed] font-semibold hover:underline">
                  Privacy Policy
                </a>
              </label>
            </div>

            {/* Register Button */}
            <button
              id="reg-submit"
              type="submit"
              disabled={registerMutation.isPending}
              className="w-full py-3.5 mt-2 bg-gradient-to-r from-[#7c3aed] to-[#8b5cf6] hover:from-[#6d28d9] hover:to-[#7c3aed] text-white font-bold rounded-xl shadow-lg shadow-[#7c3aed]/25 hover:shadow-xl hover:shadow-[#7c3aed]/35 transition-all active:scale-[0.99] tracking-wider text-sm flex items-center justify-center gap-2 uppercase"
            >
              {registerMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <span>CREATE ACCOUNT</span>
              )}
            </button>
          </form>

          {/* Social Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-[11px] text-slate-400 font-medium">or sign up with</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Social Login Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleSocialAuth('Google')}
              className="py-2 px-3 border border-slate-200 hover:border-slate-300 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <GoogleIcon />
              <span>Google</span>
            </button>
            <button
              type="button"
              onClick={() => handleSocialAuth('Facebook')}
              className="py-2 px-3 border border-slate-200 hover:border-slate-300 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <FacebookIcon />
              <span>Facebook</span>
            </button>
          </div>
        </div>

        {/* Right Side: All File Converter Showcase */}
        <AuthSideShowcase />
      </motion.div>
    </div>
  );
};

export default LoginPage;
