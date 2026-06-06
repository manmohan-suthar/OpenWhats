import { useNavigate } from "react-router-dom";
import { Lock, ArrowRight, X, Zap, TrendingUp, Crown } from "lucide-react";

const RESOURCE_META = {
  sessions: {
    label: "WhatsApp Sessions",
    icon: "📱",
    tip: "Connect more devices or phone numbers",
  },
  campaigns: {
    label: "Campaigns",
    icon: "📢",
    tip: "Run more bulk message campaigns",
  },
  numberLists: {
    label: "Number Lists",
    icon: "📋",
    tip: "Store more contact lists",
  },
  messagesDaily: {
    label: "Daily Messages",
    icon: "💬",
    tip: "Send more messages per day",
  },
  messagesWeekly: {
    label: "Weekly Messages",
    icon: "💬",
    tip: "Send more messages per week",
  },
  messagesMonthly: {
    label: "Monthly Messages",
    icon: "💬",
    tip: "Send more messages this month",
  },
  storageMb: {
    label: "Storage",
    icon: "🗄️",
    tip: "Upload more media files",
  },
  apiKeys: {
    label: "API Keys",
    icon: "🔑",
    tip: "Create more API integrations",
  },
};

// ─── Full-screen upgrade modal ───────────────────────────────────────────────

export function LimitExceededModal({ resource, used, limit, onClose }) {
  const navigate = useNavigate();
  const meta = RESOURCE_META[resource] || { label: resource, icon: "🔒", tip: "Upgrade to get more" };

  const pct = limit > 0 ? Math.min(Math.round((used / limit) * 100), 100) : 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Top gradient bar */}
        <div className="h-1.5 bg-gradient-to-r from-[#00a884] via-[#008069] to-purple-500" />

        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg text-2xl">
                {meta.icon}
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Plan Limit Reached</h2>
                <p className="text-sm text-slate-500">{meta.label}</p>
              </div>
            </div>
            {onClose && (
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                <X size={18} />
              </button>
            )}
          </div>

          {/* Usage meter */}
          {limit > 0 && (
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Usage</span>
                <span className="font-bold text-slate-800 dark:text-white">
                  {used} / {limit} <span className="text-xs font-normal text-slate-400">{meta.label}</span>
                </span>
              </div>
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-red-500 to-rose-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-xs text-red-500 font-medium">
                You've used {pct}% of your {meta.label.toLowerCase()} limit
              </p>
            </div>
          )}

          {/* Message */}
          <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-3.5">
            <Lock size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Upgrade your plan to <strong>{meta.tip}</strong> and unlock full access.
            </p>
          </div>

          {/* Benefits */}
          <div className="space-y-2">
            {[
              "Higher limits on all resources",
              "Priority support",
              "Advanced features & analytics",
            ].map((b) => (
              <div key={b} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <Zap size={13} className="text-[#00a884] flex-shrink-0" />
                {b}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={() => { navigate("/subscription"); onClose?.(); }}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#008069] to-[#00a884] text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-[#00a884]/20"
            >
              <Crown size={15} /> Upgrade Plan <ArrowRight size={15} />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Later
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Inline banner (for top of page) ────────────────────────────────────────

export function LimitBanner({ resource, used, limit, onUpgrade }) {
  const navigate = useNavigate();
  const meta = RESOURCE_META[resource] || { label: resource, icon: "🔒", tip: "" };
  const pct = limit > 0 ? Math.min(Math.round((used / limit) * 100), 100) : 100;

  return (
    <div className="flex items-center gap-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
      <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
        <TrendingUp size={18} className="text-amber-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          {meta.label} limit reached ({used}/{limit})
        </p>
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
          Upgrade your plan to create more
        </p>
      </div>
      <button
        onClick={() => onUpgrade ? onUpgrade() : navigate("/subscription")}
        className="flex-shrink-0 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
      >
        <Crown size={13} /> Upgrade
      </button>
    </div>
  );
}

// ─── Locked button (replaces "New X" button when limit hit) ─────────────────

export function LockedButton({ label, onClick, className = "" }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 text-sm font-medium hover:border-[#00a884] hover:text-[#00a884] transition-all group ${className}`}
    >
      <Lock size={14} className="group-hover:text-[#00a884]" />
      {label}
      <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-md font-semibold">
        Upgrade
      </span>
    </button>
  );
}

// ─── Helper: parse limit error from API response ────────────────────────────

export function parseLimitError(data) {
  if (data?.code === "LIMIT_EXCEEDED") {
    return {
      resource: data.details?.resource || "unknown",
      used: data.details?.used ?? 0,
      limit: data.details?.limit ?? 0,
    };
  }
  return null;
}
