import { useState, useEffect } from "react";
import {
  Key, Eye, EyeOff, Check, X, AlertCircle, RefreshCw,
  CheckCircle, ExternalLink, Shield, Sparkles, ToggleLeft, ToggleRight,
} from "lucide-react";
import { authFetch } from "../../services/authFetch";

function GoogleIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z" />
      <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z" />
      <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z" />
      <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z" />
    </svg>
  );
}

export default function AdminGoogleSettings() {
  const [loading, setLoading]               = useState(true);
  const [saving, setSaving]                 = useState(false);
  const [saved, setSaved]                   = useState(false);

  const [clientId, setClientId]             = useState("");
  const [clientSecret, setClientSecret]     = useState("");
  const [enabled, setEnabled]               = useState(true);

  const [existingClientId, setExistingClientId] = useState("");
  const [hasSecret, setHasSecret]           = useState(false);
  const [maskedSecret, setMaskedSecret]     = useState("");
  const [updatedAt, setUpdatedAt]           = useState(null);

  const [showSecret, setShowSecret]         = useState(false);
  const [error, setError]                   = useState("");

  useEffect(() => {
    authFetch("/api/admin/google-oauth-settings")
      .then((d) => {
        setExistingClientId(d.data?.clientId || "");
        setHasSecret(d.data?.hasClientSecret || false);
        setMaskedSecret(d.data?.maskedClientSecret || "");
        setEnabled(d.data?.enabled !== false);
        setUpdatedAt(d.data?.updatedAt || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setError("");
    setSaving(true);
    setSaved(false);
    try {
      const body = { enabled };
      if (clientId.trim()) body.clientId = clientId.trim();
      if (clientSecret.trim()) body.clientSecret = clientSecret.trim();

      if (!body.clientId && !body.clientSecret && body.enabled === enabled) {
        body.clientId = existingClientId;
      }

      const d = await authFetch("/api/admin/google-oauth-settings", { method: "PUT", body });
      setExistingClientId(d.data?.clientId || "");
      setHasSecret(d.data?.hasClientSecret || false);
      setMaskedSecret(d.data?.maskedClientSecret || "");
      setEnabled(d.data?.enabled !== false);
      setUpdatedAt(d.data?.updatedAt);
      setClientId("");
      setClientSecret("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-[#4285F4] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isConfigured = !!existingClientId;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-sm flex-shrink-0">
          <GoogleIcon size={26} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">Google OAuth Settings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Configure the Google OAuth 2.0 Client ID used by the Google Sheets node in Flow Builder.
            All users share this single integration.
          </p>
        </div>
      </div>

      {/* Status banner */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
        isConfigured && enabled
          ? "bg-emerald-50 dark:bg-emerald-900/15 border-emerald-200 dark:border-emerald-800"
          : "bg-amber-50 dark:bg-amber-900/15 border-amber-200 dark:border-amber-800"
      }`}>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isConfigured && enabled
            ? "bg-emerald-100 dark:bg-emerald-900/30"
            : "bg-amber-100 dark:bg-amber-900/30"
        }`}>
          {isConfigured && enabled
            ? <CheckCircle size={16} className="text-emerald-600 dark:text-emerald-400" />
            : <AlertCircle size={16} className="text-amber-600 dark:text-amber-400" />}
        </div>
        <div className="flex-1">
          <p className={`text-xs font-bold ${
            isConfigured && enabled
              ? "text-emerald-700 dark:text-emerald-300"
              : "text-amber-700 dark:text-amber-300"
          }`}>
            {isConfigured && enabled
              ? "Google OAuth is configured and active"
              : !isConfigured
                ? "Google OAuth Client ID not configured"
                : "Google OAuth is disabled"}
          </p>
          <p className={`text-[11px] mt-0.5 ${
            isConfigured && enabled
              ? "text-emerald-600/70 dark:text-emerald-400/70"
              : "text-amber-600/70 dark:text-amber-400/70"
          }`}>
            {isConfigured
              ? `Client ID: ${existingClientId.slice(0, 30)}… · Updated ${updatedAt ? new Date(updatedAt).toLocaleDateString() : "—"}`
              : "Users cannot use Google Sheets nodes until a Client ID is configured."}
          </p>
        </div>
      </div>

      {/* Main card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Card header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-50 dark:from-blue-950/20 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
              <GoogleIcon size={16} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-white">Google Cloud OAuth Configuration</p>
              <p className="text-[11px] text-slate-400">
                Get credentials from{" "}
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline inline-flex items-center gap-0.5"
                >
                  Google Cloud Console <ExternalLink size={9} />
                </a>
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Enable toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Enable Google Sheets Integration</p>
              <p className="text-[11px] text-slate-400 mt-0.5">When disabled, Google Sheets nodes won't connect for any user.</p>
            </div>
            <button
              type="button"
              onClick={() => setEnabled((v) => !v)}
              className="flex-shrink-0 text-slate-400 hover:opacity-80 transition-opacity"
            >
              {enabled
                ? <ToggleRight size={28} className="text-[#0a8c4e]" />
                : <ToggleLeft size={28} className="text-slate-400" />}
            </button>
          </div>

          {/* Client ID */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
              OAuth Client ID
            </label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                <GoogleIcon size={14} />
              </div>
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder={
                  existingClientId
                    ? `Current: ${existingClientId.slice(0, 40)}… (leave blank to keep)`
                    : "xxxxxxxxxx-xxxx.apps.googleusercontent.com"
                }
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all font-mono"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
              <Shield size={9} /> Safe to store — used in browser OAuth popup. This is your Google Cloud Web Application Client ID.
            </p>
          </div>

          {/* Client Secret */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
              OAuth Client Secret <span className="normal-case font-normal text-slate-400">(server-only, never sent to browser)</span>
            </label>
            <div className="relative">
              <Key size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showSecret ? "text" : "password"}
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder={hasSecret ? `Current: ${maskedSecret} (leave blank to keep)` : "GOCSPX-xxxxxxxxxxxxxxxxxxxxxx"}
                className="w-full h-11 pl-10 pr-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowSecret((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
              <Shield size={9} /> Stored server-side only — never exposed to browser clients.
            </p>
          </div>

          {/* Setup instructions */}
          <div className="rounded-xl bg-blue-50/70 dark:bg-blue-900/15 border border-blue-200/50 dark:border-blue-700/40 px-4 py-3.5 space-y-2">
            <p className="text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-2">
              <GoogleIcon size={13} /> How to set up Google OAuth
            </p>
            <ol className="text-[11px] text-blue-600 dark:text-blue-400 space-y-1 list-decimal list-inside">
              <li>Go to Google Cloud Console → APIs &amp; Services → Credentials</li>
              <li>Create OAuth 2.0 Client ID → Application type: <strong>Web Application</strong></li>
              <li>
                Add Authorised JavaScript origins:
                <code className="ml-1 font-mono bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 rounded text-[10px]">https://waa.suthartech.com</code>
                <code className="ml-1 font-mono bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 rounded text-[10px]">http://localhost:5173</code>
              </li>
              <li>Enable Google Sheets API and Google Drive API in the project</li>
              <li>Copy the Client ID and Client Secret above</li>
            </ol>
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-300 hover:underline mt-1"
            >
              Open Google Cloud Console <ExternalLink size={10} />
            </a>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-900/15 border border-red-200 dark:border-red-800 px-4 py-3">
              <X size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Save */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-40 text-white text-sm font-bold transition-all shadow-md shadow-blue-500/20"
            >
              {saving
                ? <><RefreshCw size={13} className="animate-spin" /> Saving…</>
                : saved
                  ? <><Check size={13} /> Saved!</>
                  : <><Sparkles size={13} /> Save Settings</>}
            </button>
            {saved && (
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                <CheckCircle size={13} /> Google OAuth settings saved
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info grid */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
        <p className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
          <GoogleIcon size={13} /> How Google Sheets Node Works
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { step: 1, color: "#4285F4", title: "Admin Configures", desc: "You add the Google OAuth Client ID here in admin settings" },
            { step: 2, color: "#34A853", title: "User Connects", desc: "User clicks Connect in the Google Sheets node — a Google popup opens" },
            { step: 3, color: "#FBBC05", title: "OAuth Grants Access", desc: "User approves Sheets + Drive permissions in the Google popup" },
            { step: 4, color: "#EA4335", title: "Flow Reads/Writes", desc: "The flow node reads, appends, updates or deletes rows in real time" },
          ].map((s) => (
            <div key={s.step} className="relative">
              <div className="w-6 h-6 rounded-full mb-2 flex items-center justify-center text-[10px] font-bold text-white" style={{ background: s.color }}>
                {s.step}
              </div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{s.title}</p>
              <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
