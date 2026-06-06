import { useState, useEffect } from "react";
import {
  Key, Eye, EyeOff, Check, X, AlertCircle, RefreshCw,
  Zap, Brain, ChevronDown, ExternalLink, Shield, Server,
  CheckCircle, Clock, Cpu, Sparkles, Globe, Bot,
} from "lucide-react";
import { authFetch } from "../../services/authFetch";

const MODELS = [
  {
    group: "OpenAI", color: "#10a37f",
    models: [
      { id: "openai/gpt-4o",       label: "GPT-4o",          badge: "Latest",  desc: "Most capable, multimodal" },
      { id: "openai/gpt-4o-mini",  label: "GPT-4o Mini",     badge: "Recommended", desc: "Fast · cheap · great quality" },
      { id: "openai/gpt-3.5-turbo",label: "GPT-3.5 Turbo",   badge: "Budget",  desc: "Very fast, low cost" },
    ],
  },
  {
    group: "Anthropic", color: "#d97757",
    models: [
      { id: "anthropic/claude-3.5-sonnet",label: "Claude 3.5 Sonnet", badge: "Smart",  desc: "Best for nuanced replies" },
      { id: "anthropic/claude-3-haiku",   label: "Claude 3 Haiku",    badge: "Fast",   desc: "Quick, lightweight" },
    ],
  },
  {
    group: "Google", color: "#4285f4",
    models: [
      { id: "google/gemini-pro",          label: "Gemini Pro",        badge: "",       desc: "Strong reasoning" },
      { id: "google/gemini-flash-1.5",    label: "Gemini Flash 1.5",  badge: "Fast",   desc: "Ultra fast responses" },
    ],
  },
  {
    group: "Meta / Open Source", color: "#0866ff",
    models: [
      { id: "meta-llama/llama-3.1-70b-instruct", label: "Llama 3.1 70B", badge: "Free*",  desc: "Powerful open-source" },
      { id: "meta-llama/llama-3.1-8b-instruct",  label: "Llama 3.1 8B",  badge: "Free*",  desc: "Lightweight, fast" },
      { id: "mistralai/mistral-7b-instruct",      label: "Mistral 7B",    badge: "Free*",  desc: "Efficient & capable" },
    ],
  },
];

const ALL_MODELS = MODELS.flatMap(g => g.models);

