import { useState, useEffect } from "react";
import { Flag, CheckCircle, XCircle } from "lucide-react";
import { adminGetTemplates, adminModerateTemplate } from "../../../services/metaApi.js";

const statusBadge = { APPROVED: "badge-green", PENDING: "badge-yellow", REJECTED: "badge-red", DRAFT: "badge-slate", PAUSED: "badge-yellow" };
const catBadge = { MARKETING: "badge-purple", UTILITY: "badge-blue", AUTHENTICATION: "badge-slate" };

export default function AdminMetaTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterFlagged, setFilterFlagged] = useState(false);

  useEffect(() => { fetchAll(); }, [filterFlagged]);

  function fetchAll() {
    setLoading(true);
    const params = filterFlagged ? { isFlagged: "true" } : {};
    adminGetTemplates(params)
      .then(r => setTemplates(r.data || []))
      .catch(console.warn)
      .finally(() => setLoading(false));
  }

  async function handleModerate(id, action, adminNote = "") {
    await adminModerateTemplate(id, { action, adminNote });
    await fetchAll();
  }

  return (
    <div className="page space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Template Moderation</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Review and moderate all user templates ({templates.length})
        </p>
      </div>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={filterFlagged} onChange={e => setFilterFlagged(e.target.checked)} className="rounded" />
          Show flagged only
        </label>
      </div>

      <div className="card overflow-hidden">
        <div className="table-container rounded-none border-0">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Owner</th>
                <th>WABA</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="text-center text-slate-400 py-8">Loading…</td></tr>}
              {!loading && templates.length === 0 && <tr><td colSpan={6} className="text-center text-slate-400 py-8">No templates</td></tr>}
              {templates.map(t => (
                <tr key={t._id} className={t.isFlagged ? "bg-amber-50/50 dark:bg-amber-900/10" : ""}>
                  <td>
                    <div className="flex items-center gap-2">
                      {t.isFlagged && <Flag size={12} className="text-amber-500 flex-shrink-0" />}
                      <span className="font-medium text-slate-800 dark:text-slate-200">{t.name}</span>
                    </div>
                    {t.adminNote && <p className="text-[10px] text-amber-600 mt-0.5">{t.adminNote}</p>}
                  </td>
                  <td><span className={`badge ${catBadge[t.category] || "badge-slate"}`}>{t.category}</span></td>
                  <td className="text-xs">
                    <p>{t.userId?.name || "—"}</p>
                    <p className="text-slate-400">{t.userId?.email}</p>
                  </td>
                  <td className="text-xs text-slate-500">{t.wabaId?.businessName || "—"}</td>
                  <td><span className={`badge ${statusBadge[t.status] || "badge-slate"}`}>{t.status}</span></td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      {!t.isFlagged
                        ? <button onClick={() => handleModerate(t._id, "flag", "Flagged for review")} className="btn-secondary btn-sm text-amber-500 text-xs flex items-center gap-1"><Flag size={11} /> Flag</button>
                        : <button onClick={() => handleModerate(t._id, "unflag")} className="btn-secondary btn-sm text-emerald-600 text-xs">Unflag</button>
                      }
                      <button onClick={() => handleModerate(t._id, "reject")} className="btn-secondary btn-sm text-red-500 text-xs flex items-center gap-1">
                        <XCircle size={11} /> Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
