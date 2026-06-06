import { useState, useEffect } from "react";
import { Save, RefreshCw, Eye, EyeOff } from "lucide-react";
import { adminGetSettings, adminUpdateSettings } from "../../../services/metaApi.js";

const META_BLUE = "#1877F2";

export default function AdminMetaSettings() {
  const [form, setForm] = useState({
    metaAppId: "",
    metaAppSecret: "",
    webhookVerifyToken: "",
    webhookUrl: "",
    apiVersion: "v19.0",
    embeddedSignupConfigId: "",
    allowNewRegistrations: true,
    maxWABAsPerUser: 5,
    rateLimitPerMinute: 80,
    maintenanceMode: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    adminGetSettings()
      .then(r => { if (r.data) setForm(f => ({ ...f, ...r.data })); })
      .catch(console.warn)
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await adminUpdateSettings(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  if (loading) return <div className="page flex items-center justify-center h-64"><div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: META_BLUE, borderTopColor: "transparent" }} /></div>;

  return (
    <div className="page space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Meta System Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Configure platform-wide Meta App credentials and limits
        </p>
      </div>

      {/* App credentials */}
      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Meta App Credentials</h2>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">App ID</label>
          <input type="text" value={form.metaAppId} onChange={set("metaAppId")} className="input" placeholder="Meta App ID" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">App Secret</label>
          <div className="relative">
            <input type={showSecret ? "text" : "password"} value={form.metaAppSecret} onChange={set("metaAppSecret")} className="input pr-10" placeholder="Meta App Secret" />
            <button type="button" onClick={() => setShowSecret(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">API Version</label>
          <select value={form.apiVersion} onChange={set("apiVersion")} className="input max-w-xs">
            {["v18.0", "v19.0", "v20.0", "v21.0"].map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Embedded Signup Config ID</label>
          <input type="text" value={form.embeddedSignupConfigId} onChange={set("embeddedSignupConfigId")} className="input" placeholder="Optional" />
        </div>
      </div>

      {/* Webhook */}
      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Webhook</h2>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Webhook URL</label>
          <input type="text" value={form.webhookUrl} onChange={set("webhookUrl")} className="input" placeholder="https://yourdomain.com/api/meta/webhook" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Verify Token</label>
          <input type="text" value={form.webhookVerifyToken} onChange={set("webhookVerifyToken")} className="input" />
        </div>
      </div>

      {/* Limits */}
      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Platform Limits</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Max WABAs per User</label>
            <input type="number" value={form.maxWABAsPerUser} onChange={set("maxWABAsPerUser")} className="input" min={1} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Rate Limit (msg/min)</label>
            <input type="number" value={form.rateLimitPerMinute} onChange={set("rateLimitPerMinute")} className="input" min={1} />
          </div>
        </div>
      </div>

      {/* Toggles */}
      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Toggles</h2>
        {[
          { key: "allowNewRegistrations", label: "Allow new user registrations", desc: "Users can connect new Facebook accounts" },
          { key: "maintenanceMode", label: "Maintenance mode", desc: "Disable all API endpoints temporarily" },
        ].map(({ key, label, desc }) => (
          <label key={key} className="flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{label}</p>
              <p className="text-xs text-slate-400">{desc}</p>
            </div>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, [key]: !f[key] }))}
              className="relative w-10 h-5 rounded-full transition-colors duration-200 flex-shrink-0"
              style={form[key] ? { background: META_BLUE } : { background: "rgb(203 213 225)" }}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${form[key] ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </label>
        ))}
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn btn-sm text-white px-5 flex items-center gap-2" style={{ background: META_BLUE }}>
          {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
          {saved ? "Saved!" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
