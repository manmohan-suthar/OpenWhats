import { useState, useEffect, useRef, useCallback } from "react";
import {
  User,
  Bell,
  Shield,
  Globe,
  Save,
  Camera,
  LogOut,
  Trash2,
  Eye,
  EyeOff,
  Check,
  X,
  Loader2,
  ChevronRight,
  CheckCheck,
  Smartphone,
  Megaphone,
  AlertTriangle,
  BarChart2,
  Mail,
  Lock,
  Inbox,
  Clock,
} from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useNavigate } from "react-router-dom";

import { authFetch } from "../../services/authFetch";

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const NOTIF_ICONS = {
  session: {
    Icon: Smartphone,
    bg: "bg-blue-100 dark:bg-blue-900/30",
    color: "text-blue-600",
  },
  campaign: {
    Icon: Megaphone,
    bg: "bg-violet-100 dark:bg-violet-900/30",
    color: "text-violet-600",
  },
  message: {
    Icon: Mail,
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    color: "text-emerald-600",
  },
  billing: {
    Icon: BarChart2,
    bg: "bg-amber-100 dark:bg-amber-900/30",
    color: "text-amber-600",
  },
  security: {
    Icon: Lock,
    bg: "bg-red-100 dark:bg-red-900/30",
    color: "text-red-600",
  },
  system: {
    Icon: Bell,
    bg: "bg-slate-100 dark:bg-slate-800",
    color: "text-slate-600",
  },
};

