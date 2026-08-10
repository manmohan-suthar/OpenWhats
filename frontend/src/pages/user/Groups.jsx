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
  Layers,
  Sparkles,
  CheckSquare,
  Square,
  ChevronRight,
  Settings,
  ShieldCheck,
  AlertTriangle,
  Copy,
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

function formatGroupSuffix(index, style = "underscore_2") {
  const num = index + 1;
  const pad2 = String(num).padStart(2, "0");
  if (style === "underscore_2") return `_${pad2}`;
  if (style === "space_2") return ` ${pad2}`;
  if (style === "part") return ` Part ${num}`;
  if (style === "dash") return ` - ${pad2}`;
  return `_${pad2}`;
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

  // ── Advanced Auto Multi-Group Creation options ──────────────────────────────
  const [creationMode, setCreationMode] = useState("invite"); // "invite" (safe) or "direct"
  const [autoSplit, setAutoSplit] = useState(true);
  const [contactsPerGroup, setContactsPerGroup] = useState(250);
  const [interGroupDelay, setInterGroupDelay] = useState(5); // seconds
  const [suffixStyle, setSuffixStyle] = useState("underscore_2");
  const [rotateSessions, setRotateSessions] = useState(true);
  const [groupsPerSession, setGroupsPerSession] = useState(5);
  const [createdInviteResults, setCreatedInviteResults] = useState(null);

  // ── Multi-group progress tracking ─────────────────────────────────────────
  const [multiProgress, setMultiProgress] = useState({
    active: false,
    current: 0,
    total: 0,
    percent: 0,
    currentGroupName: "",
    currentSessionName: "",
    processedContacts: 0,
    totalContacts: 0,
    etaSeconds: 0,
    successCount: 0,
    errorCount: 0,
  });

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

  // When number lists change, default select all numbers automatically
  useEffect(() => {
    if (selectedListIds.length > 0) {
      setSelectedParticipants(new Set(allParticipantNumbers));
    } else {
      setSelectedParticipants(new Set());
    }
  }, [allParticipantNumbers, selectedListIds]);

  const filteredParticipants = useMemo(() => {
    const q = participantSearch.trim().toLowerCase();
    if (!q) return allParticipantNumbers.slice(0, 300); // Limit DOM nodes for fast rendering
    return allParticipantNumbers
      .filter((num) => num.toLowerCase().includes(q))
      .slice(0, 300);
  }, [allParticipantNumbers, participantSearch]);

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
        text: `Imported ${result.data?.added || 0} participants to number list!`,
      });
      setTimeout(() => setToast(null), 4000);
    } catch (err) {
      setToast({ type: "error", text: err.message || "Import failed" });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setImportingGroup("");
    }
  }

  async function handleDownload(format) {
    if (!selectedSession || !downloadGroup?.jid) return;

    try {
      setDownloadingFormat(format);
      await api.downloadGroupParticipants(
        selectedSession,
        downloadGroup.jid,
        format,
        downloadGroup.subject || downloadGroup.name || "Group",
      );
      setToast({ type: "success", text: `Downloaded contacts in ${format.toUpperCase()}!` });
      setTimeout(() => setToast(null), 3000);
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
    setCreationMode("invite");
    setAutoSplit(true);
    setContactsPerGroup(250);
    setInterGroupDelay(5);
    setSuffixStyle("underscore_2");
    setMultiProgress({ active: false, current: 0, total: 0, percent: 0, currentGroupName: "", successCount: 0, errorCount: 0 });
    setNumberLists([]);
    loadNumberLists();
  }

  function closeCreateModal() {
    if (multiProgress.active) return; // Prevent closing while in progress
    setShowCreateModal(false);
    setCreateGroupName("");
    setSelectedListIds([]);
    setSelectedParticipants(new Set());
    setParticipantSearch("");
    setMultiProgress({ active: false, current: 0, total: 0, percent: 0, currentGroupName: "", successCount: 0, errorCount: 0 });
  }

  function selectLimitParticipants(limit) {
    if (limit <= 0) {
      setSelectedParticipants(new Set());
    } else {
      const sliced = allParticipantNumbers.slice(0, limit);
      setSelectedParticipants(new Set(sliced));
    }
  }

  async function loadNumberLists() {
    try {
      setLoadingLists(true);
      const data = await api.getNumberLists({ includeNumbers: true });
      setNumberLists(Array.isArray(data.lists) ? data.lists : []);
    } catch (err) {
      setToast({ type: "error", text: "Failed to load number lists" });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setLoadingLists(false);
    }
  }

  async function handleCreateGroup() {
    const baseName = createGroupName.trim();
    if (!createSession || !baseName || selectedParticipants.size === 0) return;

    const participantsArray = [...selectedParticipants];
    const totalCount = participantsArray.length;
    const chunkLimit = autoSplit ? contactsPerGroup : Math.min(1000, totalCount);

    const isInviteMode = creationMode === "invite";

    // ── Group Sequential Creation ──────────────────────────────────────
    const chunks = [];
    for (let i = 0; i < totalCount; i += chunkLimit) {
      chunks.push(participantsArray.slice(i, i + chunkLimit));
    }

    const totalGroupsToCreate = Math.max(1, chunks.length);
    const startTime = Date.now();
    const generatedLinks = [];

    // Determine available sessions for rotation
    const connectedSessions = sessions.filter((s) => s.status === "connected");
    const activeSessions = rotateSessions && connectedSessions.length > 1
      ? connectedSessions
      : sessions.filter((s) => s.sessionId === createSession);

    if (activeSessions.length === 0) {
      setToast({ type: "error", text: "No active connected session available!" });
      return;
    }

    setCreatingGroup(true);
    setMultiProgress({
      active: true,
      current: 0,
      total: totalGroupsToCreate,
      percent: 0,
      currentGroupName: `${baseName}${formatGroupSuffix(0, suffixStyle)}`,
      currentSessionName: activeSessions[0]?.name || activeSessions[0]?.phoneNumber || "Session 1",
      processedContacts: 0,
      totalContacts: totalCount,
      etaSeconds: Math.ceil(totalGroupsToCreate * (interGroupDelay + 2)),
      successCount: 0,
      errorCount: 0,
    });

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < chunks.length; i++) {
      const suffix = totalGroupsToCreate > 1 ? formatGroupSuffix(i, suffixStyle) : "";
      const maxBaseLength = 25 - suffix.length;
      const groupSubject = `${baseName.slice(0, maxBaseLength)}${suffix}`;

      // Calculate which session to use (Session Rotation)
      let targetSession = activeSessions[0];
      if (rotateSessions && activeSessions.length > 1) {
        const sessionIndex = Math.floor(i / groupsPerSession) % activeSessions.length;
        targetSession = activeSessions[sessionIndex];
      }

      const targetSessionId = targetSession.sessionId;
      const targetSessionName = targetSession.name || targetSession.phoneNumber || targetSessionId;

      setMultiProgress((prev) => ({
        ...prev,
        current: i + 1,
        currentGroupName: groupSubject,
        currentSessionName: targetSessionName,
      }));

      try {
        const res = await api.createWhatsAppGroup(
          targetSessionId,
          groupSubject,
          isInviteMode ? [] : chunks[i],
          creationMode,
        );

        if (res.success !== false && res.data) {
          successCount++;
          if (res.data.inviteUrl) {
            generatedLinks.push({
              subject: res.data.subject || groupSubject,
              inviteUrl: res.data.inviteUrl,
              inviteCode: res.data.inviteCode,
              groupJid: res.data.groupJid,
              targetCount: chunks[i]?.length || 0,
              sessionName: targetSessionName,
            });
          }
        } else {
          errorCount++;
        }
      } catch (err) {
        console.error(`Error creating group ${groupSubject} with session ${targetSessionName}:`, err);
        errorCount++;
      }

      const completed = i + 1;
      const processedContacts = Math.min(totalCount, completed * chunkLimit);
      const elapsedSec = (Date.now() - startTime) / 1000;
      const avgTimePerGroup = elapsedSec / completed;
      const remainingGroups = totalGroupsToCreate - completed;
      const etaSeconds = Math.max(0, Math.ceil(remainingGroups * (avgTimePerGroup + interGroupDelay)));
      const percent = Math.round((completed / totalGroupsToCreate) * 100);

      setMultiProgress({
        active: true,
        current: completed,
        total: totalGroupsToCreate,
        percent,
        currentGroupName: groupSubject,
        currentSessionName: targetSessionName,
        processedContacts,
        totalContacts: totalCount,
        etaSeconds,
        successCount,
        errorCount,
      });

      if (i < chunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, interGroupDelay * 1000));
      }
    }

    setCreatingGroup(false);
    setMultiProgress({
      active: false,
      current: totalGroupsToCreate,
      total: totalGroupsToCreate,
      currentGroupName: "",
      successCount,
      errorCount,
    });

    setToast({
      type: successCount > 0 ? "success" : "error",
      text: `Completed: ${successCount} group${successCount !== 1 ? "s" : ""} created successfully${errorCount > 0 ? `, ${errorCount} failed` : ""}!`,
    });

    closeCreateModal();

    if (createSession === selectedSession) {
      setTimeout(() => loadGroups(), 1500);
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

      {/* ── Create Group Modal (Advanced Auto-Split System) ───────────────── */}
      <Modal
        open={showCreateModal}
        onClose={closeCreateModal}
        title={multiProgress.active ? "Creating WhatsApp Groups..." : "Create WhatsApp Groups"}
        size="xl"
        footer={
          multiProgress.active ? null : (
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
                ) : estimatedGroupCount > 1 ? (
                  <Sparkles size={14} />
                ) : (
                  <Plus size={14} />
                )}
                {creatingGroup
                  ? "Processing..."
                  : estimatedGroupCount > 1
                  ? `Create ${estimatedGroupCount} Groups (${selectedParticipants.size.toLocaleString()} Contacts)`
                  : `Create Group (${selectedParticipants.size.toLocaleString()})`}
              </button>
            </>
          )
        }
      >
        {multiProgress.active ? (
          /* Progress View */
          <div className="py-8 space-y-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center mx-auto text-primary-600">
              <Loader size={32} className="animate-spin" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-slate-900 dark:text-white">
                {multiProgress.percent || 0}% Completed
              </h4>
              <p className="text-sm font-semibold text-primary-600 dark:text-primary-400 mt-1">
                Creating Group {multiProgress.current} of {multiProgress.total}: "{multiProgress.currentGroupName}"
              </p>
              {multiProgress.totalContacts > 0 && (
                <p className="text-xs text-slate-400 mt-0.5 font-medium">
                  {(multiProgress.processedContacts || 0).toLocaleString()} of {multiProgress.totalContacts.toLocaleString()} contacts added
                </p>
              )}
              {multiProgress.currentSessionName && (
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-1">
                  Session: {multiProgress.currentSessionName}
                </p>
              )}
            </div>

            {/* Progress Bar */}
            <div className="space-y-2 max-w-md mx-auto">
              <div className="w-full h-3.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-primary-600 transition-all duration-300 rounded-full"
                  style={{
                    width: `${Math.max(5, multiProgress.percent || 0)}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>Safe creation (~1.2s delay per group)</span>
                {multiProgress.etaSeconds > 0 && (
                  <span className="font-medium text-slate-600 dark:text-slate-300">
                    ⏱️ ~{multiProgress.etaSeconds}s remaining
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Setup View */
          <div className="space-y-5">
            {/* Group Name Base */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                Group Name / Base Title <span className="text-red-400">*</span>
              </label>
              <input
                value={createGroupName}
                onChange={(e) => setCreateGroupName(e.target.value.slice(0, 25))}
                placeholder="e.g. Testing, VIP Support, Campaign..."
                maxLength={25}
                className="input"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                {createGroupName.length}/25 characters
              </p>
            </div>

            {/* Creation Mode Selection (Anti-Ban Controls) */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                Group Creation Mode & Anti-Ban Protection <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setCreationMode("invite")}
                  className={`p-3.5 rounded-xl border text-left transition-all relative ${
                    creationMode === "invite"
                      ? "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-900/20 ring-2 ring-emerald-400 dark:ring-emerald-800"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck size={16} className="text-emerald-600" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Invite Link Mode (Safe & Anti-Ban)
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 ml-auto">
                      SAFE
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    Generates Join Invite Links (`chat.whatsapp.com`). Users join voluntarily — Zero risk of spam reports or account bans!
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setCreationMode("direct")}
                  className={`p-3.5 rounded-xl border text-left transition-all relative ${
                    creationMode === "direct"
                      ? "border-amber-500 bg-amber-50/60 dark:bg-amber-900/20 ring-2 ring-amber-400 dark:ring-amber-800"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle size={16} className="text-amber-600" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Direct Add Mode (Caution)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    Forcibly adds numbers directly into groups. High risk of spam blocks if numbers are unsaved!
                  </p>
                </button>
              </div>
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
                <option value="">Select a connected session...</option>
                {sessions.map((session) => (
                  <option key={session.sessionId} value={session.sessionId}>
                    {session.name} - {session.phoneNumber || session.sessionId}
                  </option>
                ))}
              </select>
            </div>

            {/* Number Lists Selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Select Number Lists
                </label>
                {selectedListIds.length > 0 && (
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {allParticipantNumbers.length.toLocaleString()} Total Contacts
                  </span>
                )}
              </div>

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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[180px] overflow-y-auto pr-1">
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
                            {list.count.toLocaleString()} numbers
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Multi-Group Splitting Configuration ──────────────────────────── */}
            {selectedListIds.length > 0 && (
              <div className="p-4 rounded-xl border border-primary-200 dark:border-primary-800/50 bg-primary-50/40 dark:bg-primary-900/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers size={16} className="text-primary-600" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Auto-Split & Anti-Ban Controls
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoSplit}
                      onChange={(e) => setAutoSplit(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600" />
                  </label>
                </div>

                {autoSplit ? (
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Contacts Per Group
                        </label>
                        <select
                          value={contactsPerGroup}
                          onChange={(e) => setContactsPerGroup(Number(e.target.value))}
                          className="input text-xs"
                        >
                          <option value={50}>50 contacts (Safest)</option>
                          <option value={100}>100 contacts</option>
                          <option value={250}>250 contacts (Recommended)</option>
                          <option value={500}>500 contacts</option>
                          <option value={950}>950 contacts (Max limit)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Delay Between Groups
                        </label>
                        <select
                          value={interGroupDelay}
                          onChange={(e) => setInterGroupDelay(Number(e.target.value))}
                          className="input text-xs"
                        >
                          <option value={3}>3 Seconds (Fast)</option>
                          <option value={5}>5 Seconds (Balanced)</option>
                          <option value={10}>10 Seconds (Safe)</option>
                          <option value={15}>15 Seconds (Extra Safe)</option>
                          <option value={30}>30 Seconds (Ultra Protection)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Group Naming Format
                        </label>
                        <select
                          value={suffixStyle}
                          onChange={(e) => setSuffixStyle(e.target.value)}
                          className="input text-xs"
                        >
                          <option value="underscore_2">Base_01, Base_02...</option>
                          <option value="space_2">Base 01, Base 02...</option>
                          <option value="dash">Base - 01, Base - 02...</option>
                          <option value="part">Base Part 1, Base Part 2...</option>
                        </select>
                      </div>
                    </div>

                    {createGroupName.trim() && (
                      <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-primary-200 dark:border-primary-800/40 text-xs">
                        <div className="flex items-center justify-between text-primary-700 dark:text-primary-300 font-medium">
                          <span>📊 Will create <strong>{estimatedGroupCount} groups</strong> sequentially</span>
                          <span>{selectedParticipants.size.toLocaleString()} Contacts</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 font-mono truncate">
                          Names: {createGroupName.trim()}{formatGroupSuffix(0, suffixStyle)}, {createGroupName.trim()}{formatGroupSuffix(1, suffixStyle)}...
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    Auto-split is OFF. All selected contacts (up to 1,000) will be added into 1 single group.
                  </p>
                )}
              </div>
            )}

            {/* Multi-Session Load Balancing & Rotation */}
            {sessions.filter((s) => s.status === "connected").length > 1 && (
              <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-800/50 bg-blue-50/40 dark:bg-blue-900/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RefreshCw size={16} className="text-blue-600" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Multi-Session Load Balancing & Rotation
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                      {sessions.filter((s) => s.status === "connected").length} SESSIONS ACTIVE
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rotateSessions}
                      onChange={(e) => setRotateSessions(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                  </label>
                </div>

                {rotateSessions ? (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="text-slate-600 dark:text-slate-400">Switch WhatsApp session every:</span>
                      <select
                        value={groupsPerSession}
                        onChange={(e) => setGroupsPerSession(Number(e.target.value))}
                        className="input text-xs w-36 py-1"
                      >
                        <option value={1}>1 Group</option>
                        <option value={3}>3 Groups</option>
                        <option value={5}>5 Groups (Recommended)</option>
                        <option value={10}>10 Groups</option>
                      </select>
                    </div>
                    <p className="text-[11px] text-blue-700 dark:text-blue-300">
                      🛡️ Automatically rotates between {sessions.filter((s) => s.status === "connected").length} connected WhatsApp sessions! Distributes creation load evenly across your accounts to prevent number bans.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    Session rotation is OFF. All groups will be created using 1 single WhatsApp session.
                  </p>
                )}
              </div>
            )}

            {/* Participant Picker */}
            {selectedListIds.length > 0 && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Select Participants ({selectedParticipants.size.toLocaleString()}/{allParticipantNumbers.length.toLocaleString()})
                  </label>

                  {/* 1-Click Quick Limit Selection Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-slate-400 font-medium mr-1">Quick Select:</span>
                    {allParticipantNumbers.length >= 1000 && (
                      <button
                        type="button"
                        onClick={() => selectLimitParticipants(1000)}
                        className={`px-2 py-0.5 text-[11px] font-semibold rounded-md transition-colors ${
                          selectedParticipants.size === 1000
                            ? "bg-primary-600 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-primary-50 dark:hover:bg-primary-900/30"
                        }`}
                      >
                        First 1K
                      </button>
                    )}
                    {allParticipantNumbers.length >= 2500 && (
                      <button
                        type="button"
                        onClick={() => selectLimitParticipants(2500)}
                        className={`px-2 py-0.5 text-[11px] font-semibold rounded-md transition-colors ${
                          selectedParticipants.size === 2500
                            ? "bg-primary-600 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-primary-50 dark:hover:bg-primary-900/30"
                        }`}
                      >
                        First 2.5K
                      </button>
                    )}
                    {allParticipantNumbers.length >= 5000 && (
                      <button
                        type="button"
                        onClick={() => selectLimitParticipants(5000)}
                        className={`px-2 py-0.5 text-[11px] font-semibold rounded-md transition-colors ${
                          selectedParticipants.size === 5000
                            ? "bg-primary-600 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-primary-50 dark:hover:bg-primary-900/30"
                        }`}
                      >
                        First 5K
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => selectLimitParticipants(allParticipantNumbers.length)}
                      className={`px-2 py-0.5 text-[11px] font-semibold rounded-md transition-colors ${
                        selectedParticipants.size === allParticipantNumbers.length
                          ? "bg-primary-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-primary-50 dark:hover:bg-primary-900/30"
                      }`}
                    >
                      All ({allParticipantNumbers.length.toLocaleString()})
                    </button>
                    <button
                      type="button"
                      onClick={() => selectLimitParticipants(0)}
                      className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-100"
                    >
                      Clear
                    </button>
                  </div>
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

                <div className="rounded-xl border border-slate-200 dark:border-slate-700 max-h-[180px] overflow-y-auto">
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
                            className={`w-full flex items-center gap-3 px-3.5 py-2 text-left transition-colors ${
                              isChecked
                                ? "bg-primary-50/50 dark:bg-primary-900/10"
                                : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                            }`}
                          >
                            <div
                              className={`rounded flex items-center justify-center flex-shrink-0 transition-all ${
                                isChecked
                                  ? "bg-primary-500 text-white"
                                  : "border border-slate-300 dark:border-slate-600"
                              }`}
                              style={{ width: 18, height: 18 }}
                            >
                              {isChecked && <Check size={11} strokeWidth={3} />}
                            </div>
                            <span className="text-xs font-mono text-slate-700 dark:text-slate-300">
                              {number}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {allParticipantNumbers.length > 300 && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Showing top 300 numbers for fast rendering. All {selectedParticipants.size.toLocaleString()} selected numbers will be processed.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Generated Group Invite Links Result Modal ───────────────── */}
      <Modal
        open={!!createdInviteResults}
        onClose={() => setCreatedInviteResults(null)}
        title="Created Group Invite Links (Anti-Ban Safe)"
        size="lg"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-600" />
              <div>
                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  {createdInviteResults?.links?.length} Groups Created Safely!
                </p>
                <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400">
                  Copy or download these invite links to invite {createdInviteResults?.totalCount?.toLocaleString()} contacts with 0% ban risk.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const allLinksText = createdInviteResults?.links
                    ?.map((l) => `${l.subject}: ${l.inviteUrl}`)
                    .join("\n");
                  navigator.clipboard.writeText(allLinksText);
                  setToast({ type: "success", text: "Copied all invite links to clipboard!" });
                  setTimeout(() => setToast(null), 3000);
                }}
                className="btn-secondary btn-sm gap-1 text-xs"
              >
                <Copy size={12} /> Copy All Links
              </button>
              <button
                onClick={() => {
                  const csvContent =
                    "Group Name,Invite Link,Group JID,Target Contacts\n" +
                    createdInviteResults?.links
                      ?.map((l) => `"${l.subject}","${l.inviteUrl}","${l.groupJid}","${l.targetCount}"`)
                      .join("\n");
                  const blob = new Blob([csvContent], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `group_invite_links_${Date.now()}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="btn-primary btn-sm gap-1 text-xs"
              >
                <Download size={12} /> Export CSV
              </button>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2">Group Name</th>
                  <th className="text-left px-3 py-2">Invite Link</th>
                  <th className="text-right px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {createdInviteResults?.links?.map((l, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-3 py-2.5 font-semibold text-slate-800 dark:text-slate-200">
                      {l.subject}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-primary-600 dark:text-primary-400 select-all">
                      {l.inviteUrl}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(l.inviteUrl);
                          setToast({ type: "success", text: `Copied link for ${l.subject}` });
                          setTimeout(() => setToast(null), 2500);
                        }}
                        className="btn-ghost btn-sm p-1.5 text-xs gap-1"
                      >
                        <Copy size={12} /> Copy
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