function ModelSelector({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const current = ALL_MODELS.find(m => m.id === value) || { label: value, desc: "Custom model" };
  const currentGroup = MODELS.find(g => g.models.some(m => m.id === value));

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-violet-400 dark:hover:border-violet-500 transition-all text-left"
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: (currentGroup?.color || "#6366f1") + "18", border: `1px solid ${currentGroup?.color || "#6366f1"}30` }}>
          <Brain size={14} style={{ color: currentGroup?.color || "#6366f1" }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{current.label}</p>
            {current.badge && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">{current.badge}</span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 truncate">{current.desc || current.id}</p>
        </div>
        <ChevronDown size={14} className={`text-slate-400 transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto">
          {MODELS.map(g => (
            <div key={g.group}>
              <div className="px-3 pt-3 pb-1 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: g.color }} />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{g.group}</p>
              </div>
              {g.models.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => { onChange(m.id); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left ${value === m.id ? "bg-violet-50 dark:bg-violet-900/20" : ""}`}
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: g.color + "15", border: `1px solid ${g.color}25` }}>
                    <Cpu size={11} style={{ color: g.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{m.label}</p>
                      {m.badge && <span className="px-1 py-0.5 rounded text-[8px] font-bold" style={{ background: g.color + "20", color: g.color }}>{m.badge}</span>}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">{m.desc}</p>
                  </div>
                  {value === m.id && <Check size={12} className="text-violet-500 flex-shrink-0" />}
                </button>
              ))}
            </div>
          ))}
          {/* Custom model option */}
          <div className="p-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[10px] text-slate-400 px-2 mb-1">Or type a custom model ID above</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminAiSettings() {
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [testing, setTesting]       = useState(false);
  const [testResult, setTestResult] = useState(null); // {ok, msg}
  const [saved, setSaved]           = useState(false);

  const [apiKey, setApiKey]         = useState("");
  const [model, setModel]           = useState("openai/gpt-4o-mini");
  const [showKey, setShowKey]       = useState(false);
  const [maskedKey, setMaskedKey]   = useState("");
  const [hasKey, setHasKey]         = useState(false);
  const [updatedAt, setUpdatedAt]   = useState(null);
  const [customModel, setCustomModel] = useState("");

  useEffect(() => {
    authFetch("/api/admin/openrouter-settings")
      .then(d => {
        setHasKey(d.data?.hasApiKey || false);
        setMaskedKey(d.data?.maskedApiKey || "");
        setModel(d.data?.model || "openai/gpt-4o-mini");
        setUpdatedAt(d.data?.updatedAt || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const body = { model: customModel || model };
      if (apiKey) body.apiKey = apiKey;
      const d = await authFetch("/api/admin/openrouter-settings", { method: "PUT", body });
      setHasKey(d.data?.hasApiKey || false);
      setMaskedKey(d.data?.maskedApiKey || "");
      setModel(d.data?.model || model);
      setUpdatedAt(d.data?.updatedAt);
      setApiKey("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      alert(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await authFetch("/api/ai-agent/test-chat", {
        method: "POST",
        body: { message: "Hello, are you working?" },
      });
      setTestResult({ ok: true, msg: res.data?.reply || "Connection successful!", model: res.data?.model });
    } catch (err) {
      setTestResult({ ok: false, msg: err.message || "Connection failed" });
    } finally {
      setTesting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25 flex-shrink-0">
          <Brain size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">AI / OpenRouter Settings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Configure the OpenRouter API key and default model used by all AI Agents created by users.
          </p>
        </div>
      </div>

      {/* Status banner */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${hasKey ? "bg-emerald-50 dark:bg-emerald-900/15 border-emerald-200 dark:border-emerald-800" : "bg-amber-50 dark:bg-amber-900/15 border-amber-200 dark:border-amber-800"}`}>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${hasKey ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-amber-100 dark:bg-amber-900/30"}`}>
          {hasKey ? <CheckCircle size={16} className="text-emerald-600 dark:text-emerald-400" /> : <AlertCircle size={16} className="text-amber-600 dark:text-amber-400" />}
        </div>
        <div className="flex-1">
          <p className={`text-xs font-bold ${hasKey ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}>
            {hasKey ? "OpenRouter is configured and active" : "OpenRouter API key not configured"}
          </p>
          <p className={`text-[11px] mt-0.5 ${hasKey ? "text-emerald-600/70 dark:text-emerald-400/70" : "text-amber-600/70 dark:text-amber-400/70"}`}>
            {hasKey ? `Model: ${model} · Updated ${updatedAt ? new Date(updatedAt).toLocaleDateString() : "—"}` : "Users cannot create AI agents until you add an API key."}
          </p>
        </div>
        {hasKey && (
          <button onClick={handleTest} disabled={testing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-all flex-shrink-0 disabled:opacity-50">
            {testing ? <RefreshCw size={11} className="animate-spin" /> : <Zap size={11} />}
            {testing ? "Testing…" : "Test"}
          </button>
        )}
      </div>

      {/* Test result */}
      {testResult && (
        <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${testResult.ok ? "bg-emerald-50 dark:bg-emerald-900/15 border-emerald-200 dark:border-emerald-800" : "bg-red-50 dark:bg-red-900/15 border-red-200 dark:border-red-800"}`}>
          {testResult.ok ? <Check size={14} className="text-emerald-600 mt-0.5 flex-shrink-0" /> : <X size={14} className="text-red-500 mt-0.5 flex-shrink-0" />}
          <div>
            <p className={`text-xs font-semibold ${testResult.ok ? "text-emerald-700 dark:text-emerald-300" : "text-red-600 dark:text-red-400"}`}>
              {testResult.ok ? `✓ Connection successful · Model: ${testResult.model}` : "Connection failed"}
            </p>
            <p className={`text-[11px] mt-0.5 ${testResult.ok ? "text-emerald-600/80" : "text-red-500/80"}`}>{testResult.msg}</p>
          </div>
        </div>
      )}

      {/* Main settings card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Card header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-violet-50 dark:from-violet-950/20 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Key size={14} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-white">OpenRouter Configuration</p>
              <p className="text-[11px] text-slate-400">
                Get your API key from{" "}
                <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer"
                  className="text-violet-500 hover:underline inline-flex items-center gap-0.5">
                  openrouter.ai <ExternalLink size={9} />
                </a>
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* API Key */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
              OpenRouter API Key
            </label>
            <div className="relative">
              <Key size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder={hasKey ? `Current: ${maskedKey} (leave blank to keep)` : "sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxx"}
                className="w-full h-11 pl-10 pr-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
              <Shield size={9} /> Stored encrypted · Never exposed to users
            </p>
          </div>

          {/* Model selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
              Default AI Model
            </label>
            <ModelSelector value={model} onChange={v => { setModel(v); setCustomModel(""); }} />
          </div>

          {/* Custom model override */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
              Custom Model ID (optional override)
            </label>
            <div className="relative">
              <Globe size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={customModel}
                onChange={e => setCustomModel(e.target.value)}
                placeholder="e.g. openai/gpt-4-turbo or perplexity/sonar-small-chat"
                className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 transition-all font-mono"
              />
            </div>
            {customModel && (
              <p className="text-[10px] text-violet-500 mt-1">Will use: {customModel}</p>
            )}
          </div>

          {/* Info boxes */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Server,   label: "Provider",   value: "OpenRouter",   color: "text-blue-500",    bg: "bg-blue-50 dark:bg-blue-900/15"   },
              { icon: Brain,    label: "Active Model",value: customModel || model, color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-900/15" },
              { icon: Shield,   label: "Security",    value: "Key encrypted", color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/15" },
            ].map(item => (
              <div key={item.label} className={`${item.bg} rounded-xl p-3 border border-white dark:border-transparent`}>
                <item.icon size={14} className={`${item.color} mb-1.5`} />
                <p className="text-[10px] text-slate-400 leading-none">{item.label}</p>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-0.5 truncate">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Save */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving || (!apiKey && !customModel && model === (model))}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 disabled:opacity-40 text-white text-sm font-bold transition-all shadow-md shadow-violet-500/20"
            >
              {saving
                ? <><RefreshCw size={13} className="animate-spin" /> Saving…</>
                : saved
                  ? <><Check size={13} /> Saved!</>
                  : <><Sparkles size={13} /> Save Settings</>
              }
            </button>
            {saved && (
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                <CheckCircle size={13} /> Settings saved successfully
              </div>
            )}
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
        <p className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Bot size={13} className="text-violet-500" /> How AI Agents Work
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { step: 1, color: "#f59e0b", title: "User Configures", desc: "User picks a WhatsApp session and uploads company knowledge" },
            { step: 2, color: "#6366f1", title: "AI Summarizes", desc: "System summarizes knowledge using this OpenRouter API key" },
            { step: 3, color: "#a855f7", title: "Agent Deploys", desc: "Agent goes live on the selected WhatsApp session" },
            { step: 4, color: "#10b981", title: "Auto-Replies", desc: "All incoming messages are answered by AI using the knowledge base" },
          ].map(s => (
            <div key={s.step} className="relative">
              <div className="w-6 h-6 rounded-full mb-2 flex items-center justify-center text-[10px] font-bold text-white" style={{ background: s.color }}>{s.step}</div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{s.title}</p>
              <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
