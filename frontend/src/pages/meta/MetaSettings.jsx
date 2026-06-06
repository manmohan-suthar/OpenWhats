import { useState, useEffect } from "react";
import { Save, RefreshCw } from "lucide-react";
import { authFetch } from "../../services/authFetch.js";
import { getMetaStatus } from "../../services/metaApi.js";

const META_BLUE = "#1877F2";

export default function MetaSettings() {
  const [webhook, setWebhook] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [apiVersion, setApiVersion] = useState("v19.0");
  const [autoReply, setAutoReply] = useState(false);
  const [fbStatus, setFbStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getMetaStatus().then(s => setFbStatus(s)).catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      // Save user-level settings (stored locally for now)
      localStorage.setItem("meta_webhook", webhook);
      localStorage.setItem("meta_api_version", apiVersion);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  }

  useEffect(() => {
    setWebhook(localStorage.getItem("meta_webhook") || "");
    setApiVersion(localStorage.getItem("meta_api_version") || "v19.0");
  }, []);

  return (
    <div className="page space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Meta Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Configure your WhatsApp Cloud API integration
        </p>
      </div>

      {/* Account info */}
      {fbStatus?.connected && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Account</h2>
          <div className="flex items-center gap-3">
            {fbStatus.facebookPicture && (
              <img src={fbStatus.facebookPicture} alt="" className="w-10 h-10 rounded-full" />
            )}
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-200 text-sm">{fbStatus.facebookName}</p>
              <p className="text-xs text-slate-400">{fbStatus.facebookEmail}</p>
            </div>
            <span className="badge badge-green ml-auto">Connected</span>
          </div>
          {fbStatus.tokenExpiresAt && (
            <p className="text-xs text-slate-400 mt-2">
              Token expires: {new Date(fbStatus.tokenExpiresAt).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      {/* Webhook */}
      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Webhook</h2>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Webhook URL</label>
          <input
            type="text"
            value={webhook}
            onChange={e => setWebhook(e.target.value)}
            className="input"
            placeholder="https://yourdomain.com/api/meta/webhook"
          />
          <p className="text-[10px] text-slate-400 mt-1">
            Register this URL in your Meta App → Webhooks
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Verify Token</label>
          <input
            type="text"
            value={verifyToken}
            onChange={e => setVerifyToken(e.target.value)}
            className="input"
            placeholder="Your webhook verify token"
          />
        </div>
      </div>

      {/* API */}
      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">API Configuration</h2>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">API Version</label>
          <select value={apiVersion} onChange={e => setApiVersion(e.target.value)} className="input max-w-xs">
            {["v18.0", "v19.0", "v20.0", "v21.0"].map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Meta App ID</label>
          <input type="text" className="input" defaultValue={import.meta.env.VITE_META_APP_ID || ""} readOnly />
          <p className="text-[10px] text-slate-400 mt-1">Set VITE_META_APP_ID in your .env.local</p>
        </div>
      </div>

      {/* Preferences */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Preferences</h2>
        <label className="flex items-center justify-between gap-4 cursor-pointer">
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Auto-reply to incoming messages</p>
            <p className="text-xs text-slate-400 mt-0.5">Automatically acknowledge incoming messages</p>
          </div>
          <button
            onClick={() => setAutoReply(v => !v)}
            className="relative w-10 h-5 rounded-full transition-colors duration-200 flex-shrink-0"
            style={autoReply ? { background: META_BLUE } : { background: "rgb(203 213 225)" }}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${autoReply ? "translate-x-5" : "translate-x-0"}`} />
          </button>
        </label>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-sm text-white px-5 flex items-center gap-2"
          style={{ background: META_BLUE }}
        >
          {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
          {saved ? "Saved!" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
