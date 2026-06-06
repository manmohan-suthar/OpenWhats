import { useState, useEffect, useCallback, useRef } from "react";
import {
  Check,
  X,
  Zap,
  Crown,
  Rocket,
  Star,
  ArrowRight,
  Sparkles,
  Shield,
  BarChart3,
  FileText,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Clock,
  Calendar,
  CreditCard,
  Loader2,
} from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { api, authFetch } from "../../services/api";

// ─── Helpers ────────────────────────────────────────────────────────────────

const PLAN_ICONS = [Zap, Crown, Rocket, Star, Sparkles];
const PLAN_COLORS = [
  "from-slate-500 to-slate-600",
  "from-amber-500 to-orange-600",
  "from-purple-500 to-indigo-600",
  "from-[#008069] to-[#00a884]",
  "from-rose-500 to-pink-600",
];

function planIcon(idx) {
  return PLAN_ICONS[idx % PLAN_ICONS.length];
}
function planColor(idx) {
  return PLAN_COLORS[idx % PLAN_COLORS.length];
}

function fmt(n) {
  if (n === -1 || n === undefined || n === null) return "Unlimited";
  return Number(n).toLocaleString();
}

function daysLeft(expiresAt) {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt) - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

function statusBadge(status) {
  const map = {
    active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    trial: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    expired: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    none: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400",
  };
  return map[status] || map.none;
}

// ─── UsageBar ───────────────────────────────────────────────────────────────

