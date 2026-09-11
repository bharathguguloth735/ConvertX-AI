import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Clock, Sparkles, X, ArrowRight, UserPlus, LogIn } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import {
  LOGIN_TIMEOUT,
  getGuestSessionState,
  extendGuestSession,
  clearGuestSession,
} from '@/config/appConfig';

export const GuestSessionModal: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [remainingMs, setRemainingMs] = useState<number>(LOGIN_TIMEOUT);

  useEffect(() => {
    if (isAuthenticated) {
      clearGuestSession();
      setIsOpen(false);
      return;
    }

    const checkTimer = () => {
      const state = getGuestSessionState();
      setRemainingMs(state.remainingMs);
      if (state.isExpired) {
        setIsOpen(true);
      }
    };

    checkTimer();
    const interval = setInterval(checkTimer, 3000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleExtend = () => {
    extendGuestSession();
    setRemainingMs(LOGIN_TIMEOUT);
    setIsOpen(false);
  };

  const localPlan = typeof window !== 'undefined' ? localStorage.getItem('docuflow_active_plan') : null;
  const isPaidPlan = localPlan && localPlan !== 'free';

  if (isAuthenticated || isPaidPlan) return null;

  const remainingMinutes = Math.max(0, Math.ceil(remainingMs / 60000));
  const totalMinutes = Math.round(LOGIN_TIMEOUT / 60000);

  return (
    <>
      {/* Discreet floating guest status badge on bottom left */}
      <div className="fixed bottom-4 left-4 z-40 hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 backdrop-blur-md border border-white/10 text-xs text-slate-400 shadow-xl">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-medium text-slate-300">Guest Access</span>
        <span className="text-slate-600">•</span>
        <span className="font-mono text-slate-200 font-semibold">
          {remainingMinutes}m remaining
        </span>
        <button
          onClick={() => setIsOpen(true)}
          className="text-brand-400 hover:text-brand-300 ml-1 font-semibold underline text-[11px]"
        >
          Details
        </button>
      </div>

      {/* Configurable Timeout Prompt Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              className="relative w-full max-w-md p-6 sm:p-8 rounded-3xl bg-slate-900 border border-brand-500/30 shadow-2xl text-center overflow-hidden"
            >
              {/* Glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-brand-500/15 blur-3xl pointer-events-none rounded-full" />

              {/* Close button */}
              <button
                onClick={handleExtend}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/5 transition-colors"
                title="Continue as Guest"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Icon */}
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center shadow-glow">
                <Clock className="w-8 h-8 text-white" />
              </div>

              {/* Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20 mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Guest Session ({totalMinutes}m Active)</span>
              </div>

              {/* Headline */}
              <h3 className="text-2xl font-black text-white mb-2">
                Save Your Files & Conversions
              </h3>

              {/* Description */}
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                You’ve been exploring DocuFlow AI in Guest Mode. Create a free account to permanently save your file history, manage files in your cloud storage, and unlock unlimited processing!
              </p>

              {/* Actions */}
              <div className="space-y-3">
                <Link
                  to="/register"
                  onClick={() => setIsOpen(false)}
                  className="w-full btn-primary flex items-center justify-center gap-2 text-sm py-3 font-semibold shadow-glow rounded-xl"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Free Account</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>

                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="w-full btn-secondary flex items-center justify-center gap-2 text-sm py-2.5 rounded-xl text-slate-300 hover:text-white"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Log In to Existing Account</span>
                </Link>

                <button
                  onClick={handleExtend}
                  className="w-full text-xs text-slate-400 hover:text-slate-200 py-1 transition-colors underline"
                >
                  Extend guest session (+{totalMinutes} min)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
