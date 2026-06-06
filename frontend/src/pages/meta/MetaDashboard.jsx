import { useState, useEffect } from "react";
import { MessageSquare, CheckCircle, TrendingUp, Layers, RefreshCw, Phone, FileText, Megaphone } from "lucide-react";
import { getMetaStatus, getTemplates, getMessages, getCampaigns } from "../../services/metaApi.js";
import { authFetch } from "../../services/authFetch.js";

const META_BLUE = "#1877F2";

export default function MetaDashboard() {
  const [status, setStatus] = useState(null);
  const [stats, setStats] = useState({ templates: 0, approvedTemplates: 0, messages: 0, campaigns: 0, numbers: 0, wabas: 0 });
  const [recentTemplates, setRecentTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [fbStatus, tRes, msgRes, cRes, bRes, nRes] = await Promise.all([
        getMetaStatus(),
        getTemplates(),
        getMessages({ limit: 5 }),
        getCampaigns(),
        authFetch("/api/meta/business"),
        authFetch("/api/meta/numbers"),
      ]);
      setStatus(fbStatus);
      const templates = tRes.data || [];
      const messages = msgRes.data || [];
      const campaigns = cRes.data || [];
      setStats({
        templates: templates.length,
        approvedTemplates: templates.filter(t => t.status === "APPROVED").length,
        messages: messages.length,
        campaigns: campaigns.length,
        numbers: (nRes.data || []).length,
        wabas: (bRes.data || []).length,
      });
      setRecentTemplates(templates.slice(0, 5));
    } catch (e) { console.warn(e); }
    finally { setLoading(false); }
  }

  const cards = [
    { label: "Connected WABAs", value: stats.wabas, icon: Layers, color: META_BLUE, bg: "rgba(24,119,242,0.08)" },
    { label: "Phone Numbers", value: stats.numbers, icon: Phone, color: "#10b981", bg: "rgba(16,185,129,0.08)" },
    { label: "Approved Templates", value: stats.approvedTemplates, icon: CheckCircle, color: "#8b5cf6", bg: "rgba(139,92,246,0.08)" },
    { label: "Campaigns", value: stats.campaigns, icon: Megaphone, color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
  ];

  const statusBadge = { APPROVED: "badge-green", PENDING: "badge-yellow", REJECTED: "badge-red", DRAFT: "badge-slate" };

  if (loading) return (
    <div className="page flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: META_BLUE, borderTopColor: "transparent" }} />
    </div>
  );

  return (
    <div className="page space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Meta Business Overview</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            WhatsApp Cloud API — your account at a glance
          </p>
        </div>
        <button onClick={fetchAll} className="btn-secondary btn-sm flex items-center gap-2">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Facebook connection status */}
      {status && (
        <div
          className="rounded-xl p-4 flex items-center justify-between gap-3 border"
          style={status.connected
            ? { background: "rgba(24,119,242,0.05)", borderColor: "rgba(24,119,242,0.15)" }
            : { background: "rgba(245,158,11,0.05)", borderColor: "rgba(245,158,11,0.2)" }}
        >
          <div className="flex items-center gap-3">
            {status.facebookPicture && (
              <img src={status.facebookPicture} alt="" className="w-9 h-9 rounded-full" />
            )}
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {status.connected ? `Connected as ${status.facebookName}` : "Facebook not connected"}
              </p>
              <p className="text-xs text-slate-400">
                {status.connected ? status.facebookEmail : "Go to Connect to link your Facebook account"}
              </p>
            </div>
          </div>
          <span className={`badge ${status.connected ? "badge-green" : "badge-yellow"}`}>
            {status.connected ? "Connected" : "Not Connected"}
          </span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                <Icon size={20} style={{ color }} strokeWidth={1.8} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent templates */}
      {recentTemplates.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Recent Templates</h2>
            <span className="badge badge-slate">{stats.templates} total</span>
          </div>
          <div className="table-container rounded-none border-0">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Language</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTemplates.map(t => (
                  <tr key={t._id}>
                    <td className="font-medium text-slate-800 dark:text-slate-200">{t.name}</td>
                    <td><span className="badge badge-blue text-[10px]">{t.category}</span></td>
                    <td className="text-xs text-slate-400 uppercase">{t.language}</td>
                    <td><span className={`badge ${statusBadge[t.status] || "badge-slate"}`}>{t.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!status?.connected && (
        <div className="card p-6 text-center border-dashed">
          <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(24,119,242,0.1)" }}>
            <svg width="22" height="22" viewBox="0 0 36 36" fill="#1877F2">
              <path d="M18 2C9.163 2 2 9.163 2 18s7.163 16 16 16 16-7.163 16-16S26.837 2 18 2zm-3 22.5v-13l10 6.5-10 6.5z" />
            </svg>
          </div>
          <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Get started with Meta</p>
          <p className="text-sm text-slate-400 mb-4">Connect your Facebook account to access WhatsApp Business API</p>
          <a href="/meta/connect" className="btn btn-sm text-white px-5 inline-flex items-center gap-2" style={{ background: META_BLUE }}>
            Connect Now
          </a>
        </div>
      )}
    </div>
  );
}
