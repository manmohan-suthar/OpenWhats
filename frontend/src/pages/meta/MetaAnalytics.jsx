import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { getMessages, getTemplates, getCampaigns } from "../../services/metaApi.js";

const META_BLUE = "#1877F2";

export default function MetaAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [msgRes, tRes, cRes] = await Promise.all([
        getMessages({ limit: 1000 }),
        getTemplates(),
        getCampaigns(),
      ]);

      const msgs = msgRes.data || [];
      const byStatus = {};
      msgs.forEach(m => { byStatus[m.status] = (byStatus[m.status] || 0) + 1; });

      const templates = tRes.data || [];
      const tByStatus = {};
      templates.forEach(t => { tByStatus[t.status] = (tByStatus[t.status] || 0) + 1; });

      const campaigns = cRes.data || [];
      const totalSent = campaigns.reduce((s, c) => s + c.sentCount, 0);
      const totalDelivered = campaigns.reduce((s, c) => s + c.deliveredCount, 0);
      const totalFailed = campaigns.reduce((s, c) => s + c.failedCount, 0);

      setData({ msgs, byStatus, templates, tByStatus, campaigns, totalSent, totalDelivered, totalFailed });
    } catch (e) { console.warn(e); }
    finally { setLoading(false); }
  }

  if (loading) return <div className="page flex items-center justify-center h-64"><div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: META_BLUE, borderTopColor: "transparent" }} /></div>;

  const { msgs = [], byStatus = {}, templates = [], tByStatus = {}, campaigns = [], totalSent, totalDelivered, totalFailed } = data || {};
  const total = msgs.length || 1;
  const deliveryRate = total > 1 ? (((byStatus.delivered || 0) + (byStatus.read || 0)) / total * 100).toFixed(1) : "0.0";
  const readRate = total > 1 ? ((byStatus.read || 0) / total * 100).toFixed(1) : "0.0";

  return (
    <div className="page space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Analytics</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Message delivery and engagement metrics</p>
        </div>
        <button onClick={fetchAll} className="btn-secondary btn-sm flex items-center gap-2">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Total Messages", value: msgs.length },
          { label: "Delivery Rate", value: `${deliveryRate}%` },
          { label: "Read Rate", value: `${readRate}%` },
          { label: "Failed", value: byStatus.failed || 0 },
        ].map(({ label, value }) => (
          <div key={label} className="card p-5">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Delivery funnel */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Delivery Funnel</h2>
          {[
            { label: "Sent", count: byStatus.sent || 0, color: "#1877F2" },
            { label: "Delivered", count: (byStatus.delivered || 0) + (byStatus.read || 0), color: "#10b981" },
            { label: "Read", count: byStatus.read || 0, color: "#8b5cf6" },
            { label: "Failed", count: byStatus.failed || 0, color: "#ef4444" },
          ].map(({ label, count, color }) => (
            <div key={label} className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500">{label}</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{count}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-2 rounded-full" style={{ width: `${Math.min((count / total) * 100, 100)}%`, background: color }} />
              </div>
            </div>
          ))}
        </div>

        {/* Template status */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Templates by Status</h2>
          {Object.entries(tByStatus).map(([status, count]) => (
            <div key={status} className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-800 last:border-0">
              <span className="text-xs text-slate-500">{status}</span>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{count}</span>
            </div>
          ))}
          {Object.keys(tByStatus).length === 0 && <p className="text-sm text-slate-400 text-center py-4">No templates</p>}
        </div>
      </div>

      {/* Campaigns */}
      {campaigns.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Campaign Performance</h2>
          </div>
          <div className="table-container rounded-none border-0">
            <table className="table">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Total</th>
                  <th>Sent</th>
                  <th>Delivered</th>
                  <th>Failed</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map(c => (
                  <tr key={c._id}>
                    <td className="font-medium text-slate-800 dark:text-slate-200">{c.name}</td>
                    <td>{c.totalCount}</td>
                    <td>{c.sentCount}</td>
                    <td className="text-emerald-600">{c.deliveredCount}</td>
                    <td className="text-red-500">{c.failedCount}</td>
                    <td><span className={`badge ${c.status === "completed" ? "badge-green" : c.status === "running" ? "badge-blue" : "badge-slate"}`}>{c.status}</span></td>
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
