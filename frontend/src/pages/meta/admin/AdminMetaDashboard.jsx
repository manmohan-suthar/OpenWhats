import { useState, useEffect } from "react";
import { Users, Building2, MessageSquare, FileText, TrendingUp, Megaphone } from "lucide-react";
import { adminGetAnalytics } from "../../../services/metaApi.js";

const META_BLUE = "#1877F2";

export default function AdminMetaDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminGetAnalytics()
      .then(r => setData(r.data))
      .catch(console.warn)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page flex items-center justify-center h-64"><div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: META_BLUE, borderTopColor: "transparent" }} /></div>;

  const stats = data ? [
    { label: "Connected Users", value: data.totalUsers, icon: Users, color: META_BLUE, bg: "rgba(24,119,242,0.08)" },
    { label: "Active WABAs", value: data.activeWABAs, sub: `${data.totalWABAs} total`, icon: Building2, color: "#10b981", bg: "rgba(16,185,129,0.08)" },
    { label: "Total Messages", value: data.totalMessages?.toLocaleString(), icon: MessageSquare, color: "#8b5cf6", bg: "rgba(139,92,246,0.08)" },
    { label: "Approved Templates", value: data.approvedTemplates, sub: `${data.pendingTemplates} pending`, icon: FileText, color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
    { label: "Total Campaigns", value: data.totalCampaigns, icon: Megaphone, color: "#ef4444", bg: "rgba(239,68,68,0.08)" },
  ] : [];

  const msgStatus = data?.messagesByStatus || {};

  return (
    <div className="page space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Meta Admin Overview</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">System-wide Meta Business API analytics</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        {stats.map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className="card p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
                {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
              </div>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                <Icon size={18} style={{ color }} strokeWidth={1.8} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Message delivery stats */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Message Status Breakdown</h2>
            <div className="space-y-3">
              {[
                { label: "Sent", key: "sent", color: "#1877F2" },
                { label: "Delivered", key: "delivered", color: "#10b981" },
                { label: "Read", key: "read", color: "#8b5cf6" },
                { label: "Failed", key: "failed", color: "#ef4444" },
              ].map(({ label, key, color }) => {
                const val = msgStatus[key] || 0;
                const total = data.totalMessages || 1;
                return (
                  <div key={key}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">{label}</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{val}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="h-1.5 rounded-full" style={{ width: `${Math.min((val / total) * 100, 100)}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card p-5">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Template Overview</h2>
            <div className="space-y-3">
              {[
                { label: "Total Templates", value: data.totalTemplates, color: "#1877F2" },
                { label: "Approved", value: data.approvedTemplates, color: "#10b981" },
                { label: "Pending Review", value: data.pendingTemplates, color: "#f59e0b" },
                { label: "Rejected", value: data.totalTemplates - data.approvedTemplates - data.pendingTemplates, color: "#ef4444" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                    <span className="text-xs text-slate-500">{label}</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
