import { useState, useEffect } from "react";
import { adminGetMessages } from "../../../services/metaApi.js";

const statusBadge = { sending: "badge-slate", sent: "badge-blue", delivered: "badge-green", read: "badge-purple", failed: "badge-red" };

export default function AdminMetaMessages() {
  const [messages, setMessages] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => { fetchAll(); }, [filterStatus, page]);

  function fetchAll() {
    setLoading(true);
    const params = { page, limit: 50 };
    if (filterStatus) params.status = filterStatus;
    adminGetMessages(params)
      .then(r => { setMessages(r.data || []); setTotal(r.total || 0); })
      .catch(console.warn)
      .finally(() => setLoading(false));
  }

  return (
    <div className="page space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Message Logs</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">All messages across the platform ({total})</p>
      </div>

      <div className="flex gap-3">
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className="input max-w-xs">
          <option value="">All Statuses</option>
          {["sending", "sent", "delivered", "read", "failed"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="table-container rounded-none border-0">
          <table className="table">
            <thead>
              <tr>
                <th>To</th>
                <th>Type</th>
                <th>Content</th>
                <th>User</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="text-center text-slate-400 py-8">Loading…</td></tr>}
              {!loading && messages.length === 0 && <tr><td colSpan={6} className="text-center text-slate-400 py-8">No messages</td></tr>}
              {messages.map(m => (
                <tr key={m._id}>
                  <td className="font-mono text-xs">{m.to}</td>
                  <td><span className="badge badge-slate text-[10px]">{m.type}</span></td>
                  <td className="max-w-xs truncate text-slate-600 dark:text-slate-400 text-xs">
                    {m.templateName ? `[Template] ${m.templateName}` : (m.body || "—")}
                  </td>
                  <td className="text-xs">
                    <p>{m.userId?.name || "—"}</p>
                    <p className="text-slate-400">{m.userId?.email}</p>
                  </td>
                  <td><span className={`badge ${statusBadge[m.status] || "badge-slate"}`}>{m.status}</span></td>
                  <td className="text-xs text-slate-400">{new Date(m.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {total > 50 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary btn-sm">Prev</button>
          <span className="text-sm text-slate-500">Page {page}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page * 50 >= total} className="btn-secondary btn-sm">Next</button>
        </div>
      )}
    </div>
  );
}