// ── shared UI ─────────────────────────────────────────────────────────────────
function Toggle({ label, desc, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </p>
        {desc && <p className="text-xs text-slate-500 mt-0.5">{desc}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex w-10 h-5 rounded-full transition-colors duration-200 flex-shrink-0 focus:outline-none ${
          checked ? "bg-[#00a884]" : "bg-slate-300 dark:bg-slate-600"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${checked ? "translate-x-5" : "translate-x-0"}`}
        />
      </button>
    </div>
  );
}

function Toast({ msg, ok }) {
  if (!msg) return null;
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all ${ok ? "bg-[#00a884]" : "bg-red-500"}`}
    >
      {ok ? <Check size={15} /> : <X size={15} />} {msg}
    </div>
  );
}

const TABS = [
  { id: "profile", label: "Profile", Icon: User },
  { id: "security", label: "Security", Icon: Shield },
  { id: "notifications", label: "Notifications", Icon: Bell },
  { id: "appearance", label: "Appearance", Icon: Globe },
  { id: "danger", label: "Danger Zone", Icon: AlertTriangle },
];

// ── Profile Tab ───────────────────────────────────────────────────────────────
function ProfileTab({ onToast }) {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    bio: "",
    location: "",
    timezone: "Asia/Kolkata",
    language: "en",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    authFetch("/api/settings/profile")
      .then((res) => {
        if (res.success) {
          const d = res.data;
          setForm({
            name: d.name || "",
            email: d.email || "",
            phone: d.phone || "",
            company: d.company || "",
            bio: d.bio || "",
            location: d.location || "",
            timezone: d.timezone || "Asia/Kolkata",
            language: d.language || "en",
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await authFetch("/api/settings/profile", {
        method: "PUT",
        body: form,
      });
      if (res.success) {
        updateUser(res.data);
        onToast("Profile saved successfully", true);
      } else {
        onToast(res.error || "Failed to save", false);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 size={24} className="animate-spin text-[#00a884]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#00a884] to-emerald-600 flex items-center justify-center text-white text-2xl font-bold shadow-md">
            {(form.name || user?.name || "U")[0].toUpperCase()}
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-sm">
            <Camera size={12} className="text-slate-500" />
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {form.name || "User"}
          </p>
          <p className="text-xs text-slate-500">{form.email}</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Full Name
          </label>
          <input
            className="input"
            value={form.name}
            onChange={set("name")}
            placeholder="Your name"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Email Address
          </label>
          <input
            className="input"
            type="email"
            value={form.email}
            onChange={set("email")}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Phone Number
          </label>
          <input
            className="input"
            type="tel"
            value={form.phone}
            onChange={set("phone")}
            placeholder="+91 83074 *****"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Company
          </label>
          <input
            className="input"
            value={form.company}
            onChange={set("company")}
            placeholder="Your company"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Location
          </label>
          <input
            className="input"
            value={form.location}
            onChange={set("location")}
            placeholder="City, Country"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Timezone
          </label>
          <select
            className="input"
            value={form.timezone}
            onChange={set("timezone")}
          >
            <option value="Asia/Kolkata">Asia/Kolkata (IST, UTC+5:30)</option>
            <option value="UTC">UTC</option>
            <option value="America/New_York">America/New_York (EST)</option>
            <option value="America/Los_Angeles">
              America/Los_Angeles (PST)
            </option>
            <option value="Europe/London">Europe/London (GMT)</option>
            <option value="Asia/Dubai">Asia/Dubai (GST, UTC+4)</option>
            <option value="Asia/Singapore">Asia/Singapore (SGT, UTC+8)</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          Bio / About
        </label>
        <textarea
          className="input resize-none"
          rows={3}
          value={form.bio}
          onChange={set("bio")}
          placeholder="Tell us about yourself or your use case…"
        />
      </div>

      <div className="flex justify-end">
        <button onClick={save} disabled={saving} className="btn-primary gap-2">
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Save size={14} />
          )}
          {saving ? "Saving…" : "Save Profile"}
        </button>
      </div>
    </div>
  );
}

// ── Security Tab ──────────────────────────────────────────────────────────────
function SecurityTab({ onToast }) {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [show, setShow] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [saving, setSaving] = useState(false);

  const handleCurrentPasswordChange = useCallback(
    (e) => setForm((f) => ({ ...f, currentPassword: e.target.value })),
    [],
  );
  const handleNewPasswordChange = useCallback(
    (e) => setForm((f) => ({ ...f, newPassword: e.target.value })),
    [],
  );
  const handleConfirmPasswordChange = useCallback(
    (e) => setForm((f) => ({ ...f, confirmPassword: e.target.value })),
    [],
  );

  const toggleCurrent = useCallback(
    () => setShow((s) => ({ ...s, current: !s.current })),
    [],
  );
  const toggleNew = useCallback(
    () => setShow((s) => ({ ...s, new: !s.new })),
    [],
  );
  const toggleConfirm = useCallback(
    () => setShow((s) => ({ ...s, confirm: !s.confirm })),
    [],
  );

  const save = async () => {
    if (!form.currentPassword || !form.newPassword) {
      return onToast("All fields are required", false);
    }
    if (form.newPassword !== form.confirmPassword) {
      return onToast("Passwords do not match", false);
    }
    if (form.newPassword.length < 8) {
      return onToast("New password must be at least 8 characters", false);
    }
    setSaving(true);
    try {
      const res = await authFetch("/api/settings/password", {
        method: "PUT",
        body: {
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        },
      });
      if (res.success) {
        setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        onToast("Password updated successfully", true);
      } else {
        onToast(res.error || "Failed to update password", false);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
          Change Password
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Current Password
            </label>
            <div className="relative">
              <input
                type={show.current ? "text" : "password"}
                className="input pr-10"
                value={form.currentPassword}
                onChange={handleCurrentPasswordChange}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={toggleCurrent}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {show.current ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <input
                  type={show.new ? "text" : "password"}
                  className="input pr-10"
                  value={form.newPassword}
                  onChange={handleNewPasswordChange}
                  placeholder="Min. 8 characters"
                />
                <button
                  type="button"
                  onClick={toggleNew}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {show.new ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={show.confirm ? "text" : "password"}
                  className="input pr-10"
                  value={form.confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  placeholder="Repeat password"
                />
                <button
                  type="button"
                  onClick={toggleConfirm}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {show.confirm ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={save}
            disabled={saving}
            className="btn-primary gap-2"
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Shield size={14} />
            )}
            {saving ? "Updating…" : "Update Password"}
          </button>
        </div>
      </div>

      <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
          Active Sessions
        </h3>
        <p className="text-xs text-slate-500 mb-3">
          You are currently logged in on this device.
        </p>
        <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-[#00a884]/10 flex items-center justify-center">
            <Smartphone size={14} className="text-[#00a884]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
              This device
            </p>
            <p className="text-[10px] text-slate-400">
              Current session — Web browser
            </p>
          </div>
          <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Notifications Tab ─────────────────────────────────────────────────────────
function NotificationsTab({ onToast }) {
  const [prefs, setPrefs] = useState({
    sessionDisconnect: true,
    deliveryFailures: true,
    usageWarnings: true,
    weeklySummary: false,
    marketing: false,
  });
  const [inbox, setInbox] = useState([]);
  const [unread, setUnread] = useState(0);
  const [inboxLoading, setInboxLoading] = useState(true);
  const [prefSaving, setPrefSaving] = useState(false);
  const [view, setView] = useState("inbox"); // "inbox" | "prefs"

  useEffect(() => {
    authFetch("/api/settings/notifications/prefs").then((r) => {
      if (r.success) setPrefs((p) => ({ ...p, ...r.data }));
    });
    loadInbox();
  }, []);

  const loadInbox = () => {
    setInboxLoading(true);
    authFetch("/api/settings/notifications?limit=20")
      .then((r) => {
        if (r.success) {
          setInbox(r.data.items || []);
          setUnread(r.data.unread || 0);
        }
      })
      .finally(() => setInboxLoading(false));
  };

  const savePrefs = async () => {
    setPrefSaving(true);
    try {
      const res = await authFetch("/api/settings/notifications/prefs", {
        method: "PUT",
        body: prefs,
      });
      if (res.success) {
        onToast("Notification preferences saved", true);
      } else {
        onToast(res.error || "Failed to save", false);
      }
    } finally {
      setPrefSaving(false);
    }
  };

  const markAllRead = async () => {
    await authFetch("/api/settings/notifications/read-all", { method: "PUT" });
    setInbox((p) => p.map((n) => ({ ...n, read: true })));
    setUnread(0);
  };

  const markRead = async (id) => {
    setInbox((p) => p.map((n) => (n._id === id ? { ...n, read: true } : n)));
    setUnread((c) => Math.max(0, c - 1));
    await authFetch(`/api/settings/notifications/${id}/read`, {
      method: "PUT",
    });
  };

  const deleteNotif = async (id) => {
    const notif = inbox.find((n) => n._id === id);
    setInbox((p) => p.filter((n) => n._id !== id));
    if (notif && !notif.read) setUnread((c) => Math.max(0, c - 1));
    await authFetch(`/api/settings/notifications/${id}`, { method: "DELETE" });
  };

  return (
    <div className="space-y-6">
      {/* Sub-nav */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
        {[
          {
            id: "inbox",
            label: `Inbox${unread > 0 ? ` (${unread})` : ""}`,
            Icon: Inbox,
          },
          { id: "prefs", label: "Preferences", Icon: Bell },
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              view === id
                ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {view === "inbox" && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-500">
              {inbox.length} notifications
            </p>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-[#00a884] hover:text-[#008f70] font-medium"
              >
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>

          {inboxLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 size={20} className="animate-spin text-[#00a884]" />
            </div>
          ) : inbox.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-slate-400">
              <Bell size={24} className="opacity-30" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {inbox.map((n) => {
                const meta = NOTIF_ICONS[n.type] || NOTIF_ICONS.system;
                const { Icon, bg, color } = meta;
                return (
                  <div
                    key={n._id}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${
                      n.read
                        ? "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800"
                        : "bg-[#00a884]/5 border-[#00a884]/20"
                    }`}
                    onClick={() => !n.read && markRead(n._id)}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center flex-shrink-0 mt-0.5`}
                    >
                      <Icon size={14} className={color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs font-semibold ${n.read ? "text-slate-700 dark:text-slate-300" : "text-slate-900 dark:text-white"}`}
                      >
                        {n.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                        <Clock size={9} /> {timeAgo(n.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-[#00a884]" />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotif(n._id);
                        }}
                        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {view === "prefs" && (
        <div className="space-y-4">
          <div className="divide-y divide-slate-100 dark:divide-slate-800 space-y-3">
            <Toggle
              label="Session Disconnect Alerts"
              desc="Notify when a WhatsApp session goes offline"
              checked={prefs.sessionDisconnect}
              onChange={(v) =>
                setPrefs((p) => ({ ...p, sessionDisconnect: v }))
              }
            />
            <div className="pt-3">
              <Toggle
                label="Message Delivery Failures"
                desc="Alert when a message fails to deliver"
                checked={prefs.deliveryFailures}
                onChange={(v) =>
                  setPrefs((p) => ({ ...p, deliveryFailures: v }))
                }
              />
            </div>
            <div className="pt-3">
              <Toggle
                label="API Usage Warnings"
                desc="Warn at 80% and 95% of monthly quota"
                checked={prefs.usageWarnings}
                onChange={(v) => setPrefs((p) => ({ ...p, usageWarnings: v }))}
              />
            </div>
            <div className="pt-3">
              <Toggle
                label="Weekly Usage Summary"
                desc="Receive a summary every Monday morning"
                checked={prefs.weeklySummary}
                onChange={(v) => setPrefs((p) => ({ ...p, weeklySummary: v }))}
              />
            </div>
            <div className="pt-3">
              <Toggle
                label="Marketing Emails"
                desc="Product updates and tips from our team"
                checked={prefs.marketing}
                onChange={(v) => setPrefs((p) => ({ ...p, marketing: v }))}
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              onClick={savePrefs}
              disabled={prefSaving}
              className="btn-primary gap-2"
            >
              {prefSaving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              {prefSaving ? "Saving…" : "Save Preferences"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Appearance Tab ────────────────────────────────────────────────────────────
function AppearanceTab({ onToast }) {
  const { theme, toggleTheme } = useTheme();
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    timezone: user?.timezone || "Asia/Kolkata",
    language: user?.language || "en",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await authFetch("/api/settings/profile", {
        method: "PUT",
        body: form,
      });
      if (res.success) {
        updateUser(res.data);
        onToast("Preferences saved", true);
      } else {
        onToast(res.error || "Failed to save", false);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
          Theme
        </h3>
        <div className="flex gap-3">
          {["light", "dark"].map((t) => (
            <button
              key={t}
              onClick={() => {
                if (theme !== t) toggleTheme();
              }}
              className={`flex-1 py-4 rounded-xl border-2 text-sm font-medium capitalize transition-all ${
                theme === t
                  ? "border-[#00a884] bg-[#00a884]/5 text-[#00a884]"
                  : "border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              {t === "light" ? "☀️" : "🌙"} {t}
              {theme === t && (
                <span className="ml-2 text-xs bg-[#00a884] text-white px-2 py-0.5 rounded-full">
                  Active
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
          Regional Settings
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Timezone
            </label>
            <select
              className="input"
              value={form.timezone}
              onChange={(e) =>
                setForm((f) => ({ ...f, timezone: e.target.value }))
              }
            >
              <option value="Asia/Kolkata">Asia/Kolkata (IST, UTC+5:30)</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="America/Los_Angeles">
                America/Los_Angeles (PST)
              </option>
              <option value="Europe/London">Europe/London (GMT)</option>
              <option value="Asia/Dubai">Asia/Dubai (GST, UTC+4)</option>
              <option value="Asia/Singapore">
                Asia/Singapore (SGT, UTC+8)
              </option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Language
            </label>
            <select
              className="input"
              value={form.language}
              onChange={(e) =>
                setForm((f) => ({ ...f, language: e.target.value }))
              }
            >
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="ar">Arabic</option>
              <option value="es">Spanish</option>
              <option value="pt">Portuguese</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={save}
            disabled={saving}
            className="btn-primary gap-2"
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            {saving ? "Saving…" : "Save Preferences"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Danger Zone Tab ───────────────────────────────────────────────────────────
function DangerTab({ onToast }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [showDelete, setShowDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const doDelete = async () => {
    if (!deletePassword)
      return onToast("Enter your password to confirm", false);
    setDeleting(true);
    try {
      const res = await authFetch("/api/settings/account", {
        method: "DELETE",
        body: { password: deletePassword },
      });
      if (res.success) {
        logout();
        navigate("/login");
      } else {
        onToast(res.error || "Failed to delete account", false);
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Sign out of all devices
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            This will invalidate all active sessions.
          </p>
        </div>
        <button
          onClick={() => {
            logout();
            navigate("/login");
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 transition-colors gap-2"
        >
          <LogOut size={13} /> Sign Out
        </button>
      </div>

      <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50 rounded-xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              Delete Account
            </p>
            <p className="text-xs text-red-600/70 dark:text-red-500/70 mt-0.5">
              Permanently delete your account and all data. This cannot be
              undone.
            </p>
          </div>
          <button
            onClick={() => setShowDelete((v) => !v)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors whitespace-nowrap"
          >
            <Trash2 size={13} /> Delete Account
          </button>
        </div>

        {showDelete && (
          <div className="mt-4 pt-4 border-t border-red-200 dark:border-red-900/50 space-y-3">
            <p className="text-xs text-red-700 dark:text-red-400 font-medium">
              Enter your password to confirm account deletion:
            </p>
            <div className="relative max-w-sm">
              <input
                type={showPwd ? "text" : "password"}
                className="input pr-10 border-red-300 dark:border-red-800 focus:ring-red-500"
                placeholder="Your password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={doDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {deleting ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Trash2 size={13} />
                )}
                {deleting ? "Deleting…" : "Confirm Delete"}
              </button>
              <button
                onClick={() => {
                  setShowDelete(false);
                  setDeletePassword("");
                }}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function UserSettings() {
  const [activeTab, setActiveTab] = useState("profile");
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((msg, ok) => {
    clearTimeout(toastTimer.current);
    setToast({ msg, ok });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const tabContent = {
    profile: <ProfileTab onToast={showToast} />,
    security: <SecurityTab onToast={showToast} />,
    notifications: <NotificationsTab onToast={showToast} />,
    appearance: <AppearanceTab onToast={showToast} />,
    danger: <DangerTab onToast={showToast} />,
  };

  return (
    <div className="page space-y-5">
      <PageHeader
        title="Settings"
        subtitle="Manage your account and preferences"
      />

      <div className="flex gap-5 flex-col lg:flex-row">
        {/* Sidebar tabs */}
        <div className="lg:w-52 flex-shrink-0">
          <nav className="card p-2 space-y-0.5">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                  activeTab === id
                    ? id === "danger"
                      ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                      : "bg-[#00a884]/10 text-[#00a884]"
                    : id === "danger"
                      ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Icon size={15} />
                {label}
                {activeTab === id && (
                  <ChevronRight size={13} className="ml-auto" />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="card p-5">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
              {TABS.find((t) => t.id === activeTab)?.label}
            </h2>
            {tabContent[activeTab]}
          </div>
        </div>
      </div>

      <Toast msg={toast?.msg} ok={toast?.ok} />
    </div>
  );
}
