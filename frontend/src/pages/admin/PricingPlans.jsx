import { useState, useEffect, useCallback } from "react";
import {
  Crown, Plus, Edit2, Trash2, ToggleLeft, ToggleRight,
  Settings, Users, ChevronDown, ChevronUp, Check, X,
  AlertCircle, Loader, RefreshCw, Shield, Zap, Clock,
  MessageSquare, Database, BarChart2, Star, Save,
  Info, Eye, UserCheck, Gift,
} from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { useAuth } from "../../contexts/AuthContext";
import { authFetch } from "../../services/authFetch";
import { API_ORIGIN } from "../../config/env";

const API = `${API_ORIGIN}/api/subscriptions`;

const DEFAULT_LIMITS = { sessions: 1, campaigns: 2, numberLists: 2, storageMb: 200, messagesDaily: 50, messagesWeekly: 200, messagesMonthly: 500 };
const DEFAULT_FEATURES = [
  { key: "sessions", label: "WhatsApp Sessions", enabled: true },
  { key: "campaigns", label: "Campaigns", enabled: true },
  { key: "numberLists", label: "Number Lists", enabled: true },
  { key: "media", label: "Media Storage", enabled: true },
  { key: "apiMessaging", label: "API Message Sending", enabled: true },
  { key: "planSwitch", label: "User Plan Switching", enabled: true },
];

