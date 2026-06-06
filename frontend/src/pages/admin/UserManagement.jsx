import { useState, useEffect, useCallback } from "react";
import {
  Search, Plus, MoreVertical, UserX, Edit2, Loader2,
  RefreshCw, Users, UserCheck, UserMinus, Crown, Sparkles,
} from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import Modal from "../../components/ui/Modal";
import StatCard from "../../components/ui/StatCard";
import { authFetch } from "../../services/authFetch";

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_BADGE = { active: "badge-green", inactive: "badge-slate", suspended: "badge-red" };
const ROLE_BADGE   = { admin: "badge-red", superadmin: "badge-red", user: "badge-slate" };

function UserMenu({ user, onEdit, onSuspend, onDelete }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="btn-ghost btn-sm p-1.5 rounded-lg">
        <MoreVertical size={15} className="text-slate-400" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-dropdown z-20 py-1 animate-fade-in">
          <button
            onClick={() => { onEdit(user); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Edit2 size={13} /> Edit User
          </button>
          <button
            onClick={() => { onSuspend(user); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <UserX size={13} /> {user.status === "suspended" ? "Reactivate" : "Suspend"}
          </button>
          <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
          <button
            onClick={() => { onDelete(user); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <UserX size={13} /> Delete User
          </button>
        </div>
      )}
    </div>
  );
}

export default function UserManagement() {
  const [users, setUsers]       = useState([]);
  const [total, setTotal]       = useState(0);
  const [summary, setSummary]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage]         = useState(1);
  const [editUser, setEditUser] = useState(null);
  const [showAdd, setShowAdd]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [newUser, setNewUser]   = useState({ name: "", email: "", password: "", role: "user" });
  const [editForm, setEditForm] = useState({});

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/admin/users?search=${encodeURIComponent(debouncedSearch)}&page=${page}&limit=20`);
      if (res.success) {
        setUsers(res.data.users);
        setTotal(res.data.total);
        if (res.data.summary) setSummary(res.data.summary);
      }
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleSuspend = async (user) => {
    const newStatus = user.status === "suspended" ? "active" : "suspended";
    await authFetch(`/api/admin/users/${user._id}`, { method: "PUT", body: { status: newStatus } });
    setUsers((prev) => prev.map((u) => u._id === user._id ? { ...u, status: newStatus } : u));
  };

  const handleDelete = async (user) => {
    if (!confirm(`Delete ${user.name || user.email}? This cannot be undone.`)) return;
    const res = await authFetch(`/api/admin/users/${user._id}`, { method: "DELETE" });
    if (res.success) setUsers((prev) => prev.filter((u) => u._id !== user._id));
  };

  const handleEdit = (user) => {
    setEditUser(user);
    setEditForm({ name: user.name || "", email: user.email || "", role: user.role || "user" });
    setError("");
  };

  const saveEdit = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await authFetch(`/api/admin/users/${editUser._id}`, { method: "PUT", body: editForm });
      if (res.success) {
        setUsers((prev) => prev.map((u) => u._id === editUser._id ? { ...u, ...res.data } : u));
        setEditUser(null);
      } else {
        setError(res.error || "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      return setError("All fields are required");
    }
    setSaving(true);
    setError("");
    try {
      const res = await authFetch("/api/admin/users", { method: "POST", body: newUser });
      if (res.success) {
        setShowAdd(false);
        setNewUser({ name: "", email: "", password: "", role: "user" });
        loadUsers();
      } else {
        setError(res.error || "Failed to create user");
      }
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="page space-y-5">
      <PageHeader title="User Management" subtitle={`${total} total users`}>
        <div className="flex items-center gap-2">
          <button onClick={loadUsers} disabled={loading} className="btn-secondary btn-sm gap-1.5">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={() => { setShowAdd(true); setError(""); }} className="btn-primary gap-2">
            <Plus size={15} /> Add User
          </button>
        </div>
      </PageHeader>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={loading && !summary ? "—" : (summary?.total ?? total).toLocaleString()}
          icon={Users}
          iconColor="text-blue-600"
          iconBg="bg-blue-50 dark:bg-blue-900/20"
          subtitle={`${summary?.newThisWeek ?? 0} new this week`}
        />
        <StatCard
          title="Active Users"
          value={loading && !summary ? "—" : (summary?.active ?? 0).toLocaleString()}
          icon={UserCheck}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50 dark:bg-emerald-900/20"
          subtitle="not suspended"
        />
        <StatCard
          title="Suspended"
          value={loading && !summary ? "—" : (summary?.suspended ?? 0).toLocaleString()}
          icon={UserMinus}
          iconColor="text-red-500"
          iconBg="bg-red-50 dark:bg-red-900/20"
        />
        <StatCard
          title="New This Week"
          value={loading && !summary ? "—" : (summary?.newThisWeek ?? 0).toLocaleString()}
          icon={Sparkles}
          iconColor="text-violet-600"
          iconBg="bg-violet-50 dark:bg-violet-900/20"
          subtitle="registered users"
        />
      </div>

      {/* Plan distribution cards */}
      {summary?.planDistribution?.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Crown size={14} className="text-amber-500" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Users by Plan</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {summary.planDistribution.map((p) => {
              const name = p._id || "No Plan";
              const pct = summary.total > 0 ? Math.round((p.count / summary.total) * 100) : 0;
              return (
                <div
                  key={name}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{name}</span>
                    <span className="text-[10px] text-slate-400">{pct}% of users</span>
                  </div>
                  <span className="ml-1 text-sm font-bold text-[#00a884]">{p.count}</span>
                </div>
              );
            })}
            {/* Users with no subscription */}
            {(() => {
              const withPlan = summary.planDistribution.reduce((s, p) => s + p.count, 0);
              const noPlan = (summary.total || 0) - withPlan;
              if (noPlan <= 0) return null;
              return (
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">No Plan</span>
                    <span className="text-[10px] text-slate-400">{Math.round((noPlan / summary.total) * 100)}% of users</span>
                  </div>
                  <span className="ml-1 text-sm font-bold text-slate-400">{noPlan}</span>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9 py-2 text-sm"
            placeholder="Search users…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>User</th>
              <th className="hidden sm:table-cell">Plan</th>
              <th>Status</th>
              <th className="hidden md:table-cell">Role</th>
              <th className="hidden lg:table-cell">Sessions</th>
              <th className="hidden lg:table-cell">Messages</th>
              <th className="hidden xl:table-cell">Joined</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-900">
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-12">
                  <Loader2 size={24} className="animate-spin text-[#00a884] mx-auto" />
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-sm text-slate-400">
                  <Users size={24} className="mx-auto mb-2 opacity-30" />
                  No users found
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const planName = u.subscription?.planId?.name || "—";
                const status = u.status || "active";
                return (
                  <tr key={String(u._id)}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-bold">{(u.name || u.email || "?")[0].toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{u.name || "—"}</p>
                          <p className="text-[10px] text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell">
                      <span className="badge badge-blue">{planName}</span>
                    </td>
                    <td>
                      <span className={STATUS_BADGE[status] || "badge-slate"}>{status}</span>
                    </td>
                    <td className="hidden md:table-cell">
                      <span className={ROLE_BADGE[u.role] || "badge-slate"}>{u.role}</span>
                    </td>
                    <td className="hidden lg:table-cell text-xs font-medium text-slate-700 dark:text-slate-300">{u.sessions ?? 0}</td>
                    <td className="hidden lg:table-cell text-xs font-medium text-slate-700 dark:text-slate-300">{(u.msgs ?? 0).toLocaleString()}</td>
                    <td className="hidden xl:table-cell text-xs text-slate-500">{fmtDate(u.createdAt)}</td>
                    <td>
                      <UserMenu
                        user={{ ...u, status }}
                        onEdit={handleEdit}
                        onSuspend={handleSuspend}
                        onDelete={handleDelete}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Page {page} of {totalPages} — {total} users</span>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-7 h-7 rounded-md text-xs font-medium transition-colors ${
                  p === page ? "bg-[#00a884] text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >{p}</button>
            ))}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <Modal
        open={!!editUser}
        onClose={() => setEditUser(null)}
        title="Edit User"
        footer={
          <>
            <button onClick={() => setEditUser(null)} className="btn-secondary btn-sm">Cancel</button>
            <button onClick={saveEdit} disabled={saving} className="btn-primary btn-sm gap-1.5">
              {saving && <Loader2 size={13} className="animate-spin" />} Save Changes
            </button>
          </>
        }
      >
        {editUser && (
          <div className="space-y-4">
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Full Name</label>
              <input className="input" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
              <input className="input" type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Role</label>
              <select className="input" value={editForm.role} onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Super Admin</option>
              </select>
            </div>
          </div>
        )}
      </Modal>

      {/* Add User Modal */}
      <Modal
        open={showAdd}
        onClose={() => { setShowAdd(false); setError(""); }}
        title="Add New User"
        footer={
          <>
            <button onClick={() => { setShowAdd(false); setError(""); }} className="btn-secondary btn-sm">Cancel</button>
            <button onClick={handleAddUser} disabled={saving} className="btn-primary btn-sm gap-1.5">
              {saving && <Loader2 size={13} className="animate-spin" />} Create User
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Full Name</label>
            <input
              className="input"
              placeholder="John Doe"
              value={newUser.name}
              onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
            <input
              className="input"
              type="email"
              placeholder="john@company.com"
              value={newUser.email}
              onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Role</label>
              <select className="input" value={newUser.role} onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
            <input
              className="input"
              type="password"
              placeholder="Min. 6 characters"
              value={newUser.password}
              onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