function UsageBar({ label, used = 0, limit = 0, unit = "" }) {
  const unlimited = limit === -1 || limit === 0;
  const pct = unlimited ? 10 : Math.min((used / limit) * 100, 100);
  const color = pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-[#00a884]";
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-slate-500 dark:text-slate-400">{label}</span>
        <span className="font-medium text-slate-700 dark:text-slate-200">
          {used.toLocaleString()}
          {!unlimited && ` / ${limit.toLocaleString()}`} {unit}
          {unlimited && <span className="text-[#00a884] ml-1">∞</span>}
        </span>
      </div>
      <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Razorpay checkout ───────────────────────────────────────────────────────

function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

async function safeJson(res) {
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    throw new Error(`Server error (HTTP ${res.status}). API may be unreachable.`);
  }
  return res.json();
}

async function createPaymentOrder(planId, billingCycle) {
  const res = await authFetch("/payments/create-order", {
    method: "POST",
    body: JSON.stringify({ planId, billingCycle }),
  });
  return safeJson(res);
}

async function verifyPayment(payload) {
  const res = await authFetch("/payments/verify", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return safeJson(res);
}

async function initiatePayment({ plan, billingCycle, user, onSuccess, showToast, openDemoModal }) {
  showToast("info", "Creating payment order…");
  let orderData;
  try {
    orderData = await createPaymentOrder(plan._id, billingCycle);
    if (!orderData.success) throw new Error(orderData.error || "Order creation failed");
  } catch (err) {
    showToast("error", err.message || "Order creation failed");
    return;
  }

  // Free plan activated directly
  if (orderData.free) {
    showToast("success", orderData.message || "Plan activated!");
    onSuccess?.();
    return;
  }

  // Demo mode — show simulated payment modal (no real Razorpay keys)
  if (orderData.demo) {
    openDemoModal({
      demoOrderId: orderData.demoOrderId,
      plan,
      billingCycle,
      amount: orderData.amount,
      currency: orderData.currency || "INR",
    });
    return;
  }

  // Real Razorpay payment
  const loaded = await loadRazorpay();
  if (!loaded) {
    showToast("error", "Failed to load Razorpay. Check your internet connection.");
    return;
  }

  const { order, key } = orderData;
  const options = {
    key,
    amount: order.amount,
    currency: order.currency,
    name: "WhatsApp AI",
    description: `${plan.name} – ${billingCycle === "yearly" ? "Yearly" : "Monthly"}`,
    order_id: order.id,
    prefill: { email: user?.email || "", name: user?.name || "" },
    theme: { color: "#00a884" },
    handler: async (response) => {
      showToast("info", "Verifying payment…");
      try {
        const vRes = await verifyPayment({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          planId: plan._id,
          billingCycle,
        });
        if (vRes.success) {
          showToast("success", `Successfully upgraded to ${plan.name}!`);
          onSuccess?.();
        } else {
          showToast("error", vRes.error || "Payment verification failed");
        }
      } catch {
        showToast("error", "Payment verification failed");
      }
    },
    modal: { ondismiss: () => showToast("info", "Payment cancelled") },
  };

  const rp = new window.Razorpay(options);
  rp.open();
}

// ─── PlanCard ────────────────────────────────────────────────────────────────

function PlanCard({ plan, idx, isCurrent, isPaidPlan, billingCycle, canSwitch, user, onUpgrade, showToast, openDemoModal }) {
  const [loading, setLoading] = useState(false);
  const Icon = planIcon(idx);
  const price = billingCycle === "yearly" ? plan.priceYearly : plan.priceMonthly;
  const isFree = !price || price === 0;

  // A demo/free plan is a downgrade if user already has a paid plan
  const isDowngrade = isPaidPlan && (plan.isDemo || isFree);

  const handleClick = async () => {
    setLoading(true);
    try {
      await initiatePayment({ plan, billingCycle, user, onSuccess: onUpgrade, showToast, openDemoModal });
    } finally {
      setLoading(false);
    }
  };

  // Card border: current = green ring, popular = subtle ring, else default
  const cardRing = isCurrent
    ? "ring-2 ring-[#00a884] shadow-lg"
    : plan.isPopular || plan.slug === "advance"
    ? "ring-1 ring-slate-200 dark:ring-slate-700 hover:shadow-xl"
    : "hover:shadow-xl";

  return (
    <div className={`card relative overflow-hidden transition-all ${cardRing} ${isDowngrade ? "opacity-60" : ""}`}>
      {/* Current plan top badge */}
      {isCurrent && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#008069] to-[#00a884]" />
      )}

      {/* Popular badge */}
      {!isCurrent && (plan.isPopular || plan.slug === "advance") && (
        <div className="absolute top-0 right-0">
          <div className="bg-gradient-to-r from-[#00a884] to-[#007b68] text-white text-xs font-semibold px-3 py-1 rounded-bl-lg flex items-center gap-1">
            <Star size={12} fill="white" /> Popular
          </div>
        </div>
      )}

      {/* Trial badge */}
      {plan.isDemo && !isCurrent && (
        <div className="absolute top-0 left-0">
          <div className="bg-amber-500 text-white text-xs font-semibold px-3 py-1 rounded-br-lg">
            Trial
          </div>
        </div>
      )}

      <div className="p-6">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${planColor(idx)} flex items-center justify-center mb-4 shadow-lg`}>
          <Icon size={24} className="text-white" />
        </div>

        <div className="flex items-start justify-between gap-2">
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">{plan.name}</h3>
          {isCurrent && (
            <span className="flex-shrink-0 flex items-center gap-1 text-[10px] font-bold text-[#00a884] bg-[#00a884]/10 px-2 py-1 rounded-full">
              <CheckCircle2 size={10} /> Active
            </span>
          )}
        </div>

        {plan.description && (
          <p className="text-xs text-slate-500 mt-1">{plan.description}</p>
        )}

        <div className="mt-4 flex items-baseline gap-1">
          {isFree ? (
            <span className="text-3xl font-bold text-[#00a884]">Free</span>
          ) : (
            <>
              <span className="text-3xl font-bold text-slate-800 dark:text-white">
                ₹{price?.toLocaleString()}
              </span>
              <span className="text-sm text-slate-500">/{billingCycle === "yearly" ? "yr" : "mo"}</span>
            </>
          )}
        </div>

        {/* Limits */}
        <div className="mt-4 space-y-1.5">
          {[
            { label: "Sessions", val: plan.limits?.sessions },
            { label: "Campaigns", val: plan.limits?.campaigns },
            { label: "Messages/mo", val: plan.limits?.messagesMonthly },
            { label: "Storage", val: plan.limits?.storageMb, unit: "MB" },
          ].map(({ label, val, unit }) => (
            <div key={label} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <Check size={12} className="text-[#00a884] flex-shrink-0" />
              {fmt(val)} {label}{unit ? ` ${unit}` : ""}
            </div>
          ))}
          {Array.isArray(plan.features) && plan.features
            .filter((f) => typeof f === "object" ? f.enabled !== false : true)
            .slice(0, 3)
            .map((f, i) => {
              const label = typeof f === "string" ? f : (f.label || f.key || "");
              return label ? (
                <div key={f.key || f.label || i} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <Check size={12} className="text-[#00a884] flex-shrink-0" />
                  {label}
                </div>
              ) : null;
            })}
        </div>

        {/* CTA button */}
        <div className="mt-5">
          {isCurrent ? (
            // Current plan — no action
            <div className="w-full py-3 px-4 bg-[#00a884]/10 border border-[#00a884]/30 rounded-xl text-sm font-semibold text-[#00a884] flex items-center justify-center gap-2">
              <CheckCircle2 size={16} /> Your Current Plan
            </div>
          ) : isDowngrade ? (
            // Demo/free — blocked after upgrade
            <div className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-400 flex items-center justify-center gap-2 cursor-not-allowed">
              <Shield size={14} /> Not available after upgrade
            </div>
          ) : !canSwitch ? (
            // Switching disabled by admin
            <div
              className="w-full py-3 px-4 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm font-semibold text-slate-400 flex items-center justify-center gap-2 cursor-not-allowed"
              title="Plan switching is disabled by admin"
            >
              <Shield size={16} /> Contact Admin
            </div>
          ) : (
            // Upgrade CTA
            <button
              onClick={handleClick}
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-[#008069] to-[#00a884] text-white hover:opacity-90 shadow-md shadow-[#00a884]/20 disabled:opacity-60"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              {isFree ? "Activate Free" : `Upgrade to ${plan.name}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── DemoPaymentModal ────────────────────────────────────────────────────────

function DemoPaymentModal({ data, onConfirm, onCancel, loading }) {
  if (!data) return null;
  const { plan, billingCycle, amount, currency } = data;
  const price = billingCycle === "yearly" ? plan.priceYearly : plan.priceMonthly;
  const displayAmount = (amount / 100).toLocaleString("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 0,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#008069] to-[#00a884] p-5 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <CreditCard size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold">Demo Payment Gateway</h3>
              <p className="text-xs text-white/80">Test mode — no real charge</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3 flex gap-2 text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
            <span>This is a demo payment. No real money will be charged. Configure Razorpay keys in Admin → Pricing Plans → Settings to enable live payments.</span>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Plan</span>
              <span className="font-semibold text-slate-800 dark:text-white">{plan.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Billing</span>
              <span className="font-medium text-slate-700 dark:text-slate-300 capitalize">{billingCycle}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-slate-100 dark:border-slate-800 pt-3">
              <span className="text-slate-500 font-medium">Total (Demo)</span>
              <span className="text-xl font-bold text-[#00a884]">{displayAmount}</span>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 space-y-1.5">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Demo Card Details</p>
            <p className="text-xs text-slate-500 font-mono">4111 1111 1111 1111</p>
            <p className="text-xs text-slate-500">Expiry: 12/25 · CVV: 123 · OTP: 1234</p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#008069] to-[#00a884] text-white text-sm font-semibold hover:opacity-90 transition-all shadow-md shadow-[#00a884]/20 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
            {loading ? "Processing…" : "Complete Demo Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Subscription() {
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [subData, setSubData] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [demoModal, setDemoModal] = useState(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const toastTimer = useRef(null);

  const showToast = useCallback((type, msg) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, msg });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [meRes, plansRes] = await Promise.all([
        api.getMySubscription(),
        api.getAvailableSubscriptionPlans(),
      ]);
      if (!meRes.success) throw new Error(meRes.error || "Failed to load subscription");
      setSubData(meRes.data || null);
      setPlans(plansRes.data || []);
    } catch (err) {
      setError(err.message || "Failed to load subscription data");
    } finally {
      setLoading(false);
    }
  }, []);

  const openDemoModal = useCallback((data) => {
    setDemoModal(data);
  }, []);

  const handleDemoConfirm = useCallback(async () => {
    if (!demoModal) return;
    setDemoLoading(true);
    try {
      const vRes = await verifyPayment({
        razorpay_order_id: demoModal.demoOrderId,
        razorpay_payment_id: `demo_pay_${Date.now()}`,
        razorpay_signature: "demo",
        planId: demoModal.plan._id,
        billingCycle: demoModal.billingCycle,
      });
      if (vRes.success) {
        showToast("success", `Successfully upgraded to ${demoModal.plan.name}!`);
        setDemoModal(null);
        fetchData();
      } else {
        showToast("error", vRes.error || "Demo payment failed");
      }
    } catch (err) {
      showToast("error", err.message || "Demo payment failed");
    } finally {
      setDemoLoading(false);
    }
  }, [demoModal, fetchData, showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="page flex items-center justify-center min-h-64">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 size={32} className="animate-spin text-[#00a884]" />
          <span className="text-sm">Loading subscription…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page space-y-6">
        <PageHeader title="Subscription" subtitle="Manage your plan" />
        <div className="card p-8 flex flex-col items-center gap-4 text-center">
          <AlertTriangle size={40} className="text-red-400" />
          <p className="text-slate-600 dark:text-slate-400">{error}</p>
          <button onClick={fetchData} className="btn-primary flex items-center gap-2">
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </div>
    );
  }

  const { subscription, plan, usage, allowUserPlanSwitch } = subData || {};
  const currentPlanId = String(plan?.id || plan?._id || "");
  const days = daysLeft(subscription?.expiresAt);
  const isPaidPlan = plan && !plan.isDemo && (plan.priceMonthly > 0 || plan.priceYearly > 0);

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  return (
    <div className="page space-y-6">
      {/* Demo payment modal */}
      <DemoPaymentModal
        data={demoModal}
        onConfirm={handleDemoConfirm}
        onCancel={() => { setDemoModal(null); showToast("info", "Payment cancelled"); }}
        loading={demoLoading}
      />

      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium transition-all ${
            toast.type === "error"
              ? "bg-red-500 text-white"
              : toast.type === "success"
              ? "bg-emerald-500 text-white"
              : "bg-slate-700 text-white"
          }`}
        >
          {toast.type === "error" ? <X size={16} /> : toast.type === "success" ? <Check size={16} /> : <Loader2 size={16} className="animate-spin" />}
          {toast.msg}
        </div>
      )}

      <PageHeader title="Subscription" subtitle="Manage your plan and track usage">
        <button onClick={fetchData} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </PageHeader>

      {/* Current Plan Banner */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <BarChart3 size={18} className="text-[#00a884]" />
              Current Plan &amp; Usage
            </h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-sm text-slate-500">
                Plan:{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {plan?.name || "None"}
                </span>
              </span>
              {subscription?.status && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${statusBadge(subscription.status)}`}>
                  {subscription.status}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {subscription?.expiresAt && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Calendar size={12} />
                Expires{" "}
                {new Date(subscription.expiresAt).toLocaleDateString("en-IN", {
                  day: "numeric", month: "short", year: "numeric",
                })}
              </div>
            )}
            {days !== null && days <= 7 && (
              <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
                <Clock size={12} />
                {days === 0 ? "Expires today!" : `${days} day${days !== 1 ? "s" : ""} left`}
              </div>
            )}
          </div>
        </div>

        {/* Usage bars */}
        {usage && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <UsageBar
              label="WhatsApp Sessions"
              used={usage.sessions ?? 0}
              limit={plan?.limits?.sessions ?? 0}
            />
            <UsageBar
              label="Campaigns"
              used={usage.campaigns ?? 0}
              limit={plan?.limits?.campaigns ?? 0}
            />
            <UsageBar
              label="Messages (Monthly)"
              used={usage.messagesMonthly ?? 0}
              limit={plan?.limits?.messagesMonthly ?? 0}
            />
            <UsageBar
              label="Storage"
              used={Math.round((usage.storageBytes ?? 0) / (1024 * 1024))}
              limit={plan?.limits?.storageMb ?? 0}
              unit="MB"
            />
          </div>
        )}

        {!allowUserPlanSwitch && (
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
            <Shield size={14} className="flex-shrink-0 text-slate-400" />
            Plan changes are managed by your administrator. Contact them to upgrade.
          </div>
        )}
      </div>

      {/* Billing toggle */}
      {plans.length > 0 && (
        <>
          <div className="flex justify-center">
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl inline-flex">
              {["monthly", "yearly"].map((c) => (
                <button
                  key={c}
                  onClick={() => setBillingCycle(c)}
                  className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                    billingCycle === c
                      ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                  {c === "yearly" && (
                    <span className="text-[10px] text-[#00a884] ml-1">Save 20%</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Plans grid */}
          <div className={`grid grid-cols-1 gap-6 ${plans.length === 2 ? "md:grid-cols-2" : plans.length >= 3 ? "md:grid-cols-3" : ""}`}>
            {plans.map((p, idx) => (
              <PlanCard
                key={p._id}
                plan={p}
                idx={idx}
                isCurrent={String(p._id) === currentPlanId}
                isPaidPlan={isPaidPlan}
                billingCycle={billingCycle}
                canSwitch={!!allowUserPlanSwitch}
                user={user}
                onUpgrade={fetchData}
                showToast={showToast}
                openDemoModal={openDemoModal}
              />
            ))}
          </div>
        </>
      )}

      {/* Plan features comparison */}
      {plans.length > 1 && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <FileText size={18} className="text-[#00a884]" />
              Plan Comparison
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 w-40">Limit</th>
                  {plans.map((p) => (
                    <th key={p._id} className="text-center py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">
                      {p.name}
                      {p._id === currentPlanId && (
                        <span className="ml-1 text-[10px] text-[#00a884]">✓ Current</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {[
                  { label: "Sessions", key: "sessions" },
                  { label: "Campaigns", key: "campaigns" },
                  { label: "Number Lists", key: "numberLists" },
                  { label: "Msgs / Month", key: "messagesMonthly" },
                  { label: "Storage (MB)", key: "storageMb" },
                ].map(({ label, key }) => (
                  <tr key={key} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">{label}</td>
                    {plans.map((p) => (
                      <td key={p._id} className="text-center py-3 px-4 text-slate-700 dark:text-slate-300">
                        {fmt(p.limits?.[key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FAQ */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <Shield size={18} className="text-[#00a884]" />
          FAQ
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              q: "Can I change plans anytime?",
              a: "Plan switching is controlled by your administrator. If enabled, upgrades take effect immediately.",
            },
            {
              q: "How does billing work?",
              a: "Monthly plans renew every 30 days. Yearly plans are billed once annually and typically offer a discount.",
            },
            {
              q: "What happens when I hit a limit?",
              a: "The system will block actions that exceed your plan limit (sessions, campaigns, messages). Upgrade to increase limits.",
            },
            {
              q: "Is Razorpay payment secure?",
              a: "Yes. Payments are processed by Razorpay with PCI-DSS compliance. We never store your card details.",
            },
          ].map(({ q, a }) => (
            <div key={q} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <h4 className="text-sm font-semibold text-slate-800 dark:text-white mb-1">{q}</h4>
              <p className="text-xs text-slate-500">{a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Contact sales */}
      <div className="card p-6 bg-gradient-to-r from-[#008069] to-[#00a884] text-white">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Sparkles size={24} />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Need a custom plan?</h3>
              <p className="text-sm text-white/80">Ask your administrator for a tailored solution.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CreditCard size={16} />
            <span>Secured by Razorpay</span>
          </div>
        </div>
      </div>
    </div>
  );
}
