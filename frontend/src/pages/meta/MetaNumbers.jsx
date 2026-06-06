import { useState, useEffect } from "react";
import { Phone, RefreshCw, CheckCircle, Clock, XCircle, AlertTriangle, ChevronDown } from "lucide-react";
import { getNumbers, syncNumbers, submitDisplayName } from "../../services/metaApi.js";
import { authFetch } from "../../services/authFetch.js";

const qualityColor = { GREEN: "badge-green", YELLOW: "badge-yellow", RED: "badge-red", UNKNOWN: "badge-slate" };
const statusIcon = {
  CONNECTED: <CheckCircle size={13} className="text-emerald-500" />,
  PENDING: <Clock size={13} className="text-amber-500" />,
  OFFLINE: <XCircle size={13} className="text-slate-400" />,
  BANNED: <XCircle size={13} className="text-red-500" />,
  RESTRICTED: <AlertTriangle size={13} className="text-orange-500" />,
};

function DisplayNameModal({ number, onClose, onSubmit }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("OTHER");
  const [loading, setLoading] = useState(false);

  const categories = ["OTHER", "AUTOMOTIVE", "BEAUTY", "APPAREL", "EDU", "ENTERTAIN",
    "EVENT_PLAN", "FINANCE", "GROCERY", "GOVT", "HOTEL", "HEALTH", "NONPROFIT",
    "PROF_SERVICES", "RETAIL", "TRAVEL", "RESTAURANT", "NOT_A_BIZ"];

  async function handleSubmit() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onSubmit(number._id, { displayName: name.trim(), category });
      onClose();
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="card p-6 w-full max-w-md mx-4 space-y-4">
        <h3 className="font-semibold text-slate-900 dark:text-white">Submit Display Name</h3>
        <p className="text-xs text-slate-500">
          Display names appear in WhatsApp and must follow Meta's guidelines.
        </p>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Display Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} className="input" placeholder="Your Business Name" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Business Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)} className="input">
            {categories.map(c => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
          </select>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary btn-sm">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={loading || !name.trim()}
            className="btn btn-sm text-white px-4"
            style={{ background: "#1877F2" }}
          >
            {loading ? "Submitting…" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MetaNumbers() {
  const [numbers, setNumbers] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(null);
  const [showModal, setShowModal] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [numRes, bizRes] = await Promise.all([
        getNumbers(),
        authFetch("/api/meta/business"),
      ]);
      setNumbers(numRes.data || []);
      setBusinesses(bizRes.data || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleSync(wabaDbId) {
    setSyncing(wabaDbId);
    try {
      await syncNumbers(wabaDbId);
      await fetchAll();
    } catch (e) { setError(e.message); }
    finally { setSyncing(null); }
  }

  async function handleDisplayName(id, data) {
    await submitDisplayName(id, data);
    await fetchAll();
  }

  if (loading) return <div className="page flex items-center justify-center h-64"><div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "#1877F2", borderTopColor: "transparent" }} /></div>;

  return (
    <div className="page space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Phone Numbers</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your WhatsApp phone numbers across all WABAs
          </p>
        </div>
        {businesses.length > 0 && (
          <div className="flex gap-2">
            {businesses.map(b => (
              <button
                key={b._id}
                onClick={() => handleSync(b._id)}
                disabled={syncing === b._id}
                className="btn-secondary btn-sm flex items-center gap-2"
              >
                <RefreshCw size={13} className={syncing === b._id ? "animate-spin" : ""} />
                Sync {b.businessName || b.wabaId}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>}

      {numbers.length === 0 ? (
        <div className="card p-12 text-center">
          <Phone size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No phone numbers found</p>
          <p className="text-sm text-slate-400 mt-1">Sync your WABA accounts to import phone numbers</p>
        </div>
      ) : (
        <div className="space-y-3">
          {numbers.map((n) => (
            <div key={n._id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                    <Phone size={18} className="text-slate-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {n.displayPhoneNumber || n.phoneNumberId}
                    </p>
                    <p className="text-xs text-slate-400">ID: {n.phoneNumberId}</p>
                    {n.verifiedName && (
                      <p className="text-xs text-slate-500 mt-0.5">Display: {n.verifiedName}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <div className="flex items-center gap-1">
                    {statusIcon[n.status] || null}
                    <span className="text-xs text-slate-600 dark:text-slate-400">{n.status}</span>
                  </div>
                  <span className={`badge ${qualityColor[n.qualityRating] || "badge-slate"}`}>
                    {n.qualityRating}
                  </span>
                  <button
                    onClick={() => setShowModal(n)}
                    className="btn-secondary btn-sm"
                  >
                    Display Name
                  </button>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <p className="text-slate-400">Messaging Limit</p>
                  <p className="font-medium text-slate-700 dark:text-slate-300">{n.messagingLimitTier?.replace("TIER_", "") || "—"}</p>
                </div>
                <div>
                  <p className="text-slate-400">Code Verified</p>
                  <p className="font-medium text-slate-700 dark:text-slate-300">{n.codeVerificationStatus}</p>
                </div>
                <div>
                  <p className="text-slate-400">Name Status</p>
                  <p className="font-medium text-slate-700 dark:text-slate-300">{n.displayNameStatus || "N/A"}</p>
                </div>
                <div>
                  <p className="text-slate-400">WABA</p>
                  <p className="font-medium text-slate-700 dark:text-slate-300 truncate">
                    {n.wabaId?.businessName || n.wabaId?.wabaId || "—"}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <DisplayNameModal
          number={showModal}
          onClose={() => setShowModal(null)}
          onSubmit={handleDisplayName}
        />
      )}
    </div>
  );
}
