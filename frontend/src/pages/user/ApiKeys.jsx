import { useState, useEffect } from "react";
import {
  Key,
  Plus,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Zap,
  Globe,
  Code2,
  RotateCw,
  Clock,
  Activity,
  Lock,
  Unlock,
  ChevronDown,
  ChevronUp,
  Terminal,
} from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import Modal from "../../components/ui/Modal";
import { useAuth } from "../../contexts/AuthContext";
import {
  LimitExceededModal,
  LockedButton,
  parseLimitError,
} from "../../components/ui/LimitExceeded";
import { API_ORIGIN } from "../../config/env";
import { authFetch } from "../../services/authFetch";

// ── helpers ────────────────────────────────────────────────────────────────────
const mask = (prefix) => prefix + "••••••••••••••••••••••••••••••••";

function timeAgo(date) {
  if (!date) return "Never";
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const ENV_BADGE = {
  live: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
  test: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
};

const PERMS = [
  {
    id: "send_messages",
    label: "Send Messages",
    icon: Zap,
    desc: "Send WhatsApp messages via API",
  },
  {
    id: "manage_sessions",
    label: "Manage Sessions",
    icon: Globe,
    desc: "Create and control WhatsApp sessions",
  },
  {
    id: "read_analytics",
    label: "Read Analytics",
    icon: Activity,
    desc: "Access campaign stats and reports",
  },
  {
    id: "manage_webhooks",
    label: "Manage Webhooks",
    icon: Code2,
    desc: "Register and update webhook endpoints",
  },
];

// ── KeyCard ────────────────────────────────────────────────────────────────────
function KeyCard({ apiKey, onRevoke, onDelete }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const isActive = apiKey.status === "active";

  const copy = () => {
    navigator.clipboard.writeText(mask(apiKey.keyPrefix)).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div
      className={`card overflow-hidden transition-all ${!isActive ? "opacity-60" : ""}`}
    >
      {/* colour bar */}
      <div
        className={`h-0.5 ${isActive ? "bg-gradient-to-r from-primary-500 to-emerald-400" : "bg-slate-200 dark:bg-slate-700"}`}
      />

      <div className="p-5">
        {/* top row */}
        <div className="flex items-start gap-3 mb-4">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isActive ? "bg-primary-50 dark:bg-primary-900/20" : "bg-slate-100 dark:bg-slate-800"}`}
          >
            <Key
              size={16}
              className={isActive ? "text-primary-600" : "text-slate-400"}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                {apiKey.name}
              </p>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ENV_BADGE[apiKey.environment]}`}
              >
                {apiKey.environment === "live" ? "Live" : "Test"}
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${isActive ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"}`}
              >
                {isActive ? (
                  <>
                    <CheckCircle2 size={9} /> Active
                  </>
                ) : (
                  <>
                    <AlertCircle size={9} /> Revoked
                  </>
                )}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Created{" "}
              {new Date(apiKey.createdAt).toLocaleDateString("en-US", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>

          {isActive && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => onRevoke(apiKey.id)}
                title="Revoke key"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
              >
                <Lock size={13} />
              </button>
              <button
                onClick={() => onDelete(apiKey.id)}
                title="Delete key"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </div>
          )}
          {!isActive && (
            <button
              onClick={() => onDelete(apiKey.id)}
              title="Remove"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>

        {/* key display */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 min-w-0">
            <Terminal size={13} className="text-slate-400 flex-shrink-0" />
            <code className="flex-1 text-xs font-mono text-slate-600 dark:text-slate-400 truncate">
              {visible ? mask(apiKey.keyPrefix) : mask(apiKey.keyPrefix)}
            </code>
          </div>
          <button
            onClick={copy}
            title="Copy"
            className="w-9 h-9 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0"
          >
            {copied ? (
              <CheckCircle2 size={14} className="text-emerald-500" />
            ) : (
              <Copy size={14} className="text-slate-400" />
            )}
          </button>
        </div>

        {/* stats row */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          {[
            {
              label: "Total Calls",
              value: apiKey.callCount?.toLocaleString() ?? "0",
              icon: Activity,
            },
            {
              label: "Last Used",
              value: timeAgo(apiKey.lastUsed),
              icon: Clock,
            },
            {
              label: "Permissions",
              value: `${apiKey.permissions?.length ?? 0} scopes`,
              icon: ShieldCheck,
            },
          ].map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2.5 text-center"
            >
              <Icon size={12} className="text-slate-400 mx-auto mb-1" />
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {value}
              </p>
              <p className="text-[10px] text-slate-400">{label}</p>
            </div>
          ))}
        </div>

        {/* expandable permissions */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-between text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors pt-2 border-t border-slate-100 dark:border-slate-800"
        >
          <span>Permissions</span>
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {expanded && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(apiKey.permissions || []).map((p) => {
              const perm = PERMS.find((x) => x.id === p);
              return (
                <span
                  key={p}
                  className="inline-flex items-center gap-1 text-[10px] bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 px-2 py-0.5 rounded-full font-medium"
                >
                  <CheckCircle2 size={8} />
                  {perm?.label ?? p}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── main page ──────────────────────────────────────────────────────────────────
export default function ApiKeys() {
  const { token } = useAuth();
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState(null); // raw key shown once
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState(null);
  const [limitError, setLimitError] = useState(null);

  const [form, setForm] = useState({
    name: "",
    environment: "live",
    permissions: [
      "send_messages",
      "manage_sessions",
      "read_analytics",
      "manage_webhooks",
    ],
  });

  const authHeader = { Authorization: `Bearer ${token}` };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchKeys = async () => {
    try {
      const data = await authFetch("/api/api-keys");
      if (data.success) setKeys(data.data);
    } catch {
      showToast("Could not load API keys", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, [token]);

  const handleCreate = async () => {
    if (!form.name.trim()) return showToast("Key name is required", "error");
    setCreating(true);
    try {
      const data = await authFetch("/api/api-keys", { method: "POST", body: form });
      if (!data.success) {
        const limitErr = parseLimitError(data);
        if (limitErr) {
          setShowCreate(false);
          setLimitError(limitErr);
          return;
        }
        return showToast(data.error || "Failed to create key", "error");
      }
      setNewKey(data.data.rawKey);
      // add to list (without rawKey)
      setKeys((prev) => [
        { ...data.data, keyPrefix: data.data.rawKey.slice(0, 16) },
        ...prev,
      ]);
      showToast("API key generated!");
    } catch {
      showToast("Network error", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id) => {
    if (
      !window.confirm(
        "Revoke this key? Any app using it will stop working immediately.",
      )
    )
      return;
    try {
      const data = await authFetch(`/api/api-keys/${id}/revoke`, { method: "PATCH" });
      if (data.success) {
        setKeys((prev) =>
          prev.map((k) => (k.id === id ? { ...k, status: "revoked" } : k)),
        );
        showToast("Key revoked");
      } else {
        showToast(data.error || "Failed to revoke", "error");
      }
    } catch {
      showToast("Network error", "error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Permanently delete this key?")) return;
    try {
      const data = await authFetch(`/api/api-keys/${id}`, { method: "DELETE" });
      if (data.success) {
        setKeys((prev) => prev.filter((k) => k.id !== id));
        showToast("Key deleted");
      } else {
        showToast(data.error || "Failed to delete", "error");
      }
    } catch {
      showToast("Network error", "error");
    }
  };

  const togglePerm = (id) =>
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(id)
        ? f.permissions.filter((p) => p !== id)
        : [...f.permissions, id],
    }));

  const openCreate = () => {
    setNewKey(null);
    setForm({
      name: "",
      environment: "live",
      permissions: [
        "send_messages",
        "manage_sessions",
        "read_analytics",
        "manage_webhooks",
      ],
    });
    setShowCreate(true);
  };

  const activeKeys = keys.filter((k) => k.status === "active");
  const revokedKeys = keys.filter((k) => k.status === "revoked");

  return (
    <div className="page space-y-6">
      {/* Limit modal */}
      {limitError && (
        <LimitExceededModal
          resource={limitError.resource}
          used={limitError.used}
          limit={limitError.limit}
          onClose={() => setLimitError(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium ${toast.type === "error" ? "bg-red-500 text-white" : "bg-emerald-500 text-white"}`}
        >
          {toast.type === "error" ? (
            <AlertCircle size={15} />
          ) : (
            <CheckCircle2 size={15} />
          )}
          {toast.msg}
        </div>
      )}

      <PageHeader
        title="API Keys"
        subtitle="Authenticate your apps with the WhatsApp AI platform"
      >
        {limitError ? (
          <LockedButton
            label="Generate Key"
            onClick={() => setLimitError(limitError)}
          />
        ) : (
          <button onClick={openCreate} className="btn-primary gap-2">
            <Plus size={15} /> Generate Key
          </button>
        )}
      </PageHeader>

      {/* Info banner */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          {
            icon: ShieldCheck,
            color: "text-emerald-600",
            bg: "bg-emerald-50 dark:bg-emerald-900/20",
            title: "Secure by Default",
            desc: "Keys are hashed with SHA-256. The full key is shown only once on creation.",
          },
          {
            icon: Zap,
            color: "text-primary-600",
            bg: "bg-primary-50 dark:bg-primary-900/20",
            title: "Use in any HTTP client",
            desc: "Add Authorization: Bearer wac_live_… to any API request.",
          },
          {
            icon: Lock,
            color: "text-amber-600",
            bg: "bg-amber-50 dark:bg-amber-900/20",
            title: "Revoke anytime",
            desc: "Instantly block access by revoking a key — no redeploy needed.",
          },
        ].map(({ icon: Icon, color, bg, title, desc }) => (
          <div key={title} className="card p-4 flex items-start gap-3">
            <div
              className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}
            >
              <Icon size={16} className={color} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {title}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                {desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick usage snippet */}
      <div className="card p-5">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
          <Terminal size={13} className="text-primary-500" /> Example API
          Request
        </p>
        <pre className="bg-slate-900 text-emerald-400 rounded-xl px-4 py-3 text-xs font-mono overflow-x-auto leading-relaxed">
          {`curl -X POST ${API_ORIGIN}/api/messages/send \
  -H "Authorization: Bearer wac_live_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"session":"wa_1776437321495_*****","to":"9183074*****","message":"Hello!"}'`}
        </pre>
      </div>

      {/* Active keys */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Unlock size={14} className="text-emerald-500" />
            Active Keys
            <span className="ml-1 text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-semibold">
              {activeKeys.length} / 10
            </span>
          </p>
          <button
            onClick={fetchKeys}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RotateCw size={13} />
          </button>
        </div>

        {loading ? (
          <div className="card p-10 flex items-center justify-center">
            <RotateCw size={20} className="text-primary-500 animate-spin" />
          </div>
        ) : activeKeys.length === 0 ? (
          <div className="card p-10 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Key size={24} className="text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No active API keys
            </p>
            <p className="text-xs text-slate-400">
              Generate your first key to start using the API
            </p>
            {limitError ? (
              <LockedButton
                label="Generate Key"
                onClick={() => setLimitError(limitError)}
                className="mt-1"
              />
            ) : (
              <button
                onClick={openCreate}
                className="btn-primary btn-sm gap-2 mt-1"
              >
                <Plus size={13} /> Generate Key
              </button>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeKeys.map((k) => (
              <KeyCard
                key={k.id}
                apiKey={k}
                onRevoke={handleRevoke}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Revoked keys */}
      {revokedKeys.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-slate-500 flex items-center gap-2 mb-3">
            <Lock size={13} /> Revoked Keys
          </p>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {revokedKeys.map((k) => (
              <KeyCard
                key={k.id}
                apiKey={k}
                onRevoke={handleRevoke}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Create / Success Modal ─────────────────────────────────────────── */}
      <Modal
        open={showCreate}
        onClose={() => {
          setShowCreate(false);
          setNewKey(null);
        }}
        title={newKey ? "Key Generated!" : "Generate New API Key"}
        size="sm"
        footer={
          newKey ? (
            <button
              onClick={() => {
                setShowCreate(false);
                setNewKey(null);
              }}
              className="btn-primary btn-sm w-full"
            >
              Done — I've saved my key
            </button>
          ) : (
            <div className="flex gap-2 w-full">
              <button
                onClick={() => setShowCreate(false)}
                className="btn-secondary btn-sm flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !form.name.trim()}
                className="btn-primary btn-sm flex-1 gap-2 disabled:opacity-50"
              >
                {creating ? (
                  <RotateCw size={13} className="animate-spin" />
                ) : (
                  <Key size={13} />
                )}
                {creating ? "Generating…" : "Generate Key"}
              </button>
            </div>
          )
        }
      >
        {newKey ? (
          /* ── Success view ── */
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle2 size={32} className="text-emerald-500" />
              </div>
            </div>

            <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-1.5">
                <AlertCircle size={12} /> Copy now — this key won't be shown
                again
              </p>
              <code className="text-xs font-mono text-amber-700 dark:text-amber-400 break-all leading-relaxed">
                {newKey}
              </code>
            </div>

            <NewKeyCopyBtn rawKey={newKey} />
          </div>
        ) : (
          /* ── Create form ── */
          <div className="space-y-5">
            {/* name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Key Name <span className="text-red-500">*</span>
              </label>
              <input
                className="input"
                placeholder="e.g. Production Server, Mobile App"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                autoFocus
              />
            </div>

            {/* environment */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Environment
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    id: "live",
                    label: "Live",
                    desc: "Production traffic",
                    color:
                      "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20",
                  },
                  {
                    id: "test",
                    label: "Test",
                    desc: "Development & testing",
                    color: "border-amber-400 bg-amber-50 dark:bg-amber-900/20",
                  },
                ].map((env) => (
                  <button
                    key={env.id}
                    onClick={() =>
                      setForm((f) => ({ ...f, environment: env.id }))
                    }
                    className={`p-3 rounded-xl border-2 text-left transition-all ${form.environment === env.id ? env.color : "border-slate-200 dark:border-slate-700 hover:border-slate-300"}`}
                  >
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {env.label}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {env.desc}
                    </p>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5">
                Prefix:{" "}
                <code className="font-mono">
                  {form.environment === "live" ? "wac_live_…" : "wac_test_…"}
                </code>
              </p>
            </div>

            {/* permissions */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Permissions
              </label>
              <div className="space-y-2">
                {PERMS.map(({ id, label, icon: Icon, desc }) => {
                  const checked = form.permissions.includes(id);
                  return (
                    <button
                      key={id}
                      onClick={() => togglePerm(id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${checked ? "border-primary-400 bg-primary-50 dark:bg-primary-900/20" : "border-slate-200 dark:border-slate-700 hover:border-slate-300"}`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${checked ? "bg-primary-100 dark:bg-primary-900/40" : "bg-slate-100 dark:bg-slate-800"}`}
                      >
                        <Icon
                          size={13}
                          className={
                            checked ? "text-primary-600" : "text-slate-400"
                          }
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {label}
                        </p>
                        <p className="text-[10px] text-slate-400">{desc}</p>
                      </div>
                      <div
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${checked ? "bg-primary-600 border-primary-600" : "border-slate-300 dark:border-slate-600"}`}
                      >
                        {checked && (
                          <CheckCircle2 size={10} className="text-white" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function NewKeyCopyBtn({ rawKey }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(rawKey).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="w-full btn-secondary btn-sm gap-2">
      {copied ? (
        <CheckCircle2 size={14} className="text-emerald-500" />
      ) : (
        <Copy size={14} />
      )}
      {copied ? "Copied!" : "Copy to Clipboard"}
    </button>
  );
}
