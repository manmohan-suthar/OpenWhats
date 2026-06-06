import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Loader,
  RefreshCw,
  Search,
  Smartphone,
  Upload,
  Users,
} from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import Modal from "../../components/ui/Modal";
import api from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";

const FORMAT_OPTIONS = [
  {
    id: "csv",
    label: "CSV",
    icon: FileSpreadsheet,
    description: "Spreadsheet contacts",
    columns: "Name, Phone Number, Role",
    iconClass:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
    hoverClass:
      "hover:border-emerald-300 hover:bg-emerald-50/70 dark:hover:border-emerald-800 dark:hover:bg-emerald-900/10",
  },
  {
    id: "doc",
    label: "DOC",
    icon: FileText,
    description: "Branded document",
    columns: "Name, Phone Number, Role",
    iconClass:
      "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    hoverClass:
      "hover:border-blue-300 hover:bg-blue-50/70 dark:hover:border-blue-800 dark:hover:bg-blue-900/10",
  },
  {
    id: "pdf",
    label: "PDF",
    icon: FileText,
    description: "Branded PDF",
    columns: "Name, Phone Number, Role",
    iconClass:
      "bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400",
    hoverClass:
      "hover:border-violet-300 hover:bg-violet-50/70 dark:hover:border-violet-800 dark:hover:bg-violet-900/10",
  },
];

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function Groups() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [groups, setGroups] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [downloadGroup, setDownloadGroup] = useState(null);
  const [downloadingFormat, setDownloadingFormat] = useState("");
  const [importingGroup, setImportingGroup] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    loadSessions();
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (selectedSession) {
      loadGroups(selectedSession);
    } else {
      setGroups([]);
    }
  }, [selectedSession]);

  const selectedSessionInfo = sessions.find(
    (session) => session.sessionId === selectedSession,
  );

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;

    return groups.filter((group) => {
      return (
        String(group.subject || group.name || "").toLowerCase().includes(q) ||
        String(group.jid || "").toLowerCase().includes(q)
      );
    });
  }, [groups, search]);

  const totalParticipants = groups.reduce(
    (sum, group) => sum + Number(group.participantsCount || 0),
    0,
  );

  async function loadSessions() {
    try {
      setError("");
      setLoadingSessions(true);
      const data = await api.getSessions();
      const connected = (Array.isArray(data.data) ? data.data : []).filter(
        (session) => session.status === "connected",
      );
      setSessions(connected);
      setSelectedSession((current) => current || connected[0]?.sessionId || "");
    } catch (err) {
      setError(err.message || "Failed to load sessions");
    } finally {
      setLoadingSessions(false);
    }
  }

  async function loadGroups(sessionId = selectedSession) {
    if (!sessionId) return;

    try {
      setError("");
      setLoadingGroups(true);
      const data = await api.getSessionGroups(sessionId);
      if (data.success === false) {
        throw new Error(data.error || "Failed to load groups");
      }
      setGroups(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      setGroups([]);
      setError(err.message || "Failed to load groups");
    } finally {
      setLoadingGroups(false);
    }
  }

  async function handleImport(group) {
    if (!selectedSession || !group?.jid) return;

    try {
      setError("");
      setImportingGroup(group.jid);
      const result = await api.importGroupToNumberList(
        selectedSession,
        group.jid,
        `${group.subject || group.name || "Group"} numbers`,
      );
      if (result.success === false) {
        throw new Error(result.error || "Failed to import group");
      }
      setToast({
        type: "success",
        text: `Imported ${result.list?.count || 0} phone numbers`,
      });
    } catch (err) {
      setToast({ type: "error", text: err.message || "Import failed" });
    } finally {
      setImportingGroup("");
      setTimeout(() => setToast(null), 3000);
    }
  }

  async function handleDownload(format) {
    if (!selectedSession || !downloadGroup?.jid) return;

    try {
      setError("");
      setDownloadingFormat(format);
      const result = await api.downloadGroupParticipants(
        selectedSession,
        downloadGroup.jid,
        format,
      );
      downloadBlob(result.blob, result.filename);
      setDownloadGroup(null);
    } catch (err) {
      setToast({ type: "error", text: err.message || "Download failed" });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setDownloadingFormat("");
    }
  }

  return (
    <div className="page space-y-5">
      <PageHeader
        title="WhatsApp Groups"
        subtitle={`${groups.length} groups from selected session`}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadGroups()}
            disabled={!selectedSession || loadingGroups}
            className="btn-secondary gap-2 disabled:opacity-50"
          >
            <RefreshCw
              size={15}
              className={loadingGroups ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>
      </PageHeader>

      {error && (
        <div className="card p-4 flex items-start gap-3 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <AlertCircle
            size={16}
            className="text-red-500 flex-shrink-0 mt-0.5"
          />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
              <Users size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                {groups.length}
              </p>
              <p className="text-xs text-slate-500">Groups</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <Smartphone size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                {selectedSessionInfo?.phoneNumber || "No session"}
              </p>
              <p className="text-xs text-slate-500">
                {selectedSessionInfo?.name || "Selected number"}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
              <Upload size={18} className="text-violet-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                {totalParticipants.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500">Participants</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-4 flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
            WhatsApp Session
          </label>
          {loadingSessions ? (
            <div className="flex items-center gap-2 py-2">
              <Loader size={15} className="animate-spin text-primary-500" />
              <span className="text-xs text-slate-400">Loading sessions...</span>
            </div>
          ) : (
            <select
              value={selectedSession}
              onChange={(event) => setSelectedSession(event.target.value)}
              className="input"
            >
              <option value="">Select a connected session...</option>
              {sessions.map((session) => (
                <option key={session.sessionId} value={session.sessionId}>
                  {session.name} - {session.phoneNumber || session.sessionId}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="relative flex-1">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
            Search
          </label>
          <Search
            size={15}
            className="absolute left-3 bottom-2.5 text-slate-400"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search group name or JID"
            className="input pl-9"
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="table-container border-none rounded-none">
          {loadingGroups ? (
            <div className="flex items-center justify-center py-14">
              <Loader size={24} className="animate-spin text-primary-500" />
              <span className="ml-3 text-sm text-slate-500">
                Loading groups...
              </span>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="py-14 text-center">
              <Users size={28} className="mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                No groups found
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Select a connected session or refresh group sync.
              </p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Group</th>
                  <th className="hidden md:table-cell">Participants</th>
                  <th className="hidden lg:table-cell">JID</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900">
                {filteredGroups.map((group) => (
                  <tr key={group.jid}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0">
                          <Users size={16} className="text-emerald-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {group.subject || group.name || "Unnamed group"}
                          </p>
                          <p className="text-[11px] text-slate-400 md:hidden">
                            {group.participantsCount || 0} participants
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell">
                      <span className="badge-blue">
                        {group.participantsCount || 0}
                      </span>
                    </td>
                    <td className="hidden lg:table-cell">
                      <code className="text-[11px] text-slate-500">
                        {group.jid}
                      </code>
                    </td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleImport(group)}
                          disabled={importingGroup === group.jid}
                          className="btn-secondary btn-sm gap-1.5 disabled:opacity-50"
                        >
                          {importingGroup === group.jid ? (
                            <Loader size={13} className="animate-spin" />
                          ) : (
                            <Upload size={13} />
                          )}
                          Import to List
                        </button>
                        <button
                          onClick={() => setDownloadGroup(group)}
                          className="btn-primary btn-sm gap-1.5"
                        >
                          <Download size={13} />
                          Download
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal
        open={!!downloadGroup}
        onClose={() => setDownloadGroup(null)}
        title="Download Participants"
        size="md"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              {downloadGroup?.subject || downloadGroup?.name}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {FORMAT_OPTIONS.map(
              ({ id, label, icon: Icon, iconClass, hoverClass }) => (
              <button
                key={id}
                onClick={() => handleDownload(id)}
                disabled={!!downloadingFormat}
                className={`p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-center transition-all disabled:opacity-50 disabled:cursor-not-allowed ${hoverClass}`}
              >
                <div
                  className={`w-10 h-10 rounded-lg mx-auto flex items-center justify-center mb-2 ${iconClass}`}
                >
                  {downloadingFormat === id ? (
                    <Loader size={17} className="animate-spin" />
                    ) : (
                    <Icon size={17} />
                    )}
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {label}
                </p>
              </button>
              ),
            )}
          </div>
        </div>
      </Modal>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50">
          <div
            className={`px-5 py-4 rounded-xl shadow-2xl flex items-center gap-3 min-w-[300px] text-white ${
              toast.type === "success"
                ? "bg-gradient-to-r from-emerald-500 to-emerald-600"
                : "bg-gradient-to-r from-red-500 to-red-600"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 size={18} />
            ) : (
              <AlertCircle size={18} />
            )}
            <p className="text-sm font-semibold">{toast.text}</p>
          </div>
        </div>
      )}
    </div>
  );
}
