import { useState, useRef, useEffect } from "react";
import {
  Image,
  FileText,
  Upload,
  Search,
  Grid,
  List,
  Trash2,
  Download,
  Copy,
  CheckCircle2,
  X,
  Eye,
  File,
  Film,
  Music,
  Plus,
  FolderOpen,
  Folder,
  FolderPlus,
  Layers,
  Pencil,
  ImagePlus,
  Palette,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Home,
  AlertCircle,
  HardDrive,
  BarChart2,
  TrendingUp,
  Activity,
  FileImage,
  FileVideo,
  FileArchive,
  Star,
  Loader,
} from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import Modal from "../../components/ui/Modal";
import EmptyState from "../../components/ui/EmptyState";
import { mediaService } from "../../services/mediaService";
import { resolveApiUrl } from "../../config/env";
import api from "../../services/api";

// ── Constants ──────────────────────────────────────────────────────────────────
const COLORS = [
  {
    id: "blue",
    bg: "bg-blue-500",
    light: "bg-blue-50 dark:bg-blue-900/20",
    text: "text-blue-600",
    border: "border-blue-200 dark:border-blue-800",
  },
  {
    id: "emerald",
    bg: "bg-emerald-500",
    light: "bg-emerald-50 dark:bg-emerald-900/20",
    text: "text-emerald-600",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  {
    id: "violet",
    bg: "bg-violet-500",
    light: "bg-violet-50 dark:bg-violet-900/20",
    text: "text-violet-600",
    border: "border-violet-200 dark:border-violet-800",
  },
  {
    id: "amber",
    bg: "bg-amber-500",
    light: "bg-amber-50 dark:bg-amber-900/20",
    text: "text-amber-600",
    border: "border-amber-200 dark:border-amber-800",
  },
  {
    id: "rose",
    bg: "bg-rose-500",
    light: "bg-rose-50 dark:bg-rose-900/20",
    text: "text-rose-600",
    border: "border-rose-200 dark:border-rose-800",
  },
  {
    id: "cyan",
    bg: "bg-cyan-500",
    light: "bg-cyan-50 dark:bg-cyan-900/20",
    text: "text-cyan-600",
    border: "border-cyan-200 dark:border-cyan-800",
  },
];

const typeConfig = {
  image: {
    icon: Image,
    label: "Image",
    accent: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-900/20",
  },
  pdf: {
    icon: FileText,
    label: "PDF",
    accent: "text-red-500",
    bg: "bg-red-50 dark:bg-red-900/20",
  },
  video: {
    icon: Film,
    label: "Video",
    accent: "text-violet-500",
    bg: "bg-violet-50 dark:bg-violet-900/20",
  },
  document: {
    icon: File,
    label: "Document",
    accent: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-900/20",
  },
  audio: {
    icon: Music,
    label: "Audio",
    accent: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function getColor(colorId) {
  return COLORS.find((c) => c.id === colorId) || COLORS[0];
}
function getMediaCount(col) {
  return (
    (col.media?.length || 0) +
    col.subcollections.reduce((s, sc) => s + sc.media.length, 0)
  );
}
function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function getAllMedia(collections) {
  const all = [];
  collections.forEach((col) => {
    (col.media || []).forEach((m) => all.push(m));
    col.subcollections.forEach((sc) => sc.media.forEach((m) => all.push(m)));
  });
  return all;
}

function parseBytes(sizeStr) {
  const m = (sizeStr || "").match(/^([\d.]+)\s*(KB|MB|GB)/i);
  if (!m) return 0;
  const v = parseFloat(m[1]);
  const u = m[2].toUpperCase();
  return u === "GB" ? v * 1073741824 : u === "MB" ? v * 1048576 : v * 1024;
}

function formatBytes(bytes) {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function FileTypeIcon({ type, size = 16 }) {
  const cfg = typeConfig[type] || typeConfig.document;
  const Icon = cfg.icon;
  return (
    <div
      className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}
    >
      <Icon size={size} className={cfg.accent} strokeWidth={1.8} />
    </div>
  );
}

// ── Modals ─────────────────────────────────────────────────────────────────
function ConfirmModal({ open, onClose, onConfirm, title, message }) {
  if (!open) return null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary btn-sm">
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="btn-sm px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Delete
          </button>
        </>
      }
    >
      <p className="text-sm text-slate-600 dark:text-slate-400">{message}</p>
    </Modal>
  );
}

function RenameModal({ open, onClose, onSave, defaultValue, label }) {
  const [name, setName] = useState(defaultValue || "");
  useEffect(() => {
    if (open) setName(defaultValue || "");
  }, [open, defaultValue]);
  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim());
      onClose();
    }
  };
  if (!open) return null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Rename ${label}`}
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary btn-sm">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="btn-primary btn-sm disabled:opacity-50"
          >
            Save
          </button>
        </>
      }
    >
      <input
        className="input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
        autoFocus
      />
    </Modal>
  );
}

function CreateCollectionModal({ open, onClose, onSave }) {
  const [name, setName] = useState("");
  const [colorId, setColorId] = useState("blue");
  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), colorId });
    setName("");
    setColorId("blue");
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Collection"
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary btn-sm">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="btn-primary btn-sm gap-2 disabled:opacity-50"
          >
            <Folder size={13} /> Create
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Name *
          </label>
          <input
            className="input"
            placeholder="e.g. Marketing Assets"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
            Color
          </label>
          <div className="flex gap-2.5">
            {COLORS.map((c) => (
              <button
                key={c.id}
                onClick={() => setColorId(c.id)}
                className={`w-7 h-7 rounded-full ${c.bg} transition-all ${colorId === c.id ? "ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-900 scale-110" : "hover:scale-105"}`}
              />
            ))}
          </div>
        </div>
        {name && (
          <div
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${getColor(colorId).border} ${getColor(colorId).light}`}
          >
            <div
              className={`w-8 h-8 rounded-lg ${getColor(colorId).bg} flex items-center justify-center`}
            >
              <Folder size={14} className="text-white" />
            </div>
            <div>
              <p className={`text-sm font-semibold ${getColor(colorId).text}`}>
                {name}
              </p>
              <p className="text-[10px] text-slate-400">New collection</p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function UploadModal({ open, onClose, onUpload, targetName, limits }) {
  const [drag, setDrag] = useState(false);
  const [files, setFiles] = useState([]); // Will store {file: File, display: {name, type, size}}
  const [sizeErrors, setSizeErrors] = useState([]);
  const fileRef = useRef(null);
  useEffect(() => {
    if (!open) { setFiles([]); setSizeErrors([]); }
  }, [open]);

  const getTypeLimit = (f) => {
    if (!limits) return Infinity;
    if (f.type.startsWith("image/")) return (limits.image ?? 10) * 1024 * 1024;
    if (f.type.startsWith("video/")) return (limits.video ?? 50) * 1024 * 1024;
    if (f.type.startsWith("audio/")) return (limits.audio ?? 20) * 1024 * 1024;
    return (limits.document ?? 25) * 1024 * 1024;
  };

  const getLimitLabel = (f) => {
    if (!limits) return "25 MB";
    if (f.type.startsWith("image/")) return `${limits.image ?? 10} MB`;
    if (f.type.startsWith("video/")) return `${limits.video ?? 50} MB`;
    if (f.type.startsWith("audio/")) return `${limits.audio ?? 20} MB`;
    return `${limits.document ?? 25} MB`;
  };

  const handleFiles = (fileList) => {
    const errors = [];
    const arr = Array.from(fileList).filter((f) => {
      if (f.size > getTypeLimit(f)) {
        errors.push(`"${f.name}" exceeds the ${getLimitLabel(f)} limit`);
        return false;
      }
      return true;
    }).map((f) => ({
      file: f, // Actual File object
      display: {
        id: `m${uid()}`,
        name: f.name,
        type: f.type.startsWith("image/")
          ? "image"
          : f.type === "application/pdf"
            ? "pdf"
            : f.type.startsWith("video/")
              ? "video"
              : "document",
        size:
          f.size > 1048576
            ? `${(f.size / 1048576).toFixed(1)} MB`
            : `${Math.round(f.size / 1024)} KB`,
      },
    }));
    setSizeErrors(errors);
    setFiles((p) => [...p, ...arr]);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Upload to "${targetName || ""}"`}
      size="md"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary btn-sm">
            Cancel
          </button>
          <button
            onClick={() => {
              onUpload(files.map((f) => f.file));
              onClose();
            }}
            disabled={files.length === 0}
            className="btn-primary btn-sm gap-2 disabled:opacity-50"
          >
            <Upload size={13} /> Upload{" "}
            {files.length > 0 && `(${files.length})`}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${drag ? "border-primary-400 bg-primary-50 dark:bg-primary-900/10" : "border-slate-200 dark:border-slate-700 hover:border-primary-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}
        >
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
          />
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
            <Upload
              size={22}
              className={drag ? "text-primary-500" : "text-slate-400"}
              strokeWidth={1.5}
            />
          </div>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            {drag ? "Drop here!" : "Drop files or click to browse"}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {limits
              ? `Images ≤${limits.image}MB · Videos ≤${limits.video}MB · Audio ≤${limits.audio}MB · Docs ≤${limits.document}MB`
              : "Images, PDFs, Documents, Videos"}
          </p>
        </div>
        {sizeErrors.length > 0 && (
          <div className="space-y-1">
            {sizeErrors.map((err, i) => (
              <div key={i} className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-400">
                {err}
              </div>
            ))}
          </div>
        )}
        {files.length > 0 && (
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {files.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl"
              >
                <FileTypeIcon type={item.display.type} size={13} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                    {item.display.name}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {item.display.size}
                  </p>
                </div>
                <button
                  onClick={() => setFiles((p) => p.filter((_, i) => i !== idx))}
                  className="text-slate-400 hover:text-red-500 p-1"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function MediaGallery() {
  const [collections, setCollections] = useState([]);
  const [activeCol, setActiveCol] = useState(null);
  const [activeSub, setActiveSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  // Modals
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [showCreateSub, setShowCreateSub] = useState(false);
  const [createSubTarget, setCreateSubTarget] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadTarget, setUploadTarget] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null);
  const [mediaLimits, setMediaLimits] = useState(null);

  // Load collections and media limits on mount
  useEffect(() => {
    loadCollections();
    api.getMediaLimits().then((res) => { if (res.success) setMediaLimits(res.data); }).catch(() => {});
  }, []);

  const loadCollections = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await mediaService.getCollections();
      if (result.success) {
        setCollections(result.data);
        setAnalytics(result.analytics);
      }
    } catch (err) {
      setError(err.message);
      console.error("Error loading collections:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCollection = async ({ name, colorId }) => {
    try {
      const result = await mediaService.createCollection(name, colorId);
      if (result.success) {
        setCollections((p) => [result.data, ...p]);
        setShowCreateCollection(false);
      }
    } catch (err) {
      alert("Error creating collection: " + err.message);
    }
  };

  const handleDeleteCollection = async (col) => {
    try {
      await mediaService.deleteCollection(col._id);
      setCollections((p) => p.filter((c) => c._id !== col._id));
      if (activeCol?._id === col._id) {
        setActiveCol(null);
        setActiveSub(null);
      }
    } catch (err) {
      alert("Error deleting collection: " + err.message);
    }
  };

  const handleRenameCollection = async (newName) => {
    if (!renameTarget) return;
    try {
      const result = await mediaService.renameCollection(
        renameTarget.col._id,
        newName,
      );
      if (result.success) {
        setCollections((p) =>
          p.map((c) => (c._id === result.data._id ? result.data : c)),
        );
        if (activeCol?._id === result.data._id) setActiveCol(result.data);
        setRenameTarget(null);
      }
    } catch (err) {
      alert("Error renaming collection: " + err.message);
    }
  };

  const handleAddSubcollection = async (name) => {
    if (!createSubTarget) return;
    try {
      const result = await mediaService.addSubcollection(
        createSubTarget._id,
        name,
      );
      if (result.success) {
        setCollections((p) =>
          p.map((c) => (c._id === result.data._id ? result.data : c)),
        );
        if (activeCol?._id === result.data._id) setActiveCol(result.data);
        setShowCreateSub(false);
        setCreateSubTarget(null);
      }
    } catch (err) {
      alert("Error adding subcollection: " + err.message);
    }
  };

  const handleDeleteSubcollection = async (col, sc) => {
    try {
      const result = await mediaService.deleteSubcollection(col._id, sc.id);
      if (result.success) {
        setCollections((p) =>
          p.map((c) => (c._id === result.data._id ? result.data : c)),
        );
        if (activeSub?.id === sc.id) setActiveSub(null);
        if (activeCol?._id === col._id) setActiveCol(result.data);
      }
    } catch (err) {
      alert("Error deleting subcollection: " + err.message);
    }
  };

  const handleRenameSubcollection = async (newName) => {
    if (!renameTarget?.sc) return;
    try {
      const result = await mediaService.renameSubcollection(
        renameTarget.col._id,
        renameTarget.sc.id,
        newName,
      );
      if (result.success) {
        setCollections((p) =>
          p.map((c) => (c._id === result.data._id ? result.data : c)),
        );
        if (activeCol?._id === result.data._id) setActiveCol(result.data);
        setRenameTarget(null);
      }
    } catch (err) {
      alert("Error renaming subcollection: " + err.message);
    }
  };

  const handleUpload = async (files) => {
    if (!uploadTarget) return;
    try {
      const { type, colId, scId } = uploadTarget;

      // Upload files one by one
      for (const file of files) {
        let result;
        if (type === "collection") {
          result = await mediaService.uploadToCollection(colId, file);
        } else {
          result = await mediaService.uploadToSubcollection(colId, scId, file);
        }
        if (result.success) {
          setCollections((p) =>
            p.map((c) => (c._id === result.data._id ? result.data : c)),
          );
          if (activeCol?._id === result.data._id) setActiveCol(result.data);
        }
      }
      alert(`✓ Successfully uploaded ${files.length} file(s)`);
    } catch (err) {
      alert("Error uploading files: " + err.message);
    }
  };

  const handleDeleteMedia = async (scId, mediaId) => {
    if (!activeCol) return;
    try {
      const result = await mediaService.deleteMediaFromSubcollection(
        activeCol._id,
        scId,
        mediaId,
      );
      if (result.success) {
        setCollections((p) =>
          p.map((c) => (c._id === result.data._id ? result.data : c)),
        );
        setActiveCol(result.data);
      }
    } catch (err) {
      alert("Error deleting media: " + err.message);
    }
  };

  const handleDeleteColMedia = async (colId, mediaId) => {
    try {
      const result = await mediaService.deleteMediaFromCollection(
        colId,
        mediaId,
      );
      if (result.success) {
        setCollections((p) =>
          p.map((c) => (c._id === result.data._id ? result.data : c)),
        );
        if (activeCol?._id === colId) setActiveCol(result.data);
      }
    } catch (err) {
      alert("Error deleting media: " + err.message);
    }
  };

  const handleSelectCol = (col) => {
    setActiveCol(col);
    setActiveSub(null);
  };
  const handleSelectSub = (col, sc) => {
    setActiveCol(col);
    setActiveSub(sc);
  };

  const freshActiveCol = activeCol
    ? collections.find((c) => c._id === activeCol._id) || null
    : null;
  const freshActiveSub =
    freshActiveCol && activeSub
      ? freshActiveCol.subcollections.find((s) => s.id === activeSub.id) || null
      : null;

  if (loading) {
    return (
      <div className="page flex flex-col h-full items-center justify-center">
        <Loader size={32} className="animate-spin text-primary-600" />
        <p className="mt-4 text-slate-600 dark:text-slate-400">
          Loading your media gallery...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page flex flex-col h-full items-center justify-center">
        <AlertCircle size={32} className="text-red-500" />
        <p className="mt-4 text-slate-600 dark:text-slate-400">{error}</p>
        <button onClick={loadCollections} className="btn-primary mt-4">
          Retry
        </button>
      </div>
    );
  }

  const level = freshActiveSub
    ? "media"
    : freshActiveCol
      ? "collection"
      : "root";

  return (
    <div className="page flex flex-col h-full" style={{ minHeight: 0 }}>
      <PageHeader
        title="Media Gallery"
        subtitle={`${collections.length} collections · ${collections.reduce((s, c) => s + getMediaCount(c), 0)} files`}
      >
        <button
          onClick={() => setShowCreateCollection(true)}
          className="btn-primary gap-2"
        >
          <Plus size={14} /> New Collection
        </button>
      </PageHeader>

      {/* Always-visible Analytics Card */}
      {analytics && (
        <div className="mx-4 mb-4 card p-5 border-2 border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-slate-50/50 dark:from-slate-900/50 dark:to-slate-900/20">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
            <StatCard
              icon={Folder}
              label="Collections"
              value={analytics.totalCollections}
              color="text-blue-600"
              bg="bg-blue-50 dark:bg-blue-900/20"
            />
            <StatCard
              icon={FolderPlus}
              label="Subfolders"
              value={analytics.totalSubfolders}
              color="text-violet-600"
              bg="bg-violet-50 dark:bg-violet-900/20"
            />
            <StatCard
              icon={Activity}
              label="Total Files"
              value={analytics.totalFiles}
              color="text-slate-700 dark:text-slate-200"
              bg="bg-slate-100 dark:bg-slate-800"
            />
            <StatCard
              icon={Image}
              label="Images"
              value={analytics.images}
              color="text-sky-600"
              bg="bg-sky-50 dark:bg-sky-900/20"
            />
            <StatCard
              icon={Film}
              label="Videos"
              value={analytics.videos}
              color="text-violet-600"
              bg="bg-violet-50 dark:bg-violet-900/20"
            />
            <StatCard
              icon={FileText}
              label="Documents"
              value={analytics.pdfs + analytics.documents}
              color="text-amber-600"
              bg="bg-amber-50 dark:bg-amber-900/20"
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <StorageCard analytics={analytics} />
            <FileTypeCard analytics={analytics} />
          </div>
        </div>
      )}

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm mx-4 mb-4">
        <Sidebar
          collections={collections}
          activeColId={freshActiveCol?._id}
          activeSubId={freshActiveSub?.id}
          onSelectCol={handleSelectCol}
          onSelectSub={handleSelectSub}
          onAddCollection={() => setShowCreateCollection(true)}
          onAddSubcollection={(col) => {
            setCreateSubTarget(col);
            setShowCreateSub(true);
          }}
          onRenameCollection={(col) =>
            setRenameTarget({ type: "collection", col })
          }
          onDeleteCollection={(col) =>
            setConfirmDelete({
              type: "collection",
              col,
              message: `Delete "${col.name}" and all its files?`,
            })
          }
          onRenameSubcollection={(col, sc) =>
            setRenameTarget({ type: "subcollection", col, sc })
          }
          onDeleteSubcollection={(col, sc) =>
            setConfirmDelete({
              type: "subcollection",
              col,
              sc,
              message: `Delete "${sc.name}" and all its files?`,
            })
          }
        />

        {level === "root" && (
          <CollectionsRoot
            collections={collections}
            onSelectCol={handleSelectCol}
            onAddCollection={() => setShowCreateCollection(true)}
          />
        )}
        {level === "collection" && freshActiveCol && (
          <CollectionOverview
            collection={freshActiveCol}
            onSelectSub={handleSelectSub}
            onAddSubcollection={(col) => {
              setCreateSubTarget(col);
              setShowCreateSub(true);
            }}
            onRenameSubcollection={(col, sc) =>
              setRenameTarget({ type: "subcollection", col, sc })
            }
            onDeleteSubcollection={handleDeleteSubcollection}
            onUploadToCollection={(col) => {
              setUploadTarget({ type: "collection", colId: col._id });
              setShowUpload(true);
            }}
            onUploadToSubcollection={(col, sc) => {
              setUploadTarget({
                type: "subcollection",
                colId: col._id,
                scId: sc.id,
              });
              setShowUpload(true);
            }}
            onDeleteColMedia={handleDeleteColMedia}
          />
        )}
        {level === "media" && freshActiveSub && freshActiveCol && (
          <MediaPanel
            subcollection={freshActiveSub}
            collection={freshActiveCol}
            onUpload={() => {
              setUploadTarget({
                type: "subcollection",
                colId: freshActiveCol._id,
                scId: freshActiveSub.id,
              });
              setShowUpload(true);
            }}
            onDeleteMedia={handleDeleteMedia}
          />
        )}
      </div>

      {/* Modals */}
      <CreateCollectionModal
        open={showCreateCollection}
        onClose={() => setShowCreateCollection(false)}
        onSave={handleCreateCollection}
      />

      <Modal
        open={showCreateSub}
        onClose={() => {
          setShowCreateSub(false);
          setCreateSubTarget(null);
        }}
        title={`New Subfolder in "${createSubTarget?.name || ""}"`}
        size="sm"
        footer={
          <>
            <button
              onClick={() => {
                setShowCreateSub(false);
                setCreateSubTarget(null);
              }}
              className="btn-secondary btn-sm"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                const input = document.getElementById("sub-name-input");
                if (input?.value.trim())
                  handleAddSubcollection(input.value.trim());
              }}
              className="btn-primary btn-sm gap-2"
            >
              <FolderPlus size={13} /> Create
            </button>
          </>
        }
      >
        <input
          id="sub-name-input"
          className="input"
          placeholder="e.g. Q1 2026"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.target.value.trim())
              handleAddSubcollection(e.target.value.trim());
          }}
        />
      </Modal>

      <UploadModal
        open={showUpload}
        onClose={() => {
          setShowUpload(false);
          setUploadTarget(null);
        }}
        onUpload={handleUpload}
        targetName={
          uploadTarget?.type === "collection"
            ? collections.find((c) => c._id === uploadTarget.colId)?.name
            : freshActiveSub?.name
        }
        limits={mediaLimits}
      />

      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          confirmDelete.type === "collection"
            ? handleDeleteCollection(confirmDelete.col)
            : handleDeleteSubcollection(confirmDelete.col, confirmDelete.sc);
          setConfirmDelete(null);
        }}
        title="Confirm Delete"
        message={confirmDelete?.message}
      />

      <RenameModal
        open={!!renameTarget}
        onClose={() => setRenameTarget(null)}
        onSave={(name) => {
          renameTarget.type === "collection"
            ? handleRenameCollection(name)
            : handleRenameSubcollection(name);
        }}
        defaultValue={
          renameTarget?.type === "collection"
            ? renameTarget?.col?.name
            : renameTarget?.sc?.name
        }
        label={renameTarget?.type === "collection" ? "Collection" : "Subfolder"}
      />
    </div>
  );
}

// ── Stat Card Component ────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
      <Icon size={18} className={`${color} flex-shrink-0`} />
      <div>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

// ── Storage Card Component ─────────────────────────────────────────────────────
function StorageCard({ analytics }) {
  const typeBytes = [
    {
      label: "Images",
      bytes: analytics.images * 1048576,
      color: "bg-blue-500",
      text: "text-blue-600",
    },
    {
      label: "Videos",
      bytes: analytics.videos * 8388608,
      color: "bg-violet-500",
      text: "text-violet-600",
    },
    {
      label: "PDFs",
      bytes: analytics.pdfs * 524288,
      color: "bg-red-500",
      text: "text-red-600",
    },
    {
      label: "Documents",
      bytes: analytics.documents * 102400,
      color: "bg-amber-500",
      text: "text-amber-600",
    },
  ].filter((t) => t.bytes > 0);

  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HardDrive size={15} className="text-emerald-600" />
          <div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
              Storage Used
            </p>
            <p className="text-[10px] text-slate-400">Across all collections</p>
          </div>
        </div>
        <p className="text-lg font-bold text-emerald-600">
          {formatBytes(analytics.totalSize)}
        </p>
      </div>
      {analytics.totalSize > 0 && (
        <>
          <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
            {typeBytes.map((t) => (
              <div
                key={t.label}
                className={`${t.color}`}
                style={{ width: `${(t.bytes / analytics.totalSize) * 100}%` }}
              />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            {typeBytes.map((t) => (
              <div key={t.label} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${t.color}`} />
                  <span className="text-slate-600 dark:text-slate-400">
                    {t.label}
                  </span>
                </div>
                <span className={`font-semibold ${t.text}`}>
                  {formatBytes(t.bytes)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── File Type Card Component ───────────────────────────────────────────────────
function FileTypeCard({ analytics }) {
  const types = [
    {
      label: "Images",
      count: analytics.images,
      icon: Image,
      bar: "bg-sky-500",
      pct: analytics.totalFiles
        ? (analytics.images / analytics.totalFiles) * 100
        : 0,
    },
    {
      label: "Videos",
      count: analytics.videos,
      icon: Film,
      bar: "bg-violet-500",
      pct: analytics.totalFiles
        ? (analytics.videos / analytics.totalFiles) * 100
        : 0,
    },
    {
      label: "PDFs",
      count: analytics.pdfs,
      icon: FileText,
      bar: "bg-red-500",
      pct: analytics.totalFiles
        ? (analytics.pdfs / analytics.totalFiles) * 100
        : 0,
    },
    {
      label: "Documents",
      count: analytics.documents,
      icon: File,
      bar: "bg-amber-500",
      pct: analytics.totalFiles
        ? (analytics.documents / analytics.totalFiles) * 100
        : 0,
    },
    {
      label: "Audio",
      count: analytics.audios,
      icon: Music,
      bar: "bg-emerald-500",
      pct: analytics.totalFiles
        ? (analytics.audios / analytics.totalFiles) * 100
        : 0,
    },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-lg space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <BarChart2 size={15} className="text-blue-600" />
        <div>
          <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
            File Types
          </p>
          <p className="text-[10px] text-slate-400">
            {analytics.totalFiles} total files
          </p>
        </div>
      </div>
      {types.map((row) => (
        <div key={row.label} className="flex items-center gap-2">
          <row.icon size={11} className="text-slate-400 flex-shrink-0" />
          <span className="text-[10px] text-slate-600 dark:text-slate-400 w-16 flex-shrink-0">
            {row.label}
          </span>
          <div className="flex-1 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full ${row.bar} rounded-full`}
              style={{ width: `${row.pct}%` }}
            />
          </div>
          <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 w-4 text-right flex-shrink-0">
            {row.count}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Sidebar Component ──────────────────────────────────────────────────────────
function Sidebar({
  collections,
  activeColId,
  activeSubId,
  onSelectCol,
  onSelectSub,
  onAddCollection,
  onAddSubcollection,
  onRenameCollection,
  onDeleteCollection,
  onRenameSubcollection,
  onDeleteSubcollection,
}) {
  const [expanded, setExpanded] = useState({});
  const [colMenu, setColMenu] = useState(null);
  const [subMenu, setSubMenu] = useState(null);

  useEffect(() => {
    const newExpanded = {};
    collections.forEach((c) => (newExpanded[c._id] = true));
    setExpanded(newExpanded);
  }, [collections]);

  const toggle = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  return (
    <aside className="w-60 flex-shrink-0 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Collections
        </span>
        <button
          onClick={onAddCollection}
          className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="flex-1 py-2 space-y-0.5 px-2">
        {collections.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-6">
            No collections yet
          </p>
        )}
        {collections.map((col) => {
          const color = getColor(col.colorId);
          const isColActive = activeColId === col._id && !activeSubId;
          return (
            <div key={col._id}>
              <div
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg group cursor-pointer relative ${isColActive ? `${color.light} ${color.border} border` : "hover:bg-slate-50 dark:hover:bg-slate-800/60"}`}
                onClick={() => {
                  toggle(col._id);
                  onSelectCol(col);
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(col._id);
                  }}
                  className="text-slate-400 hover:text-slate-600 flex-shrink-0"
                >
                  {expanded[col._id] ? (
                    <ChevronDown size={12} />
                  ) : (
                    <ChevronRight size={12} />
                  )}
                </button>
                <div
                  className={`w-5 h-5 rounded-md ${color.bg} flex items-center justify-center flex-shrink-0`}
                >
                  <Folder size={10} className="text-white" />
                </div>
                <span
                  className={`flex-1 text-xs font-semibold truncate ${isColActive ? color.text : "text-slate-700 dark:text-slate-300"}`}
                >
                  {col.name}
                </span>
                <span className="text-[10px] text-slate-400 flex-shrink-0">
                  {getMediaCount(col)}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setColMenu((p) => (p === col._id ? null : col._id));
                    setSubMenu(null);
                  }}
                  className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                >
                  <MoreHorizontal size={12} />
                </button>
                {colMenu === col._id && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-7 z-50 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 text-xs"
                  >
                    <button
                      onClick={() => {
                        onAddSubcollection(col);
                        setColMenu(null);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    >
                      <FolderPlus size={13} className="text-primary-500" /> Add
                      Subfolder
                    </button>
                    <button
                      onClick={() => {
                        onRenameCollection(col);
                        setColMenu(null);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    >
                      <Pencil size={13} className="text-slate-400" /> Rename
                    </button>
                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                    <button
                      onClick={() => {
                        onDeleteCollection(col);
                        setColMenu(null);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                )}
              </div>

              {expanded[col._id] &&
                col.subcollections.map((sc) => {
                  const isActive = activeSubId === sc.id;
                  return (
                    <div
                      key={sc.id}
                      className={`flex items-center gap-1.5 pl-8 pr-2 py-1.5 rounded-lg group cursor-pointer relative ml-1 ${isActive ? `${color.light} border ${color.border}` : "hover:bg-slate-50 dark:hover:bg-slate-800/60"}`}
                      onClick={() => onSelectSub(col, sc)}
                    >
                      <Folder
                        size={11}
                        className={isActive ? color.text : "text-slate-400"}
                      />
                      <span
                        className={`flex-1 text-[11px] font-medium truncate ${isActive ? color.text : "text-slate-600 dark:text-slate-400"}`}
                      >
                        {sc.name}
                      </span>
                      <span className="text-[10px] text-slate-400 flex-shrink-0">
                        {sc.media.length}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSubMenu((p) => (p === sc.id ? null : sc.id));
                          setColMenu(null);
                        }}
                        className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      >
                        <MoreHorizontal size={11} />
                      </button>
                      {subMenu === sc.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-7 z-50 w-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 text-xs"
                        >
                          <button
                            onClick={() => {
                              onRenameSubcollection(col, sc);
                              setSubMenu(null);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                          >
                            <Pencil size={13} className="text-slate-400" />{" "}
                            Rename
                          </button>
                          <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                          <button
                            onClick={() => {
                              onDeleteSubcollection(col, sc);
                              setSubMenu(null);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>

      <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={onAddCollection}
          className="w-full flex items-center gap-2 text-xs text-slate-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 px-3 py-2 rounded-lg transition-colors font-medium"
        >
          <Plus size={13} /> New Collection
        </button>
      </div>
    </aside>
  );
}

// ── Collections Root Component ─────────────────────────────────────────────────
function CollectionsRoot({ collections, onSelectCol, onAddCollection }) {
  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-4">
      <div>
        <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-3">
          All Collections
        </p>
        {collections.length === 0 ? (
          <EmptyState
            icon={Folder}
            title="No collections yet"
            description="Create a collection to organize your media files."
            action={
              <button onClick={onAddCollection} className="btn-primary gap-2">
                <Plus size={14} /> New Collection
              </button>
            }
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {collections.map((col) => {
              const color = getColor(col.colorId);
              const mediaCount = getMediaCount(col);
              return (
                <button
                  key={col._id}
                  onClick={() => onSelectCol(col)}
                  className="card p-4 text-left group hover:shadow-card-hover transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={`w-10 h-10 rounded-xl ${color.bg} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}
                    >
                      <Folder size={18} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {col.name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {col.subcollections.length} subfolder
                        {col.subcollections.length !== 1 ? "s" : ""} ·{" "}
                        {mediaCount} files
                      </p>
                    </div>
                    <ChevronRight
                      size={14}
                      className="text-slate-300 group-hover:text-slate-500 flex-shrink-0"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      {formatBytes(col.totalSize || 0)}
                    </span>
                    <div className={`w-2 h-2 rounded-full ${color.bg}`} />
                  </div>
                </button>
              );
            })}
            <button
              onClick={onAddCollection}
              className="card p-4 flex flex-col items-center justify-center gap-2.5 border-dashed border-2 border-slate-200 dark:border-slate-700 hover:border-primary-400 hover:bg-primary-50/30 dark:hover:bg-primary-900/10 transition-all min-h-[150px] cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 flex items-center justify-center transition-colors">
                <Plus
                  size={18}
                  className="text-slate-400 group-hover:text-primary-600 transition-colors"
                />
              </div>
              <p className="text-xs font-semibold text-slate-400 group-hover:text-primary-600 transition-colors">
                New Collection
              </p>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Collection Overview Component ──────────────────────────────────────────────
function CollectionOverview({
  collection,
  onSelectSub,
  onAddSubcollection,
  onRenameSubcollection,
  onDeleteSubcollection,
  onUploadToCollection,
  onUploadToSubcollection,
  onDeleteColMedia,
}) {
  const color = getColor(collection.colorId);
  const directMedia = collection.media || [];
  const [previewFile, setPreviewFile] = useState(null);
  const [fullscreenFile, setFullscreenFile] = useState(null);

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5">
      <div
        className={`flex items-center gap-4 p-4 rounded-2xl border ${color.border} ${color.light}`}
      >
        <div
          className={`w-12 h-12 rounded-xl ${color.bg} flex items-center justify-center flex-shrink-0`}
        >
          <Folder size={22} className="text-white" />
        </div>
        <div className="flex-1">
          <p className={`text-lg font-bold ${color.text}`}>{collection.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {collection.subcollections.length} subfolder
            {collection.subcollections.length !== 1 ? "s" : ""} ·{" "}
            {getMediaCount(collection)} files
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onUploadToCollection(collection)}
            className="btn-secondary btn-sm gap-1.5"
          >
            <Upload size={13} /> Upload Here
          </button>
          <button
            onClick={() => onAddSubcollection(collection)}
            className="btn-primary btn-sm gap-1.5"
          >
            <FolderPlus size={13} /> New Subfolder
          </button>
        </div>
      </div>

      {directMedia.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Files in this collection
            </p>
            <span className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full">
              {directMedia.length}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {directMedia.map((f) => {
              const cfg = typeConfig[f.type] || typeConfig.document;
              const Icon = cfg.icon;
              const isImage = f.type === "image";
              return (
                <div
                  key={f.id}
                  className="card p-3 group hover:shadow-card-hover transition-all"
                >
                  <div
                    className={`w-full aspect-square rounded-xl ${cfg.bg} flex items-center justify-center mb-2.5 overflow-hidden bg-slate-100 dark:bg-slate-800 relative`}
                  >
                    {isImage && f.fileUrl ? (
                      <img
                        src={resolveApiUrl(f.fileUrl)}
                        alt={f.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.style.display = "none";
                          if (e.nextElementSibling)
                            e.nextElementSibling.style.display = "flex";
                        }}
                      />
                    ) : null}
                    {(!isImage || !f.fileUrl) && (
                      <Icon
                        size={26}
                        className={cfg.accent}
                        strokeWidth={1.5}
                      />
                    )}
                  </div>
                  <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate mb-0.5">
                    {f.name}
                  </p>
                  <p className="text-[10px] text-slate-400 mb-2">{f.size}</p>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() =>
                        f.type === "image"
                          ? setFullscreenFile(f)
                          : setPreviewFile(f)
                      }
                      title="Preview"
                      className="flex-1 h-6 text-[10px] rounded-md flex items-center justify-center gap-1 text-slate-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                    >
                      <Eye size={10} /> View
                    </button>
                    <button
                      onClick={() => onDeleteColMedia(collection._id, f.id)}
                      title="Delete"
                      className="h-6 w-7 rounded-md flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              );
            })}
            <button
              onClick={() => onUploadToCollection(collection)}
              className="card p-3 flex flex-col items-center justify-center gap-2 border-dashed border-2 border-slate-200 dark:border-slate-700 hover:border-primary-400 hover:bg-primary-50/30 dark:hover:bg-primary-900/10 transition-all cursor-pointer aspect-square group"
            >
              <Plus
                size={16}
                className="text-slate-400 group-hover:text-primary-600 transition-colors"
              />
              <p className="text-[10px] text-slate-400 group-hover:text-primary-600 transition-colors">
                Upload
              </p>
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Subfolders
            </p>
            <span className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full">
              {collection.subcollections.length}
            </span>
          </div>
        </div>

        {collection.subcollections.length === 0 && directMedia.length === 0 ? (
          <EmptyState
            icon={FolderPlus}
            title="Collection is empty"
            description="Upload files directly or create subfolders to organize your media."
            action={
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => onUploadToCollection(collection)}
                  className="btn-secondary gap-2"
                >
                  <Upload size={14} /> Upload Files
                </button>
                <button
                  onClick={() => onAddSubcollection(collection)}
                  className="btn-primary gap-2"
                >
                  <FolderPlus size={14} /> New Subfolder
                </button>
              </div>
            }
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {collection.subcollections.map((sc) => (
              <div
                key={sc.id}
                className="card p-4 group hover:shadow-card-hover transition-all cursor-pointer relative"
                onClick={() => onSelectSub(collection, sc)}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`w-9 h-9 rounded-xl ${color.bg} flex items-center justify-center flex-shrink-0`}
                  >
                    <Folder size={16} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {sc.name}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {sc.media.length} files
                    </p>
                  </div>
                  <div
                    className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => onUploadToSubcollection(collection, sc)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                      title="Upload"
                    >
                      <Upload size={12} />
                    </button>
                    <button
                      onClick={() => onRenameSubcollection(collection, sc)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      title="Rename"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => onDeleteSubcollection(collection, sc)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                {sc.media.length > 0 ? (
                  <div className="grid grid-cols-4 gap-1">
                    {sc.media.slice(0, 4).map((m) => {
                      const cfg = typeConfig[m.type] || typeConfig.document;
                      const Icon = cfg.icon;
                      const isImage = m.type === "image";
                      return (
                        <div
                          key={m.id}
                          className={`aspect-square ${cfg.bg} rounded-md flex items-center justify-center overflow-hidden relative`}
                        >
                          {isImage && m.fileUrl ? (
                            <img
                              src={resolveApiUrl(m.fileUrl)}
                              alt={m.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.style.display = "none";
                                if (e.nextElementSibling)
                                  e.nextElementSibling.style.display = "flex";
                              }}
                            />
                          ) : null}
                          {(!isImage || !m.fileUrl) && (
                            <Icon
                              size={12}
                              className={cfg.accent}
                              strokeWidth={1.5}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-10 rounded-lg bg-slate-50 dark:bg-slate-800 border border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center">
                    <p className="text-[10px] text-slate-400">Empty</p>
                  </div>
                )}
              </div>
            ))}
            <button
              onClick={() => onAddSubcollection(collection)}
              className="card p-4 flex flex-col items-center justify-center gap-2 border-dashed border-2 border-slate-200 dark:border-slate-700 hover:border-primary-400 hover:bg-primary-50/30 dark:hover:bg-primary-900/10 transition-all cursor-pointer min-h-[110px] group"
            >
              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 flex items-center justify-center transition-colors">
                <Plus
                  size={16}
                  className="text-slate-400 group-hover:text-primary-600"
                />
              </div>
              <p className="text-xs font-semibold text-slate-400 group-hover:text-primary-600 transition-colors">
                New Subfolder
              </p>
            </button>
          </div>
        )}
      </div>

      {/* Preview Modals */}
      <PreviewModal
        open={!!previewFile}
        onClose={() => setPreviewFile(null)}
        file={previewFile}
      />
      <FullscreenViewer
        open={!!fullscreenFile}
        onClose={() => setFullscreenFile(null)}
        file={fullscreenFile}
      />
    </div>
  );
}

// ── Fullscreen Image Viewer Component ──────────────────────────────────────────
function FullscreenViewer({ open, onClose, file }) {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.addEventListener("keydown", handleEsc);
      return () => document.removeEventListener("keydown", handleEsc);
    }
  }, [open, onClose]);

  if (!open || !file) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 bg-white/10 hover:bg-white/20 p-3 rounded-full transition-colors"
      >
        <X size={24} className="text-white" />
      </button>

      {/* Image Container */}
      <div className="w-full h-full flex items-center justify-center p-4">
        {file.type === "image" && file.fileUrl ? (
          <img
            src={resolveApiUrl(file.fileUrl)}
            alt={file.name}
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <div className="text-white text-center">
            <FileText size={64} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg font-semibold">{file.name}</p>
            <p className="text-sm text-gray-400 mt-2">{file.size}</p>
          </div>
        )}
      </div>

      {/* Bottom Toolbar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md rounded-full px-4 py-3 flex gap-4">
        <button
          className="hover:bg-white/20 p-2 rounded-full transition-colors text-white"
          title="Download (Ctrl+S)"
        >
          <Download size={20} />
        </button>
        <div className="w-px bg-white/20" />
        <p className="text-white text-sm self-center">{file.name}</p>
        <div className="w-px bg-white/20" />
        <button
          onClick={onClose}
          className="hover:bg-white/20 p-2 rounded-full transition-colors text-white"
          title="Close (ESC)"
        >
          <X size={20} />
        </button>
      </div>

      {/* File Info Sidebar */}
      <div className="absolute left-4 top-4 bg-white/10 backdrop-blur-md rounded-2xl p-4 text-white max-w-xs">
        <h3 className="font-semibold mb-3">File Info</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="opacity-70">Name:</span>
            <span className="font-medium truncate">{file.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="opacity-70">Size:</span>
            <span className="font-medium">{file.size}</span>
          </div>
          <div className="flex justify-between">
            <span className="opacity-70">Type:</span>
            <span className="font-medium capitalize">{file.type}</span>
          </div>
          <div className="flex justify-between">
            <span className="opacity-70">Uploaded:</span>
            <span className="font-medium">
              {new Date(file.created).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Preview Modal Component ────────────────────────────────────────────────────
function PreviewModal({ open, onClose, file }) {
  if (!open || !file) return null;

  const cfg = typeConfig[file.type] || typeConfig.document;
  const Icon = cfg.icon;

  const renderPreview = () => {
    switch (file.type) {
      case "image":
        return (
          <div className="w-full max-h-96 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center overflow-hidden">
            {file.fileUrl ? (
              <img
                src={resolveApiUrl(file.fileUrl)}
                alt={file.name}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="flex items-center justify-center h-64">
                <Image size={64} className="text-slate-400" strokeWidth={1} />
              </div>
            )}
          </div>
        );

      case "video":
        return (
          <div className="w-full bg-black rounded-2xl flex items-center justify-center aspect-video overflow-hidden">
            <div className="flex flex-col items-center gap-3">
              <Film size={48} className="text-slate-400" strokeWidth={1} />
              <p className="text-sm text-slate-400">Video Preview</p>
            </div>
          </div>
        );

      case "pdf":
        return (
          <div
            className={`w-full aspect-video ${cfg.bg} rounded-2xl flex items-center justify-center`}
          >
            <div className="flex flex-col items-center gap-3">
              <FileText size={48} className={cfg.accent} strokeWidth={1} />
              <p className="text-sm text-slate-600 dark:text-slate-300">
                PDF Document
              </p>
            </div>
          </div>
        );

      case "audio":
        return (
          <div
            className={`w-full aspect-video ${cfg.bg} rounded-2xl flex items-center justify-center`}
          >
            <div className="flex flex-col items-center gap-3">
              <Music size={48} className={cfg.accent} strokeWidth={1} />
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Audio File
              </p>
            </div>
          </div>
        );

      default:
        return (
          <div
            className={`w-full aspect-video ${cfg.bg} rounded-2xl flex items-center justify-center`}
          >
            <div className="flex flex-col items-center gap-3">
              <Icon size={48} className={cfg.accent} strokeWidth={1} />
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Document
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={file.name}
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary btn-sm">
            Close
          </button>
          <button className="btn-primary btn-sm gap-2">
            <Download size={13} /> Download
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {renderPreview()}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <p className="text-[10px] text-slate-400 mb-0.5">Type</p>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {cfg.label}
            </p>
          </div>
          <div className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <p className="text-[10px] text-slate-400 mb-0.5">Size</p>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {file.size}
            </p>
          </div>
          <div className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <p className="text-[10px] text-slate-400 mb-0.5">Uploaded</p>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {new Date(file.created).toLocaleDateString()}
            </p>
          </div>
          <div className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <p className="text-[10px] text-slate-400 mb-0.5">Used In</p>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {file.usedIn > 0 ? `${file.usedIn} times` : "Not used"}
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ── Media Panel Component ──────────────────────────────────────────────────────
function MediaPanel({ subcollection, collection, onUpload, onDeleteMedia }) {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [previewFile, setPreviewFile] = useState(null);
  const [fullscreenFile, setFullscreenFile] = useState(null);
  const [displayCount, setDisplayCount] = useState(12); // Load 12 items initially
  const observerRef = useRef(null);
  const mediaListRef = useRef(null);

  const filtered = subcollection.media.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()),
  );
  const color = getColor(collection.colorId);
  const displayedMedia = filtered.slice(0, displayCount);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && displayCount < filtered.length) {
          setDisplayCount((prev) => prev + 12); // Load 12 more items
        }
      },
      { threshold: 0.1 },
    );

    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [displayCount, filtered.length]);

  // Lazy load images handler
  const handleImageLoad = (e) => {
    e.target.style.opacity = "1";
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="relative flex-1 max-w-xs">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            className="input pl-8 py-1.5 text-sm h-8"
            placeholder="Search files…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 ml-auto">
          {[
            ["grid", Grid],
            ["list", List],
          ].map(([v, Icon]) => (
            <button
              key={v}
              onClick={() => setViewMode(v)}
              className={`p-1.5 rounded-md transition-colors ${viewMode === v ? "bg-white dark:bg-slate-900 shadow-sm text-slate-800 dark:text-white" : "text-slate-400 hover:text-slate-600"}`}
            >
              <Icon size={13} />
            </button>
          ))}
        </div>
        <button
          onClick={onUpload}
          className="btn-primary btn-sm gap-1.5 h-8 text-xs"
        >
          <Upload size={13} /> Upload
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5" ref={mediaListRef}>
        {filtered.length === 0 ? (
          <EmptyState
            icon={ImagePlus}
            title={search ? "No files match" : "No files yet"}
            description={
              search
                ? "Try a different search."
                : "Upload files to this subfolder."
            }
            action={
              !search && (
                <button onClick={onUpload} className="btn-primary gap-2">
                  <Upload size={14} /> Upload Files
                </button>
              )
            }
          />
        ) : viewMode === "grid" ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {displayedMedia.map((f) => {
                const cfg = typeConfig[f.type] || typeConfig.document;
                const Icon = cfg.icon;
                const isImage = f.type === "image";

                return (
                  <div
                    key={f.id}
                    className={`card p-3 group hover:shadow-card-hover transition-all relative ${isImage ? "aspect-square" : ""}`}
                  >
                    {/* File Preview/Icon */}
                    <div
                      className={`w-full rounded-xl ${cfg.bg} flex items-center justify-center mb-2.5 ${isImage ? "aspect-square overflow-hidden bg-slate-100 dark:bg-slate-800" : "aspect-square"}`}
                    >
                      {isImage && f.fileUrl ? (
                        <img
                          src={resolveApiUrl(f.fileUrl)}
                          alt={f.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.style.display = "none";
                            if (e.nextElementSibling)
                              e.nextElementSibling.style.display = "flex";
                          }}
                        />
                      ) : null}
                      {(!isImage || !f.fileUrl) && (
                        <Icon
                          size={28}
                          className={cfg.accent}
                          strokeWidth={1.5}
                        />
                      )}
                    </div>

                    {/* File Info */}
                    <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate mb-0.5">
                      {f.name}
                    </p>
                    <p className="text-[10px] text-slate-400 mb-2">{f.size}</p>

                    {/* Actions */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() =>
                          f.type === "image"
                            ? setFullscreenFile(f)
                            : setPreviewFile(f)
                        }
                        title="Preview"
                        className="flex-1 h-6 text-[10px] rounded-md flex items-center justify-center gap-1 text-slate-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                      >
                        <Eye size={10} /> View
                      </button>
                      <button
                        onClick={() => onDeleteMedia(subcollection.id, f.id)}
                        title="Delete"
                        className="h-6 w-7 rounded-md flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Upload Button */}
              <button
                onClick={onUpload}
                className="card p-3 flex flex-col items-center justify-center gap-2 border-dashed border-2 border-slate-200 dark:border-slate-700 hover:border-primary-400 hover:bg-primary-50/30 dark:hover:bg-primary-900/10 transition-all cursor-pointer aspect-square group"
              >
                <Plus
                  size={18}
                  className="text-slate-400 group-hover:text-primary-600 transition-colors"
                />
                <p className="text-[10px] text-slate-400 group-hover:text-primary-600 transition-colors">
                  Upload
                </p>
              </button>
            </div>

            {/* Load More Indicator */}
            {displayCount < filtered.length && (
              <div
                ref={observerRef}
                className="flex items-center justify-center py-8 mt-4"
              >
                <div className="flex items-center gap-2 text-slate-500">
                  <Loader size={16} className="animate-spin" />
                  <span className="text-sm">Loading more...</span>
                </div>
              </div>
            )}

            {displayCount >= filtered.length && displayedMedia.length > 0 && (
              <div className="text-center py-6 text-slate-400 text-sm">
                ✓ All {filtered.length} files loaded
              </div>
            )}
          </>
        ) : (
          <>
            <div className="card overflow-hidden">
              <table className="table">
                <thead>
                  <tr>
                    <th>File</th>
                    <th>Type</th>
                    <th className="hidden sm:table-cell">Size</th>
                    <th className="hidden md:table-cell">Uploaded</th>
                    <th className="w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-900">
                  {displayedMedia.map((f) => {
                    const cfg = typeConfig[f.type] || typeConfig.document;
                    return (
                      <tr key={f.id}>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <FileTypeIcon type={f.type} size={13} />
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
                              {f.name}
                            </p>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.accent}`}
                          >
                            {cfg.label}
                          </span>
                        </td>
                        <td className="hidden sm:table-cell text-xs text-slate-500">
                          {f.size}
                        </td>
                        <td className="hidden md:table-cell text-xs text-slate-500">
                          {new Date(f.created).toLocaleDateString()}
                        </td>
                        <td>
                          <div className="flex gap-1">
                            <button
                              onClick={() =>
                                f.type === "image"
                                  ? setFullscreenFile(f)
                                  : setPreviewFile(f)
                              }
                              title="Preview"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                            >
                              <Eye size={12} />
                            </button>
                            <button
                              onClick={() =>
                                onDeleteMedia(subcollection.id, f.id)
                              }
                              title="Delete"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Load More for Table */}
            {displayCount < filtered.length && (
              <div className="flex justify-center py-4 mt-4">
                <button
                  onClick={() => setDisplayCount((prev) => prev + 12)}
                  className="btn-secondary btn-sm gap-2"
                >
                  <Loader size={12} /> Load More (
                  {filtered.length - displayCount} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <PreviewModal
        open={!!previewFile}
        onClose={() => setPreviewFile(null)}
        file={previewFile}
      />
      <FullscreenViewer
        open={!!fullscreenFile}
        onClose={() => setFullscreenFile(null)}
        file={fullscreenFile}
      />
    </div>
  );
}
