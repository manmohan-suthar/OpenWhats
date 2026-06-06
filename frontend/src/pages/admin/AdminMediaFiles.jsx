import { useState, useEffect, useCallback, useRef } from "react";
import {
  Image,
  FileText,
  Film,
  File,
  HardDrive,
  FolderOpen,
  Folder,
  Plus,
  RefreshCw,
  Loader2,
  ChevronRight,
  Users,
  X,
  Eye,
  FolderPlus,
  Search,
} from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import Modal from "../../components/ui/Modal";
import { API_ORIGIN, resolveApiUrl } from "../../config/env";
import { authFetch } from "../../services/authFetch";

const BASE = API_ORIGIN;
const PAGE_SIZE = 10;

const COLOR_CLASSES = {
  blue: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-600 dark:text-blue-400",
  },
  emerald: {
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  violet: {
    bg: "bg-violet-100 dark:bg-violet-900/30",
    text: "text-violet-600 dark:text-violet-400",
  },
  amber: {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-600 dark:text-amber-400",
  },
  rose: {
    bg: "bg-rose-100 dark:bg-rose-900/30",
    text: "text-rose-600 dark:text-rose-400",
  },
  cyan: {
    bg: "bg-cyan-100 dark:bg-cyan-900/30",
    text: "text-cyan-600 dark:text-cyan-400",
  },
};
const COLORS = ["blue", "emerald", "violet", "amber", "rose", "cyan"];

function fmtBytes(bytes) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function FileThumb({ file }) {
  const [imgOk, setImgOk] = useState(true);
  if (file.type === "image" && file.fileUrl && imgOk) {
    return (
      <img
        src={resolveApiUrl(file.fileUrl)}
        alt={file.name}
        className="w-full h-full object-cover"
        onError={() => setImgOk(false)}
      />
    );
  }
  const Icon = { pdf: FileText, video: Film, audio: File }[file.type] || File;
  const colors =
    {
      image: "bg-blue-50 dark:bg-blue-900/20 text-blue-400",
      pdf: "bg-red-50 dark:bg-red-900/20 text-red-400",
      video: "bg-violet-50 dark:bg-violet-900/20 text-violet-400",
    }[file.type] || "bg-slate-100 dark:bg-slate-800 text-slate-400";
  return (
    <div className={`w-full h-full flex items-center justify-center ${colors}`}>
      <Icon size={24} strokeWidth={1.5} />
    </div>
  );
}

