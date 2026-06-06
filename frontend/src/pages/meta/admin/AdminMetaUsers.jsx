import { useState, useEffect } from "react";
import { Search, CheckCircle, XCircle } from "lucide-react";
import { adminGetUsers } from "../../../services/metaApi.js";

export default function AdminMetaUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    adminGetUsers()
      .then(r => setUsers(r.data || []))
      .catch(console.warn)
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter(u =>
    !search ||
    u.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.facebookName?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="page flex items-center justify-center h-64"><div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "#1877F2", borderTopColor: "transparent" }} /></div>;

  return (
    <div className="page space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Meta Users</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          All users with Meta / Facebook connections ({filtered.length})
        </p>
      </div>

      <input type="text" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search by name or email…" className="input max-w-xs" />

      <div className="card overflow-hidden">
        <div className="table-container rounded-none border-0">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Facebook Account</th>
                <th>Connected</th>
                <th>Token Expires</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center text-slate-400 py-8">No users found</td></tr>
              )}
              {filtered.map(u => (
                <tr key={u._id}>
                  <td>
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-200">{u.user?.name || "—"}</p>
                      <p className="text-xs text-slate-400">{u.user?.email}</p>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      {u.facebookPicture && <img src={u.facebookPicture} alt="" className="w-6 h-6 rounded-full" />}
                      <div>
                        <p className="text-sm">{u.facebookName || "—"}</p>
                        <p className="text-xs text-slate-400">{u.facebookEmail}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    {u.isConnected
                      ? <span className="flex items-center gap-1 text-emerald-600"><CheckCircle size={13} /> Yes</span>
                      : <span className="flex items-center gap-1 text-slate-400"><XCircle size={13} /> No</span>}
                  </td>
                  <td className="text-xs text-slate-500">
                    {u.tokenExpiresAt ? new Date(u.tokenExpiresAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="text-xs text-slate-400">
                    {new Date(u.createdAt).toLocaleDateString()}
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
