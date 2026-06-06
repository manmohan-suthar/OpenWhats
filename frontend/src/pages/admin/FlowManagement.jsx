import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  GitBranch, Search, Trash2, Eye, RefreshCw,
  Loader2, CheckCircle2, Clock, Archive, Users,
  Smartphone, Calendar, ChevronLeft, ChevronRight,
} from "lucide-react";
import { authFetch } from "../../services/authFetch";

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "Active", label: "Active" },
  { value: "Draft", label: "Draft" },
  { value: "Archived", label: "Archived" },
];

const statusMeta = {
  Active:   { label: "Active",    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  Draft:    { label: "Draft",     className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  Archived: { label: "Archived",  className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
};

export default function FlowManagement() {
  const navigate = useNavigate();
  const [flows, setFlows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const LIMIT = 20;
  const totalPages = Math.ceil(total / LIMIT);

  const fetchFlows = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page,
        limit: LIMIT,
        search,
        status: statusFilter === "all" ? "" : statusFilter,
      });
      const data = await authFetch(`/api/admin/flows?${params}`);
      if (!data.success) throw new Error(data.error || "Failed to load flows");
      setFlows(data.flows || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message || "Could not load flows");
    } finally {
      setIsLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchFlows(); }, [fetchFlows]);

  // Reset to page 1 when filter/search changes
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const handleDelete = async (flowId, flowName) => {
    if (!window.confirm(`Delete flow "${flowName}" permanently? This cannot be undone.`)) return;
    setDeletingId(flowId);
    try {
      const data = await authFetch(`/api/admin/flows/${flowId}`, { method: "DELETE" });
      if (!data.success) throw new Error(data.error || "Delete failed");
      setFlows((prev) => prev.filter((f) => f._id !== flowId));
      setTotal((prev) => prev - 1);
    } catch (err) {
      alert(err.message || "Failed to delete flow");
    } finally {
      setDeletingId(null);
    }
  };

  const handleStatusChange = async (flowId, newStatus) => {
    setUpdatingId(flowId);
    try {
      const data = await authFetch(`/api/admin/flows/${flowId}/status`, {
        method: "PATCH",
        body: { status: newStatus },
      });
      if (!data.success) throw new Error(data.error || "Update failed");
      setFlows((prev) => prev.map((f) => (f._id === flowId ? data.flow : f)));
    } catch (err) {
      alert(err.message || "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const stats = {
    total,
    active: flows.filter((f) => f.status === "Active").length,
    draft: flows.filter((f) => f.status === "Draft").length,
  };

  return (
    <section className="page">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <GitBranch size={22} className="text-primary-500" />
            Flow Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            View and manage all automation flows created by users
          </p>
        </div>
        <button
          onClick={fetchFlows}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Total Flows</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{total}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Active</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.active}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Draft</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{stats.draft}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by flow name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-slate-500">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Loading flows...</span>
          </div>
        ) : error ? (
          <div className="py-12 text-center text-sm text-rose-600 dark:text-rose-400">{error}</div>
        ) : flows.length === 0 ? (
          <div className="py-16 text-center">
            <GitBranch size={36} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400">No flows found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Flow</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Session</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Nodes</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Created</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {flows.map((flow) => {
                  const sm = statusMeta[flow.status] || statusMeta.Draft;
                  const isDeleting = deletingId === flow._id;
                  const isUpdating = updatingId === flow._id;
                  return (
                    <tr
                      key={flow._id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Flow name + description */}
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900 dark:text-slate-100 max-w-[200px] truncate">
                          {flow.name}
                        </p>
                        {flow.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-[200px] truncate">
                            {flow.description}
                          </p>
                        )}
                      </td>

                      {/* Owner user */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Users size={13} className="text-slate-400 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-[140px]">
                              {flow.userId?.name || "—"}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate max-w-[140px]">
                              {flow.userId?.email || ""}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Session */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Smartphone size={13} className="text-slate-400 flex-shrink-0" />
                          <div>
                            <p className="text-slate-700 dark:text-slate-200 truncate max-w-[120px]">
                              {flow.sessionId?.name || "—"}
                            </p>
                            {flow.sessionId?.phoneNumber && (
                              <p className="text-[11px] text-slate-400">
                                {flow.sessionId.phoneNumber}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Node count */}
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                          <GitBranch size={11} />
                          {Array.isArray(flow.nodes) ? flow.nodes.length : 0}
                        </span>
                      </td>

                      {/* Status badge + changer */}
                      <td className="px-4 py-3">
                        {isUpdating ? (
                          <Loader2 size={15} className="animate-spin text-slate-400" />
                        ) : (
                          <select
                            value={flow.status}
                            onChange={(e) => handleStatusChange(flow._id, e.target.value)}
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500/40 ${sm.className}`}
                          >
                            <option value="Active">Active</option>
                            <option value="Draft">Draft</option>
                            <option value="Archived">Archived</option>
                          </select>
                        )}
                      </td>

                      {/* Created date */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <Calendar size={12} />
                          {fmtDate(flow.createdAt)}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/create-flow?flowId=${flow._id}&mode=view`)}
                            title="View flow"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                          >
                            <Eye size={13} /> View
                          </button>
                          <button
                            onClick={() => handleDelete(flow._id, flow.name)}
                            disabled={isDeleting}
                            title="Delete flow"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 px-2.5 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 disabled:opacity-50 transition-colors"
                          >
                            {isDeleting
                              ? <Loader2 size={13} className="animate-spin" />
                              : <Trash2 size={13} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total} flows
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
