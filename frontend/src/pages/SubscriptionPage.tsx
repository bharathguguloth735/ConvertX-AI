// DocuFlow AI — Dedicated Subscription & Billing Management Page
import React, { useState } from 'react';
import {
  Crown, Check, Zap, Bot, HardDrive, ShieldCheck, Download
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { SUBSCRIPTION_PLANS } from '@/utils/tools';
import { PaymentModal, PaymentPlan } from '@/components/payment/PaymentModal';
import { WelcomeProPrompt } from '@/components/payment/WelcomeProPrompt';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';

export const SubscriptionPage: React.FC = () => {
  const { user } = useAuthStore();
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [welcomePromptData, setWelcomePromptData] = useState<any>(null);

  // Fetch past transactions & invoices
  const { data: historyData, refetch: refetchHistory } = useQuery({
    queryKey: ['payment-history'],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get('/payments/history');
        return data;
      } catch {
        return { transactions: [] };
      }
    },
  });

  const activePlanId = (user?.plan || localStorage.getItem('docuflow_active_plan') || 'free').toLowerCase();
  const currentPlan = SUBSCRIPTION_PLANS.find((p) => p.id === activePlanId) || SUBSCRIPTION_PLANS[0];

  const handleSelectPlan = (plan: any) => {
    if (plan.id === 'free') {
      toast.success('You are already on the standard Free tier.');
      return;
    }
    setSelectedPlan(plan);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = (transactionData: any) => {
    setWelcomePromptData(transactionData);
    refetchHistory();
  };

  // Usage percentages
  const maxConversions = currentPlan.limits.conversions_per_month;
  const conversionsUsed = user?.conversions_used || 0;
  const conversionsPct = maxConversions > 0 ? Math.min(100, Math.round((conversionsUsed / maxConversions) * 100)) : 0;

  const maxAi = currentPlan.limits.ai_requests_per_month;
  const aiUsed = user?.ai_requests_used || 0;
  const aiPct = maxAi > 0 ? Math.min(100, Math.round((aiUsed / maxAi) * 100)) : 0;

  const storageMaxGb = currentPlan.limits.storage_gb;
  const storageUsedBytes = user?.storage_used_bytes || 0;
  const storageUsedGb = Number((storageUsedBytes / (1024 * 1024 * 1024)).toFixed(2));
  const storagePct = storageMaxGb > 0 ? Math.min(100, Math.round((storageUsedGb / storageMaxGb) * 100)) : 0;

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-black text-white">Subscription & Plan</h1>
            <span className={`text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
              activePlanId !== 'free'
                ? 'bg-gradient-to-r from-brand-500 to-accent-500 text-white shadow-glow'
                : 'bg-slate-800 text-slate-300'
            }`}>
              {currentPlan.name} Active
            </span>
          </div>
          <p className="text-slate-400 text-sm">
            Manage your plan limits, billing details, and download official GST tax invoices.
          </p>
        </div>

        {activePlanId === 'free' && (
          <button
            onClick={() => handleSelectPlan(SUBSCRIPTION_PLANS.find(p => p.id === 'pro'))}
            className="btn-primary flex items-center gap-2 text-sm py-2.5 px-5 shadow-glow rounded-xl whitespace-nowrap"
          >
            <Crown className="w-4 h-4 text-amber-300" />
            <span>Upgrade to Pro (₹499)</span>
          </button>
        )}
      </div>

      {/* Quota & Usage Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Conversions Card */}
        <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-brand-400" /> Monthly Conversions
            </span>
            <span className="text-xs font-bold text-white">
              {conversionsUsed} / {maxConversions === -1 ? 'Unlimited' : maxConversions}
            </span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all duration-500"
              style={{ width: `${maxConversions === -1 ? 15 : conversionsPct}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500">
            {maxConversions === -1 ? 'Unlimited high-speed processing' : `${maxConversions - conversionsUsed} remaining this month`}
          </p>
        </div>

        {/* AI Requests Card */}
        <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Bot className="w-4 h-4 text-purple-400" /> AI Document Quota
            </span>
            <span className="text-xs font-bold text-white">
              {aiUsed} / {maxAi === -1 ? 'Unlimited' : maxAi}
            </span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${maxAi === -1 ? 25 : aiPct}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500">
            {maxAi === -1 ? 'Unlimited Q&A and summary queries' : `${Math.max(0, maxAi - aiUsed)} AI queries remaining`}
          </p>
        </div>

        {/* Storage Card */}
        <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-emerald-400" /> Cloud Storage
            </span>
            <span className="text-xs font-bold text-white">
              {storageUsedGb} GB / {storageMaxGb} GB
            </span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(4, storagePct)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500">
            Encrypted storage with instant one-click downloads
          </p>
        </div>
      </div>

      {/* Available Plans Switcher Grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span>Available Plans</span>
          <span className="text-xs font-normal text-slate-400">• Real-time activation via UPI or Card</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const isCurrent = plan.id === activePlanId;
            return (
              <div
                key={plan.id}
                className={`relative glass-card rounded-2xl p-5 flex flex-col justify-between transition-all ${
                  isCurrent
                    ? 'border-brand-500 ring-2 ring-brand-500/30 bg-brand-500/5'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                {plan.id === 'pro' && !isCurrent && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-brand-500 to-purple-600 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-glow">
                    Most Popular
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-md">
                    Current Plan
                  </div>
                )}

                <div>
                  <h3 className="font-bold text-base text-white mb-1">{plan.name}</h3>
                  <div className="mb-3">
                    <span className="text-2xl font-black text-white">
                      {plan.price === 0 ? 'Free' : `₹${plan.price}`}
                    </span>
                    {plan.price > 0 && <span className="text-slate-400 text-xs ml-1">/month</span>}
                  </div>

                  <ul className="space-y-2 mb-6 text-xs">
                    {plan.features.map((f) => (
                      <li
                        key={f.label}
                        className={`flex items-start gap-1.5 ${
                          f.included ? 'text-slate-300' : 'text-slate-600 line-through'
                        }`}
                      >
                        <Check
                          className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${
                            f.included ? 'text-emerald-400' : 'text-slate-700'
                          }`}
                        />
                        <span>{f.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  {isCurrent ? (
                    <div className="text-center py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs">
                      Active Plan
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSelectPlan(plan)}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all ${
                        plan.id === 'pro'
                          ? 'btn-primary shadow-glow'
                          : 'btn-secondary'
                      }`}
                    >
                      {plan.price === 0 ? 'Standard Free' : `Upgrade to ${plan.name}`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transaction & Billing History Table */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white">Billing History & GST Invoices</h2>

        <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
          {historyData?.transactions?.length ? (
            <div className="overflow-x-auto">
              <table className="data-table text-xs">
                <thead>
                  <tr>
                    <th>Invoice / Date</th>
                    <th>Plan</th>
                    <th>Amount (INR)</th>
                    <th>Payment Method</th>
                    <th>Status</th>
                    <th>Download</th>
                  </tr>
                </thead>
                <tbody>
                  {historyData.transactions.map((tx: any) => (
                    <tr key={tx.id || tx.transaction_id}>
                      <td>
                        <p className="font-mono text-white font-semibold">{tx.invoice_number}</p>
                        <p className="text-[10px] text-slate-500">
                          {tx.created_at ? new Date(tx.created_at).toLocaleDateString() : 'Recent'}
                        </p>
                      </td>
                      <td className="capitalize font-bold text-brand-300">{tx.plan}</td>
                      <td className="font-bold text-white">₹{tx.amount}.00</td>
                      <td className="text-slate-400">{tx.payment_method}</td>
                      <td>
                        <span className="badge badge-success text-[10px]">PAID</span>
                      </td>
                      <td>
                        <button
                          onClick={() => {
                            setWelcomePromptData({
                              plan_name: `${tx.plan.toUpperCase()} Plan`,
                              plan: tx.plan,
                              amount: tx.amount,
                              transaction_id: tx.transaction_id,
                              order_id: tx.order_id,
                              bank_ref: tx.bank_ref,
                              invoice_number: tx.invoice_number,
                            });
                          }}
                          className="p-1.5 text-slate-400 hover:text-brand-400 transition-colors"
                          title="View Receipt / Invoice"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">
              <ShieldCheck className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p>No past billing records found.</p>
              <p className="text-slate-500 mt-1">When you upgrade to a paid tier, official GST tax receipts appear here.</p>
            </div>
          )}
        </div>
      </div>

      {/* Payment Gateway Modal */}
      {selectedPlan && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          plan={selectedPlan}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {/* Welcome to DocuFlow AI Prompt */}
      {welcomePromptData && (
        <WelcomeProPrompt
          isOpen={!!welcomePromptData}
          onClose={() => setWelcomePromptData(null)}
          transactionData={welcomePromptData}
        />
      )}
    </div>
  );
};

export default SubscriptionPage;
