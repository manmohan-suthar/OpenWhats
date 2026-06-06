import { useState, useEffect } from "react";
import { Building2 } from "lucide-react";
import { adminGetBusinesses, adminSetBusinessStatus } from "../../../services/metaApi.js";

export default function AdminMetaBusiness() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    adminGetBusinesses()
      .then(r => setBusinesses(r.data || []))
      .catch(console.warn)
      .finally(() => setLoading(false));
  }

  async function handleStatus(wabaId, status) {
    await adminSetBusinessStatus(wabaId, status);
    await fetchAll();
  }

  const statusBadge = { active: "badge-green", suspended: "badge-red", disconnected: "badge-slate" };

  if (loading) return <div className="page flex items-center justify-center h-64"><div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "#1877F2", borderTopColor: "transparent" }} /></div>;

  return (
    <div className="page space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Business Accounts</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          All connected WhatsApp Business Accounts ({businesses.length})
        </p>
      </div>

      {businesses.length === 0 ? (
        <div className="card p-12 text-center">
          <Building2 size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No businesses connected yet</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="table-container rounded-none border-0">
            <table className="table">
              <thead>
                <tr>
                  <th>Business Name</th>
                  <th>WABA ID</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {businesses.map(b => (
                  <tr key={b._id}>
                    <td className="font-medium text-slate-800 dark:text-slate-200">{b.businessName || "—"}</td>
                    <td className="text-xs text-slate-500 font-mono">{b.wabaId}</td>
                    <td>
                      <p className="text-sm">{b.userId?.name || "—"}</p>
                      <p className="text-xs text-slate-400">{b.userId?.email}</p>
                    </td>
                    <td><span className={`badge ${statusBadge[b.status] || "badge-slate"}`}>{b.status}</span></td>
                    <td>
                      <div className="flex gap-2">
                        {b.status !== "active" && (
                          <button onClick={() => handleStatus(b.wabaId, "active")} className="btn-secondary btn-sm text-emerald-600">Activate</button>
                        )}
                        {b.status === "active" && (
                          <button onClick={() => handleStatus(b.wabaId, "suspended")} className="btn-secondary btn-sm text-red-500">Suspend</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
