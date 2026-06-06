import { useState, useEffect } from "react";
import {
  Shield,
  Bell,
  Globe,
  Server,
  Mail,
  Save,
  Key,
  AlertTriangle,
  Image,
  Video,
  Music,
  FileText,
  Loader,
  Eye,
  EyeOff,
} from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import api from "../../services/api";

function SettingsSection({ icon: Icon, title, desc, children }) {
  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <Icon size={16} className="text-slate-600 dark:text-slate-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {title}
            </p>
            <p className="text-xs text-slate-500">{desc}</p>
          </div>
        </div>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Toggle({ label, desc, defaultChecked }) {
  const [on, setOn] = useState(defaultChecked ?? false);
  return (
    <div className="flex items-center justify-between gap-4 py-0.5">
      <div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </p>
        {desc && <p className="text-xs text-slate-500 mt-0.5">{desc}</p>}
      </div>
      <button
        onClick={() => setOn((v) => !v)}
        className={`relative inline-flex w-10 h-5 rounded-full transition-colors duration-200 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${on ? "bg-primary-600" : "bg-slate-300 dark:bg-slate-600"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${on ? "translate-x-5" : "translate-x-0"}`}
        />
      </button>
    </div>
  );
}

function MediaLimitsSection() {
  const [limits, setLimits] = useState({
    image: 10,
    video: 50,
    audio: 20,
    document: 25,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .getAdminMediaSettings()
      .then((res) => {
        if (res.success) {
          setLimits({
            image: res.data.image?.maxSizeMB ?? 10,
            video: res.data.video?.maxSizeMB ?? 50,
            audio: res.data.audio?.maxSizeMB ?? 20,
            document: res.data.document?.maxSizeMB ?? 25,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.updateAdminMediaSettings({
        image: { maxSizeMB: Number(limits.image) },
        video: { maxSizeMB: Number(limits.video) },
        audio: { maxSizeMB: Number(limits.audio) },
        document: { maxSizeMB: Number(limits.document) },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const types = [
    {
      key: "image",
      label: "Images",
      desc: "JPG, PNG, GIF, WebP",
      icon: Image,
      color: "text-blue-500",
      bg: "bg-blue-50 dark:bg-blue-900/20",
      max: 100,
    },
    {
      key: "video",
      label: "Videos",
      desc: "MP4, WebM",
      icon: Video,
      color: "text-purple-500",
      bg: "bg-purple-50 dark:bg-purple-900/20",
      max: 500,
    },
    {
      key: "audio",
      label: "Audio",
      desc: "MP3, WAV",
      icon: Music,
      color: "text-green-500",
      bg: "bg-green-50 dark:bg-green-900/20",
      max: 100,
    },
    {
      key: "document",
      label: "Documents",
      desc: "PDF, Word, Excel",
      icon: FileText,
      color: "text-orange-500",
      bg: "bg-orange-50 dark:bg-orange-900/20",
      max: 100,
    },
  ];

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <FileText
              size={16}
              className="text-slate-600 dark:text-slate-400"
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Media Upload Limits
            </p>
            <p className="text-xs text-slate-500">
              Max file size per type — enforced on upload
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="btn-primary btn-sm gap-2 disabled:opacity-50"
        >
          {saving ? (
            <Loader size={13} className="animate-spin" />
          ) : (
            <Save size={13} />
          )}
          {saved ? "Saved!" : "Save"}
        </button>
      </div>
      <div className="p-5">
        {error && (
          <div className="mb-4 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader size={22} className="text-primary-500 animate-spin" />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {types.map(({ key, label, desc, icon: Icon, color, bg, max }) => (
              <div
                key={key}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
              >
                <div
                  className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}
                >
                  <Icon size={18} className={color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {label}
                  </p>
                  <p className="text-[10px] text-slate-400">{desc}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <input
                    type="number"
                    min={1}
                    max={max}
                    value={limits[key]}
                    onChange={(e) =>
                      setLimits((p) => ({ ...p, [key]: e.target.value }))
                    }
                    className="w-16 input py-1.5 text-xs text-center"
                  />
                  <span className="text-xs text-slate-400 font-medium">MB</span>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-[11px] text-slate-400">
          Changes apply immediately to all new uploads. Existing files are not
          affected.
        </p>
      </div>
    </div>
  );
}

function OpenRouterSettingsSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [form, setForm] = useState({
    apiKey: "",
    model: "openai/gpt-4o-mini",
    maskedApiKey: "",
    hasApiKey: false,
  });

  const popularModels = [
    "openai/gpt-4o-mini",
    "openai/gpt-4o",
    "anthropic/claude-3.5-sonnet",
    "google/gemini-2.0-flash-001",
    "meta-llama/llama-3.1-70b-instruct",
  ];

  useEffect(() => {
    let mounted = true;
    api
      .getAdminOpenRouterSettings()
      .then((res) => {
        if (!mounted || !res?.success) return;
        setForm((prev) => ({
          ...prev,
          model: res.data?.model || "openai/gpt-4o-mini",
          maskedApiKey: res.data?.maskedApiKey || "",
          hasApiKey: !!res.data?.hasApiKey,
          apiKey: "",
        }));
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err?.message || "Failed to load OpenRouter settings");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const payload = {
        model: form.model,
      };
      if (form.apiKey.trim()) {
        payload.apiKey = form.apiKey.trim();
      }

      const res = await api.updateAdminOpenRouterSettings(payload);
      if (!res?.success) {
        throw new Error(res?.error || "Unable to save OpenRouter settings");
      }

      setForm((prev) => ({
        ...prev,
        apiKey: "",
        model: res.data?.model || prev.model,
        maskedApiKey: res.data?.maskedApiKey || prev.maskedApiKey,
        hasApiKey: !!res.data?.hasApiKey,
      }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch (err) {
      setError(err?.message || "Unable to save OpenRouter settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card overflow-hidden border-violet-200/70 dark:border-violet-900/50">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
            <Server
              size={16}
              className="text-violet-600 dark:text-violet-300"
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              OpenRouter AI Provider
            </p>
            <p className="text-xs text-slate-500">
              Set global API key and default model for AI features
            </p>
          </div>
        </div>
        <button
          onClick={saveSettings}
          disabled={loading || saving || !form.model.trim()}
          className="btn-primary btn-sm gap-2 disabled:opacity-50"
        >
          {saving ? (
            <Loader size={13} className="animate-spin" />
          ) : (
            <Save size={13} />
          )}
          {saved ? "Saved!" : "Save"}
        </button>
      </div>

      <div className="p-5 space-y-4">
        {error && (
          <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader size={22} className="text-violet-500 animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  OpenRouter API Key
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    className="input pr-16"
                    value={form.apiKey}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, apiKey: e.target.value }))
                    }
                    placeholder={
                      form.hasApiKey
                        ? `Current: ${form.maskedApiKey}`
                        : "sk-or-v1-..."
                    }
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    {showApiKey ? "Hide" : "Show"}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Leave empty to keep existing key. Stored securely in database.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Default Model
                </label>
                <input
                  className="input"
                  value={form.model}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, model: e.target.value }))
                  }
                  placeholder="openai/gpt-4o-mini"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Example: provider/model-slug
                </p>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Quick model picker
              </p>
              <div className="flex flex-wrap gap-2">
                {popularModels.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, model: m }))}
                    className={`px-3 py-1.5 rounded-lg text-[11px] border transition-all ${form.model === m ? "border-violet-400 bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300" : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/70"}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-[11px] text-slate-600 dark:text-slate-300 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Key
                  size={13}
                  className={
                    form.hasApiKey ? "text-emerald-500" : "text-amber-500"
                  }
                />
                {form.hasApiKey
                  ? `API key configured (${form.maskedApiKey || "saved"})`
                  : "No API key configured yet"}
              </div>
              <span className="text-slate-400">Provider: OpenRouter</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MetaOAuthSettingsSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [form, setForm] = useState({
    metaAppId: "",
    metaAppSecret: "",
    apiVersion: "v19.0",
    hasAppSecret: false,
    maskedAppSecret: "",
  });

  useEffect(() => {
    let mounted = true;
    api
      .getAdminMetaSettings()
      .then((res) => {
        if (!mounted || !res?.success) return;
        setForm((prev) => ({
          ...prev,
          metaAppId: res.data?.metaAppId || "",
          apiVersion: res.data?.apiVersion || "v19.0",
          hasAppSecret: !!res.data?.hasAppSecret,
          maskedAppSecret: res.data?.maskedAppSecret || "",
          metaAppSecret: "",
        }));
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err?.message || "Failed to load Meta settings");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const payload = {
        metaAppId: form.metaAppId,
        apiVersion: form.apiVersion,
      };
      if (form.metaAppSecret.trim()) {
        payload.metaAppSecret = form.metaAppSecret.trim();
      }

      const res = await api.updateAdminMetaSettings(payload);
      if (!res?.success) {
        throw new Error(res?.error || "Unable to save Meta settings");
      }

      setForm((prev) => ({
        ...prev,
        metaAppId: res.data?.metaAppId || prev.metaAppId,
        apiVersion: res.data?.apiVersion || prev.apiVersion,
        hasAppSecret: !!res.data?.hasAppSecret,
        maskedAppSecret: res.data?.maskedAppSecret || prev.maskedAppSecret,
        metaAppSecret: "",
      }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch (err) {
      setError(err?.message || "Unable to save Meta settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card overflow-hidden border-blue-200/70 dark:border-blue-900/50">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
            <Key size={16} className="text-blue-600 dark:text-blue-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Meta OAuth Credentials
            </p>
            <p className="text-xs text-slate-500">
              Global App ID and App Secret used by Meta connect flow
            </p>
          </div>
        </div>
        <button
          onClick={saveSettings}
          disabled={loading || saving || !form.metaAppId.trim()}
          className="btn-primary btn-sm gap-2 disabled:opacity-50"
        >
          {saving ? (
            <Loader size={13} className="animate-spin" />
          ) : (
            <Save size={13} />
          )}
          {saved ? "Saved!" : "Save"}
        </button>
      </div>

      <div className="p-5 space-y-4">
        {error && (
          <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader size={22} className="text-blue-500 animate-spin" />
          </div>
        ) : (
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Meta App ID
              </label>
              <input
                className="input"
                value={form.metaAppId}
                onChange={(e) =>
                  setForm((p) => ({ ...p, metaAppId: e.target.value }))
                }
                placeholder="Meta App ID"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                API Version
              </label>
              <input
                className="input"
                value={form.apiVersion}
                onChange={(e) =>
                  setForm((p) => ({ ...p, apiVersion: e.target.value }))
                }
                placeholder="v19.0"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Meta App Secret
              </label>
              <div className="relative">
                <input
                  type={showSecret ? "text" : "password"}
                  className="input pr-24"
                  value={form.metaAppSecret}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, metaAppSecret: e.target.value }))
                  }
                  placeholder={
                    form.hasAppSecret
                      ? `Current: ${form.maskedAppSecret || "saved"}`
                      : "Meta App Secret"
                  }
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  {showSecret ? <EyeOff size={12} /> : <Eye size={12} />}
                  {showSecret ? "Hide" : "Show"}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Leave empty to keep current secret.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminSettings() {
  const [saved, setSaved] = useState(false);
  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="page space-y-5">
      <PageHeader
        title="System Settings"
        subtitle="Platform configuration and security policies"
      >
        <button onClick={handleSave} className="btn-primary gap-2 btn-sm">
          <Save size={14} />
          {saved ? "Saved!" : "Save Changes"}
        </button>
      </PageHeader>

      {/* General */}
      <SettingsSection
        icon={Globe}
        title="General Settings"
        desc="Platform-wide defaults"
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Platform Name
            </label>
            <input className="input" defaultValue="WA Control" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Support Email
            </label>
            <input
              className="input"
              type="email"
              defaultValue="support@wacontrol.io"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Default Timezone
            </label>
            <select className="input">
              <option>Asia/Kolkata (IST)</option>
              <option>UTC</option>
              <option>America/New_York</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Max Sessions per User
            </label>
            <input className="input" type="number" defaultValue={5} />
          </div>
        </div>
      </SettingsSection>

      {/* Security */}
      <SettingsSection
        icon={Shield}
        title="Security Policies"
        desc="Authentication and access control"
      >
        <div className="space-y-3 divide-y divide-slate-100 dark:divide-slate-800">
          <Toggle
            label="Require 2FA for Admins"
            desc="Force two-factor authentication for all admin accounts"
            defaultChecked={true}
          />
          <div className="pt-3">
            <Toggle
              label="IP Whitelisting"
              desc="Restrict admin access to specific IP ranges"
            />
          </div>
          <div className="pt-3">
            <Toggle
              label="Session Timeout"
              desc="Auto-logout users after 30 minutes of inactivity"
              defaultChecked={true}
            />
          </div>
          <div className="pt-3">
            <Toggle
              label="Audit Logging"
              desc="Log all admin actions for compliance"
              defaultChecked={true}
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Allowed IP Ranges (comma-separated)
          </label>
          <input
            className="input font-mono text-xs"
            placeholder="192.168.1.0/24, 10.0.0.0/8"
          />
        </div>
      </SettingsSection>

      {/* API settings */}
      <SettingsSection
        icon={Key}
        title="API Configuration"
        desc="Rate limits and API behaviour"
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Rate Limit (req/min)
            </label>
            <input className="input" type="number" defaultValue={60} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Burst Limit
            </label>
            <input className="input" type="number" defaultValue={120} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Token Expiry (days)
            </label>
            <input className="input" type="number" defaultValue={30} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Webhook Timeout (sec)
            </label>
            <input className="input" type="number" defaultValue={10} />
          </div>
        </div>
        <div className="space-y-3 divide-y divide-slate-100 dark:divide-slate-800 mt-2">
          <Toggle
            label="Enable Webhook Retries"
            desc="Auto-retry failed webhooks up to 3 times"
            defaultChecked={true}
          />
          <div className="pt-3">
            <Toggle
              label="CORS Strict Mode"
              desc="Only allow requests from registered domains"
            />
          </div>
        </div>
      </SettingsSection>

      <OpenRouterSettingsSection />

      <MetaOAuthSettingsSection />

      {/* Notifications */}
      <SettingsSection
        icon={Bell}
        title="Notification Settings"
        desc="Alert preferences for admin events"
      >
        <div className="space-y-3 divide-y divide-slate-100 dark:divide-slate-800">
          <Toggle label="Session Disconnect Alerts" defaultChecked={true} />
          <div className="pt-3">
            <Toggle
              label="High Error Rate Alerts"
              desc="Alert when API error rate exceeds 5%"
              defaultChecked={true}
            />
          </div>
          <div className="pt-3">
            <Toggle
              label="New User Registrations"
              desc="Email notification for new signups"
            />
          </div>
          <div className="pt-3">
            <Toggle
              label="Weekly Digest"
              desc="Summary email every Monday morning"
              defaultChecked={true}
            />
          </div>
        </div>
      </SettingsSection>

      {/* Media Limits */}
      <MediaLimitsSection />

      {/* Danger zone */}
      <div className="card border-red-200 dark:border-red-900/50 overflow-hidden">
        <div className="px-5 py-4 border-b border-red-200 dark:border-red-900/50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
            <AlertTriangle size={16} className="text-red-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              Danger Zone
            </p>
            <p className="text-xs text-red-500/80">
              Irreversible platform actions
            </p>
          </div>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Flush Session Cache
              </p>
              <p className="text-xs text-slate-500">
                Clear all cached session data from Redis
              </p>
            </div>
            <button className="btn-danger btn-sm">Flush Cache</button>
          </div>
          <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Reset API Rate Limits
              </p>
              <p className="text-xs text-slate-500">
                Reset all user rate limit counters immediately
              </p>
            </div>
            <button className="btn-danger btn-sm">Reset Limits</button>
          </div>
        </div>
      </div>
    </div>
  );
}