function MediaGrid({ items, onPreview }) {
  if (!items?.length)
    return (
      <p className="text-xs text-slate-400 py-4 text-center">No files here</p>
    );
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
      {items.map((f) => (
        <div
          key={f.id}
          className="group relative aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-[#00a884] transition-colors"
          onClick={() => onPreview(f)}
        >
          <FileThumb file={f} />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Eye size={18} className="text-white" />
          </div>
          <div className="absolute bottom-0 inset-x-0 bg-black/60 px-1.5 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <p className="text-[9px] text-white truncate">{f.name}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function CollectionPanel({ collection, onPreview }) {
  const [open, setOpen] = useState(false);
  const [openSubs, setOpenSubs] = useState({});
  const colors = COLOR_CLASSES[collection.colorId] || COLOR_CLASSES.blue;

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      {/* Header — click to expand/collapse */}
      <button
        className={`w-full text-left px-4 py-3 flex items-center gap-3 ${colors.bg} transition-colors`}
        onClick={() => setOpen((v) => !v)}
      >
        <FolderOpen size={16} className={colors.text} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${colors.text}`}>
            {collection.name}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            {collection.media?.length || 0} files ·{" "}
            {collection.subcollections?.length || 0} subfolders
          </p>
        </div>
        <span className="text-[10px] text-slate-500 mr-1">
          {fmtBytes(collection.totalSize)}
        </span>
        <ChevronRight
          size={15}
          className={`${colors.text} transition-transform duration-200 flex-shrink-0 ${open ? "rotate-90" : ""}`}
        />
      </button>

      {/* Body */}
      {open && (
        <div className="p-4 space-y-4 bg-white dark:bg-slate-900">
          {collection.media?.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Root files
              </p>
              <MediaGrid items={collection.media} onPreview={onPreview} />
            </div>
          )}

          {(collection.subcollections || []).map((sc) => (
            <div key={sc.id}>
              <button
                className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 hover:text-[#00a884] transition-colors"
                onClick={() =>
                  setOpenSubs((p) => ({ ...p, [sc.id]: !p[sc.id] }))
                }
              >
                {openSubs[sc.id] ? (
                  <FolderOpen size={13} />
                ) : (
                  <Folder size={13} />
                )}
                {sc.name}
                <span className="font-normal text-slate-400">
                  ({sc.media?.length || 0})
                </span>
                <ChevronRight
                  size={12}
                  className={`transition-transform duration-200 ${openSubs[sc.id] ? "rotate-90" : ""}`}
                />
              </button>
              {openSubs[sc.id] && (
                <div className="ml-4">
                  <MediaGrid items={sc.media || []} onPreview={onPreview} />
                </div>
              )}
            </div>
          ))}

          {!collection.media?.length && !collection.subcollections?.length && (
            <p className="text-xs text-slate-400 text-center py-3">
              Empty collection
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminMediaFiles() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelected] = useState(null);
  const [preview, setPreview] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [form, setForm] = useState({ userId: "", name: "", colorId: "blue" });
  const [saving, setSaving] = useState(false);

  // Search + lazy load state
  const [search, setSearch] = useState("");
  const [visibleCount, setVisible] = useState(PAGE_SIZE);
  const sentinelRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/admin/media");
      if (res.success) {
        setData(res.data);
        setVisible(PAGE_SIZE); // reset pagination on reload
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Load all users for dropdown
  useEffect(() => {
    authFetch("/api/admin/users?limit=200&page=1").then((r) => {
      if (r.success) setAllUsers(r.data?.users || []);
    });
  }, []);

  // Sync selected user after reload
  useEffect(() => {
    if (!data) return;
    if (!selectedUser && data.users.length) {
      setSelected(data.users[0]);
    } else if (selectedUser) {
      const refreshed = data.users.find(
        (u) => String(u.user._id) === String(selectedUser.user._id),
      );
      if (refreshed) setSelected(refreshed);
    }
  }, [data]); // eslint-disable-line

  // IntersectionObserver for lazy loading users in sidebar
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible((v) => v + PAGE_SIZE);
        }
      },
      { threshold: 0.1 },
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [data, search]);

  // Reset visible count when search changes
  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [search]);

  const allMediaUsers = data?.users || [];
  const filteredUsers = search.trim()
    ? allMediaUsers.filter(
        (u) =>
          (u.user.name || "").toLowerCase().includes(search.toLowerCase()) ||
          (u.user.email || "").toLowerCase().includes(search.toLowerCase()),
      )
    : allMediaUsers;
  const visibleUsers = filteredUsers.slice(0, visibleCount);
  const hasMore = visibleCount < filteredUsers.length;

  const displayUser = selectedUser || allMediaUsers[0] || null;
  const stats = data?.stats || {};

  const openAdd = (presetUserId) => {
    setForm({
      userId: presetUserId || (displayUser ? String(displayUser.user._id) : ""),
      name: "",
      colorId: "blue",
    });
    setAddOpen(true);
  };

  const handleAdd = async () => {
    if (!form.userId || !form.name.trim()) return;
    setSaving(true);
    try {
      const res = await authFetch("/api/admin/media/collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.success) {
        setAddOpen(false);
        await load();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page space-y-5">
      <PageHeader
        title="Media Files"
        subtitle="All user media organized by collection"
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => openAdd()}
            className="btn-primary btn-sm gap-1.5"
          >
            <FolderPlus size={14} /> Add Collection
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="btn-secondary btn-sm gap-1.5"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Users with Media"
          value={loading ? "—" : (stats.totalUsers ?? 0)}
          icon={Users}
          iconColor="text-blue-600"
          iconBg="bg-blue-50 dark:bg-blue-900/20"
        />
        <StatCard
          title="Collections"
          value={loading ? "—" : (stats.totalCollections ?? 0)}
          icon={FolderOpen}
          iconColor="text-violet-600"
          iconBg="bg-violet-50 dark:bg-violet-900/20"
        />
        <StatCard
          title="Total Files"
          value={loading ? "—" : (stats.totalFiles ?? 0)}
          icon={Image}
          iconColor="text-[#00a884]"
          iconBg="bg-emerald-50 dark:bg-emerald-900/20"
        />
        <StatCard
          title="Storage Used"
          value={loading ? "—" : fmtBytes(stats.totalSize ?? 0)}
          icon={HardDrive}
          iconColor="text-amber-600"
          iconBg="bg-amber-50 dark:bg-amber-900/20"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-[#00a884]" />
        </div>
      ) : allMediaUsers.length === 0 ? (
        <div className="card p-10 text-center text-slate-400 text-sm">
          No media files uploaded yet.
        </div>
      ) : (
        <div className="grid lg:grid-cols-4 gap-4 items-start">
          {/* ── User sidebar with search + lazy scroll ── */}
          <div className="card overflow-hidden lg:col-span-1 flex flex-col">
            {/* Search */}
            <div className="px-3 py-3 border-b border-slate-100 dark:border-slate-800">
              <div className="relative">
                <Search
                  size={13}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  className="input pl-8 py-1.5 text-xs"
                  placeholder="Search users…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* User list — scrollable with lazy load sentinel */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[580px] overflow-y-auto">
              {visibleUsers.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  No users found
                </p>
              ) : (
                visibleUsers.map((u) => {
                  const isActive =
                    displayUser &&
                    String(u.user._id) === String(displayUser.user._id);
                  return (
                    <button
                      key={String(u.user._id)}
                      onClick={() => setSelected(u)}
                      className={`w-full text-left px-3 py-3 flex items-center gap-2.5 transition-colors ${
                        isActive
                          ? "bg-[#00a884]/10 border-r-2 border-[#00a884]"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00a884] to-emerald-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">
                          {(u.user.name ||
                            u.user.email ||
                            "?")[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {u.user.name || u.user.email}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {u.collections.length} col · {u.totalFiles} files
                        </p>
                      </div>
                    </button>
                  );
                })
              )}

              {/* Lazy load sentinel */}
              {hasMore && (
                <div
                  ref={sentinelRef}
                  className="flex items-center justify-center py-3"
                >
                  <Loader2 size={16} className="animate-spin text-slate-400" />
                </div>
              )}
            </div>
          </div>

          {/* ── Collection panel ── */}
          <div className="lg:col-span-3 space-y-3">
            {displayUser && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">
                      {displayUser.user.name || displayUser.user.email}
                    </p>
                    <p className="text-xs text-slate-400">
                      {displayUser.collections.length} collections ·{" "}
                      {displayUser.totalFiles} files ·{" "}
                      {fmtBytes(displayUser.totalSize)}
                    </p>
                  </div>
                  <button
                    onClick={() => openAdd(String(displayUser.user._id))}
                    className="btn-secondary btn-sm gap-1.5 text-xs"
                  >
                    <Plus size={13} /> Add Collection
                  </button>
                </div>

                {displayUser.collections.length === 0 ? (
                  <div className="card p-10 text-center text-slate-400 text-sm">
                    This user has no collections yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {displayUser.collections.map((col) => (
                      <CollectionPanel
                        key={col.id}
                        collection={col}
                        onPreview={setPreview}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Fullscreen preview ── */}
      {preview && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setPreview(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white"
            onClick={() => setPreview(null)}
          >
            <X size={24} />
          </button>
          <div
            className="max-w-3xl max-h-[90vh] flex flex-col items-center gap-3 px-4"
            onClick={(e) => e.stopPropagation()}
          >
            {preview.type === "image" && preview.fileUrl ? (
              <img
                src={`${BASE}${preview.fileUrl}`}
                alt={preview.name}
                className="max-h-[80vh] max-w-full rounded-xl object-contain"
              />
            ) : (
              <div className="w-48 h-48 rounded-xl bg-slate-800 flex items-center justify-center">
                <File size={64} className="text-slate-400" strokeWidth={1} />
              </div>
            )}
            <div className="text-center">
              <p className="text-white font-medium text-sm">{preview.name}</p>
              <p className="text-white/50 text-xs">
                {preview.size} · {preview.type}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Collection modal ── */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Collection for User"
        size="sm"
        footer={
          <div className="flex gap-2">
            <button
              onClick={() => setAddOpen(false)}
              className="btn-secondary btn-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={saving || !form.userId || !form.name.trim()}
              className="btn-primary btn-sm gap-1.5"
            >
              {saving ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Plus size={13} />
              )}
              Create
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              User
            </label>
            <select
              className="input text-sm"
              value={form.userId}
              onChange={(e) =>
                setForm((p) => ({ ...p, userId: e.target.value }))
              }
            >
              <option value="">Select user…</option>
              {allUsers.map((u) => (
                <option key={String(u._id)} value={String(u._id)}>
                  {u.name || u.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              Collection Name
            </label>
            <input
              className="input text-sm"
              placeholder="e.g. Product Images"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              Color
            </label>
            <div className="flex gap-2">
              {COLORS.map((c) => {
                const cls = COLOR_CLASSES[c];
                return (
                  <button
                    key={c}
                    onClick={() => setForm((p) => ({ ...p, colorId: c }))}
                    className={`w-7 h-7 rounded-full ${cls.bg} ${cls.text} flex items-center justify-center transition-all ${
                      form.colorId === c
                        ? "ring-2 ring-offset-2 ring-[#00a884] scale-110"
                        : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    <div className="w-3 h-3 rounded-full bg-current" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