function Badge({ children, color = "slate" }) {
  const colors = {
    slate: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    violet: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${colors[color] || colors.slate}`}>
      {children}
    </span>
  );
}

function Toggle({ value, onChange, disabled }) {
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      className={`relative inline-flex w-10 h-5 rounded-full transition-colors flex-shrink-0 ${value ? "bg-primary-600" : "bg-slate-300 dark:bg-slate-600"} ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

function LimitInput({ label, value, onChange, icon: Icon }) {
  const isUnlimited = value === -1 || value < 0;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div className="flex items-center gap-2 w-44 flex-shrink-0">
        {Icon && <Icon size={13} className="text-slate-400" />}
        <span className="text-xs text-slate-600 dark:text-slate-400">{label}</span>
      </div>
      <div className="flex items-center gap-2 flex-1">
        <input
          type="number"
          value={isUnlimited ? "" : value}
          onChange={(e) => onChange(e.target.value === "" ? -1 : Number(e.target.value))}
          placeholder="Unlimited"
          min="-1"
          className="input py-1.5 text-sm w-28"
          disabled={isUnlimited}
        />
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={isUnlimited}
            onChange={(e) => onChange(e.target.checked ? -1 : 0)}
            className="rounded"
          />
          <span className="text-xs text-slate-500">Unlimited</span>
        </label>
      </div>
    </div>
  );
}

function PlanModal({ plan, onClose, onSave, saving }) {
  const isNew = !plan?._id;
  const [form, setForm] = useState({
    name: plan?.name || "",
    slug: plan?.slug || "",
    description: plan?.description || "",
    currency: plan?.currency || "INR",
    priceMonthly: plan?.priceMonthly ?? 0,
    priceYearly: plan?.priceYearly ?? 0,
    durationDays: plan?.durationDays ?? 30,
    isActive: plan?.isActive ?? true,
    isDemo: plan?.isDemo ?? false,
    isCustom: plan?.isCustom ?? false,
    sortOrder: plan?.sortOrder ?? 100,
    assignToRoles: (plan?.assignToRoles || []).join(", "),
    assignToLocations: (plan?.assignToLocations || []).join(", "),
    limits: { ...DEFAULT_LIMITS, ...(plan?.limits || {}) },
    features: plan?.features?.length ? [...plan.features] : [...DEFAULT_FEATURES],
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setLimit = (k, v) => setForm(p => ({ ...p, limits: { ...p.limits, [k]: v } }));
  const setFeature = (i, enabled) => setForm(p => ({
    ...p,
    features: p.features.map((f, idx) => idx === i ? { ...f, enabled } : f),
  }));

  const handleSubmit = () => {
    const payload = {
      ...form,
      assignToRoles: form.assignToRoles.split(",").map(s => s.trim()).filter(Boolean),
      assignToLocations: form.assignToLocations.split(",").map(s => s.trim()).filter(Boolean),
      priceMonthly: Number(form.priceMonthly),
      priceYearly: Number(form.priceYearly),
      durationDays: Number(form.durationDays),
      sortOrder: Number(form.sortOrder),
    };
    onSave(payload, plan?._id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <Crown size={17} className="text-primary-600" />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white text-sm">{isNew ? "Create Plan" : `Edit — ${plan.name}`}</p>
              <p className="text-[11px] text-slate-400">Configure plan limits and features</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><X size={15} /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Plan Name *</label>
              <input className="input text-sm" value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Pro" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Slug *</label>
              <input className="input text-sm font-mono" value={form.slug} onChange={e => set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"))} placeholder="e.g. pro" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
              <input className="input text-sm" value={form.description} onChange={e => set("description", e.target.value)} placeholder="Short plan description" />
            </div>
          </div>

          {/* Pricing */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Pricing</p>
            </div>
            <div className="p-4 grid grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Currency</label>
                <input className="input py-1.5 text-sm" value={form.currency} onChange={e => set("currency", e.target.value)} />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Monthly Price (₹)</label>
                <input type="number" min="0" className="input py-1.5 text-sm" value={form.priceMonthly} onChange={e => set("priceMonthly", e.target.value)} />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Yearly Price (₹)</label>
                <input type="number" min="0" className="input py-1.5 text-sm" value={form.priceYearly} onChange={e => set("priceYearly", e.target.value)} />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Duration (days)</label>
                <input type="number" min="1" className="input py-1.5 text-sm" value={form.durationDays} onChange={e => set("durationDays", e.target.value)} />
              </div>
            </div>
          </div>

          {/* Limits */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Resource Limits <span className="text-slate-400 font-normal ml-1">(leave blank or -1 for unlimited)</span></p>
            </div>
            <div className="px-4 py-1">
              <LimitInput label="Sessions" icon={Zap} value={form.limits.sessions} onChange={v => setLimit("sessions", v)} />
              <LimitInput label="Campaigns" icon={BarChart2} value={form.limits.campaigns} onChange={v => setLimit("campaigns", v)} />
              <LimitInput label="Number Lists" icon={Users} value={form.limits.numberLists} onChange={v => setLimit("numberLists", v)} />
              <LimitInput label="Storage (MB)" icon={Database} value={form.limits.storageMb} onChange={v => setLimit("storageMb", v)} />
              <LimitInput label="Messages/day" icon={MessageSquare} value={form.limits.messagesDaily} onChange={v => setLimit("messagesDaily", v)} />
              <LimitInput label="Messages/week" icon={MessageSquare} value={form.limits.messagesWeekly} onChange={v => setLimit("messagesWeekly", v)} />
              <LimitInput label="Messages/month" icon={MessageSquare} value={form.limits.messagesMonthly} onChange={v => setLimit("messagesMonthly", v)} />
            </div>
          </div>

          {/* Features */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Features (enable/disable per plan)</p>
            </div>
            <div className="p-4 space-y-2">
              {form.features.map((f, i) => (
                <div key={f.key} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-slate-700 dark:text-slate-300">{f.label}</span>
                  <Toggle value={f.enabled} onChange={(v) => setFeature(i, v)} />
                </div>
              ))}
            </div>
          </div>

          {/* Flags & Targeting */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Plan Flags</p>
              {[
                { key: "isActive", label: "Active" },
                { key: "isDemo", label: "Demo / Trial Plan" },
                { key: "isCustom", label: "Custom Plan" },
              ].map(f => (
                <div key={f.key} className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-400">{f.label}</span>
                  <Toggle value={form[f.key]} onChange={v => set(f.key, v)} />
                </div>
              ))}
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Sort Order</label>
                <input type="number" className="input py-1.5 text-sm w-24" value={form.sortOrder} onChange={e => set("sortOrder", e.target.value)} />
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Targeting</p>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Assign to Roles (comma-sep)</label>
                <input className="input py-1.5 text-sm" value={form.assignToRoles} onChange={e => set("assignToRoles", e.target.value)} placeholder="e.g. user, admin" />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Assign to Locations (comma-sep)</label>
                <input className="input py-1.5 text-sm" value={form.assignToLocations} onChange={e => set("assignToLocations", e.target.value)} placeholder="e.g. IN, US" />
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary btn-sm">Cancel</button>
          <button onClick={handleSubmit} disabled={saving || !form.name || !form.slug} className="btn-primary btn-sm gap-2 disabled:opacity-50">
            {saving ? <Loader size={13} className="animate-spin" /> : <Save size={13} />}
            {isNew ? "Create Plan" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function UserUsageRow({ row, plans, onAssign }) {
  const { user, subscription, usage, limits } = row;
  const pct = (used, limit) => (limit < 0 ? 0 : Math.min(Math.round((used / limit) * 100), 100));
  const fmt = (n) => (n < 0 ? "∞" : n?.toLocaleString?.() ?? n);

  return (
    <tr className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40">
      <td className="px-4 py-3">
        <div>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{user.name || user.email}</p>
          <p className="text-[11px] text-slate-400">{user.email}</p>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Badge color={subscription?.status === "active" ? "green" : subscription?.status === "trial" ? "amber" : "red"}>
            {subscription?.plan?.name || "No plan"}
          </Badge>
          <span className="text-[10px] text-slate-400 capitalize">{subscription?.status}</span>
        </div>
        {subscription?.expiresAt && (
          <p className="text-[10px] text-slate-400 mt-0.5">
            Expires {new Date(subscription.expiresAt).toLocaleDateString()}
          </p>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="space-y-1">
          {[
            { label: "Sessions", used: usage?.sessions || 0, limit: limits?.sessions },
            { label: "Campaigns", used: usage?.campaigns || 0, limit: limits?.campaigns },
            { label: "Msgs/day", used: usage?.messagesDaily || 0, limit: limits?.messagesDaily },
          ].map(({ label, used, limit }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 w-16 flex-shrink-0">{label}</span>
              <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${pct(used, limit) >= 90 ? "bg-red-500" : pct(used, limit) >= 70 ? "bg-amber-500" : "bg-primary-500"}`}
                  style={{ width: `${pct(used, limit)}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 w-14 text-right">{used}/{fmt(limit)}</span>
            </div>
          ))}
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={() => onAssign(row)}
          className="btn-secondary btn-sm text-xs gap-1"
        >
          <UserCheck size={11} /> Assign Plan
        </button>
      </td>
    </tr>
  );
}

function AssignPlanModal({ row, plans, onClose, onSave, saving }) {
  const [planId, setPlanId] = useState(row?.subscription?.plan?._id || "");
  const [durationDays, setDurationDays] = useState(30);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <p className="font-bold text-slate-900 dark:text-white mb-1">Assign Plan</p>
        <p className="text-xs text-slate-500 mb-4">User: <strong>{row.user.email}</strong></p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Plan</label>
            <select className="input text-sm" value={planId} onChange={e => setPlanId(e.target.value)}>
              <option value="">— Select plan —</option>
              {plans.map(p => (
                <option key={p._id} value={p._id}>{p.name} — ₹{p.priceMonthly}/mo</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Duration (days)</label>
            <input type="number" min="1" className="input text-sm" value={durationDays} onChange={e => setDurationDays(Number(e.target.value))} />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="btn-secondary btn-sm flex-1">Cancel</button>
          <button onClick={() => onSave(row.user._id, planId, durationDays)} disabled={saving || !planId} className="btn-primary btn-sm flex-1 gap-2 disabled:opacity-50">
            {saving ? <Loader size={13} className="animate-spin" /> : <Check size={13} />}
            Assign
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Razorpay Settings Card ─────────────────────────────────────────────────────
function RazorpaySettings({ settings, setSettings, token }) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // {ok, msg}

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const data = await authFetch("/api/payments/test-connection", { method: "POST" });
      setTestResult({ ok: data.success, msg: data.success ? data.message : data.error });
    } catch {
      setTestResult({ ok: false, msg: "Network error — could not reach server" });
    } finally {
      setTesting(false);
    }
  };

  const isTestMode = (settings.razorpayKeyId || "").startsWith("rzp_test_");

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-white">Razorpay Payment Gateway</p>
          <a
            href="https://dashboard.razorpay.com/app/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#00a884] hover:underline"
          >
            Get your API keys from Razorpay Dashboard →
          </a>
        </div>
        <Toggle
          value={!!settings.razorpayEnabled}
          onChange={v => setSettings(s => ({ ...s, razorpayEnabled: v }))}
        />
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Key ID <span className="text-slate-400 font-normal">(public — starts with rzp_test_ or rzp_live_)</span>
          </label>
          <input
            className="input text-sm font-mono"
            placeholder="rzp_test_XXXXXXXXXXXXXXXX"
            value={settings.razorpayKeyId || ""}
            onChange={e => {
              setTestResult(null);
              setSettings(s => ({ ...s, razorpayKeyId: e.target.value.trim() }));
            }}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Key Secret <span className="text-slate-400 font-normal">(stored securely in DB)</span>
          </label>
          <input
            className="input text-sm font-mono"
            type="password"
            placeholder={settings.razorpayKeySecretSet ? "Leave blank to keep existing secret" : "Paste your key secret here"}
            value={settings.razorpayKeySecret || ""}
            onChange={e => {
              setTestResult(null);
              setSettings(s => ({ ...s, razorpayKeySecret: e.target.value }));
            }}
          />
          {settings.razorpayKeySecretSet && !(settings.razorpayKeySecret) && (
            <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
              <Check size={11} /> Secret saved. Enter a new value only if you want to replace it.
            </p>
          )}
        </div>
      </div>

      {/* Mode badge */}
      {settings.razorpayKeyId && (
        <div className={`text-xs px-3 py-2 rounded-lg flex items-center gap-2 ${
          isTestMode
            ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
            : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
        }`}>
          <span>{isTestMode ? "🧪" : "✅"}</span>
          <span className="font-medium">{isTestMode ? "Test mode" : "Live mode"}</span>
          <code className="ml-auto font-mono opacity-70">{settings.razorpayKeyId}</code>
        </div>
      )}

      {/* Test result */}
      {testResult && (
        <div className={`text-xs px-3 py-2.5 rounded-lg flex items-start gap-2 ${
          testResult.ok
            ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
            : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
        }`}>
          {testResult.ok ? <Check size={13} className="flex-shrink-0 mt-0.5" /> : <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />}
          <span>{testResult.msg}</span>
        </div>
      )}

      {/* How to get keys */}
      {!settings.razorpayKeyId && (
        <div className="text-xs bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-3 space-y-1 text-blue-700 dark:text-blue-300">
          <p className="font-semibold">How to get Razorpay API keys:</p>
          <ol className="list-decimal list-inside space-y-0.5 text-blue-600 dark:text-blue-400">
            <li>Login at dashboard.razorpay.com</li>
            <li>Go to Settings → API Keys</li>
            <li>Click "Generate Test Key" (or Live Key)</li>
            <li>Copy Key ID and Key Secret here</li>
          </ol>
        </div>
      )}

      {/* Test connection button */}
      {settings.razorpayKeyId && (
        <button
          type="button"
          onClick={testConnection}
          disabled={testing}
          className="w-full py-2 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-400 hover:border-[#00a884] hover:text-[#00a884] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {testing
            ? <><Loader size={14} className="animate-spin" /> Testing connection…</>
            : <><RefreshCw size={14} /> Test Razorpay Connection</>
          }
        </button>
      )}
    </div>
  );
}

export default function PricingPlans() {
  const { token } = useAuth();
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const [plans, setPlans] = useState([]);
  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("plans"); // plans | users | settings
  const [editPlan, setEditPlan] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [assignRow, setAssignRow] = useState(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [pData, uData, sData] = await Promise.all([
        authFetch(`${API}/admin/plans`),
        authFetch(`${API}/admin/users-usage`),
        authFetch(`${API}/admin/settings`),
      ]);
      if (pData.success) setPlans(pData.data);
      if (uData.success) setUsers(uData.data);
      if (sData.success) setSettings(sData.data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const savePlan = async (payload, id) => {
    try {
      setSaving(true);
      const url = id ? `${API}/admin/plans/${id}` : `${API}/admin/plans`;
      const method = id ? "PUT" : "POST";
      const data = await authFetch(url, { method, body: payload });
      if (!data.success) throw new Error(data.error);
      setShowPlanModal(false);
      setEditPlan(null);
      showToast(id ? "Plan updated" : "Plan created");
      load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const deletePlan = async (id) => {
    if (!confirm("Delete this plan? If it has users, it will be disabled instead.")) return;
    try {
      const data = await authFetch(`${API}/admin/plans/${id}`, { method: "DELETE" });
      if (!data.success) throw new Error(data.error);
      showToast(data.message || "Plan deleted");
      load();
    } catch (err) { setError(err.message); }
  };

  const toggleActive = async (plan) => {
    try {
      const data = await authFetch(`${API}/admin/plans/${plan._id}`, {
        method: "PUT", body: { isActive: !plan.isActive },
      });
      if (!data.success) throw new Error(data.error);
      setPlans(prev => prev.map(p => p._id === plan._id ? data.data : p));
    } catch (err) { setError(err.message); }
  };

  const saveSettings = async (patch) => {
    try {
      setSaving(true);
      const data = await authFetch(`${API}/admin/settings`, { method: "PUT", body: patch });
      if (!data.success) throw new Error(data.error);
      setSettings(data.data);
      showToast("Settings saved");
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const assignPlan = async (userId, planId, durationDays) => {
    try {
      setSaving(true);
      const data = await authFetch(`${API}/admin/assign`, {
        method: "POST", body: { userId, planId, durationDays },
      });
      if (!data.success) throw new Error(data.error);
      setAssignRow(null);
      showToast("Plan assigned successfully");
      load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const fmtLimit = (v) => (v === undefined || v === null || Number(v) < 0 ? "∞" : v.toLocaleString());

  return (
    <div className="page space-y-5">
      <PageHeader title="Subscription Plans" subtitle="Manage plans, limits, features, and user subscriptions">
        <div className="flex items-center gap-2">
          <button onClick={load} className="btn-ghost btn-sm p-2" title="Refresh">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          {tab === "plans" && (
            <button onClick={() => { setEditPlan(null); setShowPlanModal(true); }} className="btn-primary gap-2">
              <Plus size={14} /> New Plan
            </button>
          )}
        </div>
      </PageHeader>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2">
          <Check size={14} /> {toast}
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2">
          <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
          <button onClick={() => setError("")} className="ml-auto"><X size={12} /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-fit">
        {[
          { id: "plans", label: "Plans", icon: Crown },
          { id: "users", label: "User Usage", icon: Users },
          { id: "settings", label: "Settings", icon: Settings },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${tab === t.id ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader size={24} className="animate-spin text-primary-500" />
        </div>
      ) : (
        <>
          {/* ── Plans Tab ── */}
          {tab === "plans" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {plans.map(plan => (
                <div key={plan._id} className={`card p-5 space-y-4 ${!plan.isActive ? "opacity-60" : ""}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${plan.isDemo ? "bg-amber-100 dark:bg-amber-900/30" : "bg-primary-100 dark:bg-primary-900/30"}`}>
                        {plan.isDemo ? <Gift size={16} className="text-amber-600" /> : <Crown size={16} className="text-primary-600" />}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-sm">{plan.name}</p>
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          <Badge color={plan.isActive ? "green" : "red"}>{plan.isActive ? "Active" : "Inactive"}</Badge>
                          {plan.isDemo && <Badge color="amber">Demo</Badge>}
                          {plan.isCustom && <Badge color="violet">Custom</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditPlan(plan); setShowPlanModal(true); }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-primary-600 transition-colors">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => deletePlan(plan._id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {plan.description && <p className="text-xs text-slate-500">{plan.description}</p>}

                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        {plan.priceMonthly > 0 ? `₹${plan.priceMonthly}` : "Free"}
                      </p>
                      <p className="text-[11px] text-slate-400">/month</p>
                    </div>
                    {plan.priceYearly > 0 && (
                      <p className="text-xs text-slate-500">₹{plan.priceYearly}/yr</p>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs">
                    {[
                      { label: "Sessions", v: plan.limits?.sessions },
                      { label: "Campaigns", v: plan.limits?.campaigns },
                      { label: "Number Lists", v: plan.limits?.numberLists },
                      { label: "Storage", v: plan.limits?.storageMb, suffix: " MB" },
                      { label: "Messages/day", v: plan.limits?.messagesDaily },
                    ].map(({ label, v, suffix = "" }) => (
                      <div key={label} className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>{label}</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{fmtLimit(v)}{v > 0 ? suffix : ""}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">{plan.durationDays}d duration</span>
                    <Toggle value={plan.isActive} onChange={() => toggleActive(plan)} />
                  </div>
                </div>
              ))}

              {/* Add new card */}
              <button
                onClick={() => { setEditPlan(null); setShowPlanModal(true); }}
                className="card p-5 flex flex-col items-center justify-center gap-3 border-dashed border-2 border-slate-200 dark:border-slate-700 hover:border-primary-400 hover:bg-primary-50/30 dark:hover:bg-primary-900/10 transition-all min-h-[280px] cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 flex items-center justify-center transition-colors">
                  <Plus size={22} className="text-slate-400 group-hover:text-primary-600 transition-colors" />
                </div>
                <p className="text-sm font-semibold text-slate-500 group-hover:text-primary-600 transition-colors">New Plan</p>
              </button>
            </div>
          )}

          {/* ── Users Tab ── */}
          {tab === "users" && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">User Subscriptions & Usage ({users.length} users)</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50">
                      <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">User</th>
                      <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Plan</th>
                      <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Usage</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(row => (
                      <UserUsageRow key={row.user._id} row={row} plans={plans} onAssign={setAssignRow} />
                    ))}
                    {users.length === 0 && (
                      <tr><td colSpan={4} className="text-center py-10 text-sm text-slate-400">No users found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Settings Tab ── */}
          {tab === "settings" && settings && (
            <div className="max-w-lg space-y-5">
              <div className="card p-5 space-y-4">
                <p className="text-sm font-bold text-slate-900 dark:text-white">Demo / Trial Settings</p>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Enable Demo Plan</p>
                    <p className="text-xs text-slate-400">New users get a demo plan automatically</p>
                  </div>
                  <Toggle value={settings.demoEnabled} onChange={v => setSettings(s => ({ ...s, demoEnabled: v }))} />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Demo Duration (days)</label>
                  <input
                    type="number" min="1" max="365"
                    className="input text-sm w-28"
                    value={settings.demoDurationDays}
                    onChange={e => setSettings(s => ({ ...s, demoDurationDays: Number(e.target.value) }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Demo Plan</label>
                  <select
                    className="input text-sm"
                    value={settings.demoPlanId?._id || settings.demoPlanId || ""}
                    onChange={e => setSettings(s => ({ ...s, demoPlanId: e.target.value }))}
                  >
                    <option value="">— None —</option>
                    {plans.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                  </select>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Allow User Plan Switching</p>
                    <p className="text-xs text-slate-400">Users can self-upgrade/downgrade plans</p>
                  </div>
                  <Toggle value={settings.allowUserPlanSwitch} onChange={v => setSettings(s => ({ ...s, allowUserPlanSwitch: v }))} />
                </div>
              </div>

              <RazorpaySettings settings={settings} setSettings={setSettings} token={token} />

              <button
                onClick={() => saveSettings({
                  demoEnabled: settings.demoEnabled,
                  demoDurationDays: settings.demoDurationDays,
                  demoPlanId: settings.demoPlanId?._id || settings.demoPlanId,
                  allowUserPlanSwitch: settings.allowUserPlanSwitch,
                  razorpayEnabled: !!settings.razorpayEnabled,
                  razorpayKeyId: settings.razorpayKeyId || "",
                  // Only send secret if it was actually changed (not the masked placeholder)
                  ...(settings.razorpayKeySecret && !settings.razorpayKeySecret.startsWith("•")
                    ? { razorpayKeySecret: settings.razorpayKeySecret }
                    : {}),
                })}
                disabled={saving}
                className="btn-primary gap-2 disabled:opacity-50"
              >
                {saving ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
                Save Settings
              </button>
            </div>
          )}
        </>
      )}

      {showPlanModal && (
        <PlanModal
          plan={editPlan}
          onClose={() => { setShowPlanModal(false); setEditPlan(null); }}
          onSave={savePlan}
          saving={saving}
        />
      )}

      {assignRow && (
        <AssignPlanModal
          row={assignRow}
          plans={plans}
          onClose={() => setAssignRow(null)}
          onSave={assignPlan}
          saving={saving}
        />
      )}
    </div>
  );
}
