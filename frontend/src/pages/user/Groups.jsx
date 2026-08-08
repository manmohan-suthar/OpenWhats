import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Loader,
  Plus,
  RefreshCw,
  Search,
  Smartphone,
  Upload,
  Users,
  Check,
  X,
  List,
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

  // ── Create Group Modal state ──────────────────────────────────────────────
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createGroupName, setCreateGroupName] = useState("");
  const [createSession, setCreateSession] = useState("");
  const [numberLists, setNumberLists] = useState([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [selectedListIds, setSelectedListIds] = useState([]);
  const [participantSearch, setParticipantSearch] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState(new Set());
  const [creatingGroup, setCreatingGroup] = useState(false);

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

  // ── All unique numbers from selected number lists ─────────────────────────
  const allParticipantNumbers = useMemo(() => {
    const nums = new Set();
    for (const list of numberLists) {
      if (selectedListIds.includes(list.id)) {
        for (const num of list.numbers || []) {
          if (num) nums.add(num);
        }
      }
    }
    return [...nums];
  }, [numberLists, selectedListIds]);

  const filteredParticipants = useMemo(() => {
    const q = participantSearch.trim().toLowerCase();
    if (!q) return allParticipantNumbers;
    return allParticipantNumbers.filter((num) =>
      num.toLowerCase().includes(q),
    );
  }, [allParticipantNumbers, participantSearch]);

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

  // ── Create Group handlers ─────────────────────────────────────────────────
  function openCreateModal() {
    setShowCreateModal(true);
    setCreateGroupName("");
    setCreateSession(sessions[0]?.sessionId || "");
    setSelectedListIds([]);
    setSelectedParticipants(new Set());
    setParticipantSearch("");
    setNumberLists([]);
    loadNumberLists();
  }

  function closeCreateModal() {
    setShowCreateModal(false);
    setCreateGroupName("");
    setSelectedListIds([]);
    setSelectedParticipants(new Set());
    setParticipantSearch("");
  }

  async function loadNumberLists() {
    try {
      setLoadingLists(true);
      const data = await api.getNumberLists();
      setNumberLists(Array.isArray(data.lists) ? data.lists : []);
    } catch (err) {
      setToast({ type: "error", text: "Failed to load number lists" });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setLoadingLists(false);
    }
  }

  function toggleListSelection(listId) {
    setSelectedListIds((prev) =>
      prev.includes(listId)
        ? prev.filter((id) => id !== listId)
        : [...prev, listId],
    );
    // Clear participant selection when lists change
    setSelectedParticipants(new Set());
  }

  function toggleParticipant(number) {
    setSelectedParticipants((prev) => {
      const next = new Set(prev);
      if (next.has(number)) {
        next.delete(number);
      } else {
        next.add(number);
      }
      return next;
    });
  }

  function selectAllParticipants() {
    if (selectedParticipants.size === filteredParticipants.length) {
      setSelectedParticipants(new Set());
    } else {
      setSelectedParticipants(new Set(filteredParticipants));
    }
  }

  async function handleCreateGroup() {
    if (!createSession || !createGroupName.trim() || selectedParticipants.size === 0) return;

    try {
      setCreatingGroup(true);
      const result = await api.createWhatsAppGroup(
        createSession,
        createGroupName.trim(),
        [...selectedParticipants],
      );

      if (result.success === false) {
        throw new Error(result.error || "Failed to create group");
      }

      setToast({
        type: "success",
        text: `Group "${createGroupName.trim()}" created with ${selectedParticipants.size} participants!`,
      });
      closeCreateModal();

      // Refresh groups list if same session
      if (createSession === selectedSession) {
        setTimeout(() => loadGroups(), 1500);
      }
    } catch (err) {
      setToast({ type: "error", text: err.message || "Failed to create group" });
    } finally {
      setCreatingGroup(false);
      setTimeout(() => setToast(null), 4000);
    }
  }

  // ── Color map for number list badges ──────────────────────────────────────
  const COLOR_MAP = {
    "bg-blue-500": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    "bg-emerald-500": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    "bg-violet-500": "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
    "bg-amber-500": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    "bg-rose-500": "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    "bg-cyan-500": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
    "bg-teal-500": "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  };

  return (
    <div className="page space-y-5">
      <PageHeader
        title="WhatsApp Groups"
        subtitle={`${groups.length} groups from selected session`}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={openCreateModal}
            disabled={sessions.length === 0}
            className="btn-primary gap-2 disabled:opacity-50"
          >
            <Plus size={15} />
            Create Group
          </button>
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

      {/* Download Modal */}
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

      {/* ── Create Group Modal ─────────────────────────────────────────────── */}
      <Modal
        open={showCreateModal}
        onClose={closeCreateModal}
        title="Create WhatsApp Group"
        size="xl"
        footer={
          <>
            <button onClick={closeCreateModal} className="btn-secondary gap-1.5">
              <X size={14} />
              Cancel
            </button>
            <button
              onClick={handleCreateGroup}
              disabled={
                creatingGroup ||
                !createGroupName.trim() ||
                !createSession ||
                selectedParticipants.size === 0
              }
              className="btn-primary gap-1.5 disabled:opacity-50"
            >
              {creatingGroup ? (
                <Loader size={14} className="animate-spin" />
              ) : (
                <Plus size={14} />
              )}
              {creatingGroup
                ? "Creating..."
                : `Create Group (${selectedParticipants.size})`}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          {/* Group Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              Group Name <span className="text-red-400">*</span>
            </label>
            <input
              value={createGroupName}
              onChange={(e) => setCreateGroupName(e.target.value.slice(0, 25))}
              placeholder="Enter group name..."
              maxLength={25}
              className="input"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              {createGroupName.length}/25 characters
            </p>
          </div>

          {/* Session Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              WhatsApp Session <span className="text-red-400">*</span>
            </label>
            <select
              value={createSession}
              onChange={(e) => setCreateSession(e.target.value)}
              className="input"
            >
              <option value="">Select a session...</option>
              {sessions.map((session) => (
                <option key={session.sessionId} value={session.sessionId}>
                  {session.name} - {session.phoneNumber || session.sessionId}
                </option>
              ))}
            </select>
          </div>

          {/* Number Lists Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              Select Number Lists
            </label>
            {loadingLists ? (
              <div className="flex items-center gap-2 py-4 justify-center">
                <Loader size={16} className="animate-spin text-primary-500" />
                <span className="text-xs text-slate-400">Loading lists...</span>
              </div>
            ) : numberLists.length === 0 ? (
              <div className="py-4 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                <List size={20} className="mx-auto text-slate-300 mb-1.5" />
                <p className="text-xs text-slate-400">
                  No number lists found. Create one first.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-1">
                {numberLists.map((list) => {
                  const isSelected = selectedListIds.includes(list.id);
                  const badgeClass = COLOR_MAP[list.color] || COLOR_MAP["bg-blue-500"];
                  return (
                    <button
                      key={list.id}
                      onClick={() => toggleListSelection(list.id)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "border-primary-300 bg-primary-50/60 dark:border-primary-700 dark:bg-primary-900/20 ring-1 ring-primary-200 dark:ring-primary-800"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all ${
                          isSelected
                            ? "bg-primary-500 text-white"
                            : "border border-slate-300 dark:border-slate-600"
                        }`}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                          {list.name}
                        </p>
                        <span className={`inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded-md mt-0.5 ${badgeClass}`}>
                          {list.count} numbers
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Participant Picker */}
          {selectedListIds.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Select Participants ({selectedParticipants.size}/{allParticipantNumbers.length})
                </label>
                <button
                  onClick={selectAllParticipants}
                  className="text-[11px] font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                >
                  {selectedParticipants.size === filteredParticipants.length && filteredParticipants.length > 0
                    ? "Deselect All"
                    : "Select All"}
                </button>
              </div>

              {/* Participant Search */}
              <div className="relative mb-2">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={participantSearch}
                  onChange={(e) => setParticipantSearch(e.target.value)}
                  placeholder="Search phone numbers..."
                  className="input pl-8 text-sm"
                />
              </div>

              {allParticipantNumbers.length > 1000 && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 mb-2">
                  <AlertCircle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-700 dark:text-amber-300">
                    WhatsApp limits groups to ~1000 participants. Only select up to 1000.
                  </p>
                </div>
              )}

              <div className="rounded-xl border border-slate-200 dark:border-slate-700 max-h-[240px] overflow-y-auto">
                {filteredParticipants.length === 0 ? (
                  <div className="py-6 text-center">
                    <p className="text-xs text-slate-400">No numbers match your search</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredParticipants.map((number) => {
                      const isChecked = selectedParticipants.has(number);
                      return (
                        <button
                          key={number}
                          onClick={() => toggleParticipant(number)}
                          className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors ${
                            isChecked
                              ? "bg-primary-50/50 dark:bg-primary-900/10"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          }`}
                        >
                          <div
                            className={`w-4.5 h-4.5 rounded flex items-center justify-center flex-shrink-0 transition-all ${
                              isChecked
                                ? "bg-primary-500 text-white"
                                : "border border-slate-300 dark:border-slate-600"
                            }`}
                            style={{ width: 18, height: 18 }}
                          >
                            {isChecked && <Check size={11} strokeWidth={3} />}
                          </div>
                          <span className="text-sm font-mono text-slate-700 dark:text-slate-300">
                            {number}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedParticipants.size > 0 && (
                <p className="text-[11px] text-primary-600 dark:text-primary-400 mt-1.5 font-medium">
                  ✓ {selectedParticipants.size} participant{selectedParticipants.size !== 1 ? "s" : ""} selected
                </p>
              )}
            </div>
          )}
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
