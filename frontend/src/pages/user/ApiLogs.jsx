import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Search,
  Send,
  XCircle,
} from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import Modal from "../../components/ui/Modal";
import { ApiBarChart } from "../../components/ui/ActivityChart";
import { authFetch } from "../../services/authFetch";

const STATUS_BADGE = {
  delivered: "badge-green",
  read: "badge-green",
  sent: "badge-blue",
  pending: "badge-yellow",
  failed: "badge-red",
};

const SOURCE_BADGE = {
  api: "badge-blue",
  ui: "badge-green",
  campaign: "badge-violet",
};

const SOURCE_LABEL = {
  all: "All",
  api: "API",
  ui: "UI",
  campaign: "Campaign",
};

const STATUS_ICON = {
  delivered: <CheckCircle2 size={13} className="text-emerald-500" />,
  read: <CheckCircle2 size={13} className="text-blue-500" />,
  sent: <Send size={13} className="text-blue-500" />,
  pending: <Clock size={13} className="text-amber-500" />,
  failed: <XCircle size={13} className="text-red-500" />,
};

function fmtDt(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ApiLogs() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({});
  const [chart, setChart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const json = await authFetch(
        `/api/analytics/api-logs?days=${days}&status=${statusFilter}&source=${sourceFilter}&search=${encodeURIComponent(debouncedSearch)}&page=${page}&limit=20`,
      );
      console.debug && console.debug("/api/analytics/api-logs response:", json);
      if (!json.success) {
        throw new Error(json.error || "Failed to load message logs");
      }

      // Support both `json.data` and older/alternate shapes where values
      // might be at the root level. Log above to help debug API shape.
      const payload = json.data || json || {};
      setLogs(payload.logs || []);
      setStats(payload.stats || {});
      setChart(payload.dailyChart || payload.chart || []);
      setTotal(payload.total || json.total || 0);
      setPages(payload.pages || json.pages || 1);
    } catch (error) {
      setLogs([]);
      setStats({});
      setChart([]);
      setTotal(0);
      setPages(1);
      console.error("Failed to load message logs:", error);
    } finally {
      setLoading(false);
    }
  }, [days, statusFilter, sourceFilter, debouncedSearch, page]);

  useEffect(() => {
    load();
  }, [load]);

  const totalRequests = stats.total || 0;
  const successRate = stats.successRate || 0;
  const totalFailed = stats.failed || 0;
  const totalDelivered = stats.delivered || 0;
  const apiSessions = stats.apiSessions || 0;
  const sourceBreakdown = stats.sourceBreakdown || {};
  const sourceItems = [
    {
      key: "all",
      label: "All logs",
      value: totalRequests,
      tone: "bg-slate-500",
    },
    {
      key: "api",
      label: "API",
      value: sourceBreakdown.api || 0,
      tone: "bg-blue-500",
    },
    {
      key: "ui",
      label: "UI",
      value: sourceBreakdown.ui || 0,
      tone: "bg-emerald-500",
    },
    {
      key: "campaign",
      label: "Campaign",
      value: sourceBreakdown.campaign || 0,
      tone: "bg-violet-500",
    },
  ];
  const maxSourceValue = Math.max(...sourceItems.map((item) => item.value), 1);

  return (
    <div className="page space-y-5">
      <PageHeader
        title="Message Logs"
        subtitle="Track API, UI, and campaign message sends with delivery states and failures in one place."
      >
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <select
            className="input py-1.5 px-3 text-xs w-auto"
            value={days}
            onChange={(e) => {
              setDays(Number(e.target.value));
              setPage(1);
            }}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            onClick={load}
            disabled={loading}
            className="btn-secondary gap-2 text-xs py-1.5"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today Sent"
          value={loading ? "—" : String(stats.todaySent || 0)}
          icon={Send}
          iconColor="text-[#00a884]"
          iconBg="bg-emerald-50 dark:bg-emerald-900/20"
          subtitle="messages completed today"
        />
        <StatCard
          title="Today Failed"
          value={loading ? "—" : String(stats.todayFailed || 0)}
          icon={XCircle}
          iconColor="text-red-500"
          iconBg="bg-red-50 dark:bg-red-900/20"
          subtitle="errors from message sends"
        />
        <StatCard
          title="Success Rate"
          value={loading ? "—" : `${successRate}%`}
          icon={CheckCircle2}
          iconColor="text-blue-600"
          iconBg="bg-blue-50 dark:bg-blue-900/20"
          subtitle={`${totalDelivered} delivered`}
        />
        <StatCard
          title="Visible Logs"
          value={loading ? "—" : String(totalRequests)}
          icon={Activity}
          iconColor="text-violet-600"
          iconBg="bg-violet-50 dark:bg-violet-900/20"
          subtitle={`${apiSessions} sessions used`}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2 overflow-hidden relative">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#00a884] via-emerald-400 to-cyan-400" />
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <p className="section-title text-base mb-1">Message Activity</p>
              <p className="section-subtitle text-xs">
                Daily message sends and failed sends for the selected range.
              </p>
            </div>
            <span className="badge badge-green whitespace-nowrap">
              <MessageSquareText size={12} className="mr-1" />
              Live log feed
            </span>
          </div>
          {loading ? (
            <div className="h-44 flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-[#00a884]" />
            </div>
          ) : chart.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Activity size={22} className="opacity-40" />
              <p className="text-xs">No API traffic found for this period.</p>
            </div>
          ) : (
            <ApiBarChart data={chart} />
          )}
        </div>

        <div className="card p-5 overflow-hidden">
          <p className="section-title text-base mb-1">Log Breakdown</p>
          <p className="section-subtitle text-xs mb-4">
            Current message health by source
          </p>
          <div className="space-y-3">
            {sourceItems.map((item) => (
              <div
                key={item.key}
                className="rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3 py-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {item.label}
                  </span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-white">
                    {String(item.value)}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.tone}`}
                    style={{ width: `${(item.value / maxSourceValue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(SOURCE_LABEL).map(([key, label]) => (
              <button
                key={key}
                onClick={() => {
                  setSourceFilter(key);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                  sourceFilter === key
                    ? "bg-[#00a884] text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 px-3 py-3 text-xs text-slate-500 dark:text-slate-400">
            Use search to find a phone number, contact name, source, or message
            text.
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              className="input pl-9 py-1.5 text-sm"
              placeholder="Search phone, contact, or message…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {["all", "sent", "delivered", "failed", "pending"].map((status) => (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(status);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                  statusFilter === status
                    ? "bg-[#00a884] text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="table-container border-none rounded-none">
          <table className="table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Recipient</th>
                <th className="hidden md:table-cell">Message</th>
                <th className="hidden sm:table-cell">Session</th>
                <th className="hidden md:table-cell">Time</th>
                <th className="hidden lg:table-cell">Source</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <Loader2
                      size={24}
                      className="animate-spin text-[#00a884] mx-auto"
                    />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-12 text-sm text-slate-400"
                  >
                    No message logs match your filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={String(log._id)}>
                    <td>
                      <div className="flex items-center gap-1.5">
                        {STATUS_ICON[log.status] || STATUS_ICON.pending}
                        <span
                          className={`badge ${STATUS_BADGE[log.status] || "badge-slate"}`}
                        >
                          {log.status}
                        </span>
                      </div>
                    </td>
                    <td className="text-xs font-mono text-slate-600 dark:text-slate-400 max-w-[240px]">
                      {log.phoneNumber}
                      {log.contactName && (
                        <span className="ml-1 text-slate-400 font-sans">
                          ({log.contactName})
                        </span>
                      )}
                    </td>
                    <td className="hidden md:table-cell max-w-[320px]">
                      <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                        {log.message || "—"}
                      </p>
                    </td>
                    <td className="hidden sm:table-cell">
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                          {log.session?.name || "—"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {log.session?.phoneNumber ||
                            log.session?.sessionId ||
                            ""}
                        </span>
                      </div>
                    </td>
                    <td className="hidden md:table-cell text-xs text-slate-500 whitespace-nowrap">
                      {fmtDt(log.sentAt || log.createdAt)}
                    </td>
                    <td className="hidden lg:table-cell">
                      <span
                        className={`badge ${SOURCE_BADGE[log.source] || "badge-slate"} capitalize`}
                      >
                        {log.source || "api"}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => setDetail(log)}
                        className="btn-ghost btn-sm p-1.5"
                      >
                        <Activity size={13} className="text-slate-400" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing {logs.length} of {total} message logs
          </span>
          {pages > 1 && (
            <div className="flex gap-1">
              {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map(
                (p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-7 h-7 rounded-md text-xs ${
                      p === page
                        ? "bg-[#00a884] text-white"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {p}
                  </button>
                ),
              )}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title="Message Log Detail"
        size="sm"
        footer={
          <button
            onClick={() => setDetail(null)}
            className="btn-primary btn-sm"
          >
            Close
          </button>
        }
      >
        {detail && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {STATUS_ICON[detail.status] || STATUS_ICON.pending}
              <span
                className={`badge ${STATUS_BADGE[detail.status] || "badge-slate"}`}
              >
                {detail.status}
              </span>
              <span
                className={`badge ${SOURCE_BADGE[detail.source] || "badge-slate"} capitalize`}
              >
                {detail.source || "api"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { k: "Recipient", v: detail.phoneNumber },
                { k: "Contact", v: detail.contactName || "—" },
                { k: "Session", v: detail.session?.name || "—" },
                { k: "Sent At", v: fmtDt(detail.sentAt || detail.createdAt) },
                { k: "Delivered At", v: fmtDt(detail.deliveredAt) },
                { k: "Read At", v: fmtDt(detail.readAt) },
              ].map((item) => (
                <div
                  key={item.k}
                  className={`px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 ${item.k === "Recipient" ? "col-span-2" : ""}`}
                >
                  <p className="text-[10px] text-slate-400">{item.k}</p>
                  <p className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                    {item.v}
                  </p>
                </div>
              ))}
            </div>
            <div className="px-3 py-3 rounded-lg bg-slate-50 dark:bg-slate-800">
              <p className="text-[10px] text-slate-400 mb-1">Message Content</p>
              <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {detail.message}
              </p>
            </div>
            {detail.error && (
              <div className="px-3 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40">
                <p className="text-[10px] text-red-400 mb-1 flex items-center gap-1">
                  <AlertCircle size={11} />
                  Error
                </p>
                <p className="text-xs text-red-600 dark:text-red-400">
                  {detail.error}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
