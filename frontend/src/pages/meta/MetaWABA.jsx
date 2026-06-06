import { useState, useEffect } from "react";
import { Building2, RefreshCw, Trash2, Plus } from "lucide-react";
import { getBusinesses, syncBusinesses, disconnectBusiness } from "../../services/metaApi.js";
import { useNavigate } from "react-router-dom";

const META_BLUE = "#1877F2";

export default function MetaWABA() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    getBusinesses()
      .then(r => setBusinesses(r.data || []))
      .catch(console.warn)
      .finally(() => setLoading(false));
  }

  async function handleSync() {
    setSyncing(true);
    try { await syncBusinesses(); await fetchAll(); } catch (e) { alert(e.message); }
    finally { setSyncing(false); }
  }

  async function handleDisconnect(wabaId) {
    if (!confirm("Disconnect this WABA?")) return;
    await disconnectBusiness(wabaId);
    await fetchAll();
  }

  const statusBadge = { active: "badge-green", suspended: "badge-red", disconnected: "badge-slate" };

  if (loading) return <div className="page flex items-center justify-center h-64"><div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: META_BLUE, borderTopColor: "transparent" }} /></div>;

  return (
    <div className="page space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">WhatsApp Business Accounts</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage your connected WABAs</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSync} disabled={syncing} className="btn-secondary btn-sm flex items-center gap-2">
            <RefreshCw size={13} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Syncing…" : "Sync from Meta"}
          </button>
          <button onClick={() => navigate("/meta/connect")} className="btn btn-sm text-white px-4 flex items-center gap-2" style={{ background: META_BLUE }}>
            <Plus size={14} /> Connect New
          </button>
        </div>
      </div>

      {businesses.length === 0 ? (
        <div className="card p-12 text-center">
          <Building2 size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No WABAs connected</p>
          <p className="text-sm text-slate-400 mt-1 mb-4">Connect your Facebook account and sync WABAs</p>
          <button onClick={() => navigate("/meta/connect")} className="btn btn-sm text-white px-5" style={{ background: META_BLUE }}>
            Go to Connect
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {businesses.map(b => (
            <div key={b._id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(24,119,242,0.1)" }}>
                    <Building2 size={18} style={{ color: META_BLUE }} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{b.businessName || b.wabaId}</p>
                    <p className="text-xs text-slate-400">WABA ID: {b.wabaId}</p>
                    {b.businessAccountId && (
                      <p className="text-xs text-slate-400">Business ID: {b.businessAccountId}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${statusBadge[b.status] || "badge-slate"}`}>{b.status}</span>
                  <button onClick={() => handleDisconnect(b.wabaId)} className="btn-ghost btn-sm p-1.5 text-red-400 hover:text-red-500" title="Disconnect">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="text-slate-400">Currency</p>
                  <p className="font-medium text-slate-700 dark:text-slate-300">{b.currency || "—"}</p>
                </div>
                <div>
                  <p className="text-slate-400">Timezone</p>
                  <p className="font-medium text-slate-700 dark:text-slate-300">{b.timezoneId || "—"}</p>
                </div>
                <div>
                  <p className="text-slate-400">Connected</p>
                  <p className="font-medium text-slate-700 dark:text-slate-300">{new Date(b.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
