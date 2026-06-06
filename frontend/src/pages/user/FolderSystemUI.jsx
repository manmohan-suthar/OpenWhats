import { useState } from "react";
import {
  ChevronRight,
  FolderOpen,
  Folder,
  File,
  Image,
  FileText,
  Film,
  Music,
  HardDrive,
  Plus,
  Upload,
  Search,
  MoreVertical,
  Trash2,
  Copy,
  Download,
  Eye,
  ChevronDown,
  Home,
  Clock,
  Star,
  Settings,
  AlertCircle,
  X,
  CheckCircle2,
} from "lucide-react";

// Mock folder structure
const mockFolderStructure = {
  root: {
    id: "root",
    name: "My Files",
    type: "folder",
    parent: null,
    items: ["folder1", "folder2", "file1", "file2"],
    created: "2026-01-01",
    size: "12.4 GB",
  },
  folder1: {
    id: "folder1",
    name: "Projects",
    type: "folder",
    parent: "root",
    items: ["subfolder1", "file3", "file4"],
    created: "2026-02-15",
    size: "8.2 GB",
  },
  folder2: {
    id: "folder2",
    name: "Assets",
    type: "folder",
    parent: "root",
    items: ["file5", "file6", "file7"],
    created: "2026-03-10",
    size: "4.2 GB",
  },
  subfolder1: {
    id: "subfolder1",
    name: "Design Files",
    type: "folder",
    parent: "folder1",
    items: ["file8", "file9"],
    created: "2026-03-05",
    size: "2.1 GB",
  },
  file1: {
    id: "file1",
    name: "promo-banner.jpg",
    type: "image",
    parent: "root",
    size: "248 KB",
    created: "2026-04-10",
  },
  file2: {
    id: "file2",
    name: "product-catalog.pdf",
    type: "pdf",
    parent: "root",
    size: "1.2 MB",
    created: "2026-04-08",
  },
  file3: {
    id: "file3",
    name: "presentation.pptx",
    type: "document",
    parent: "folder1",
    size: "3.5 MB",
    created: "2026-04-05",
  },
  file4: {
    id: "file4",
    name: "video-demo.mp4",
    type: "video",
    parent: "folder1",
    size: "245 MB",
    created: "2026-03-28",
  },
  file5: {
    id: "file5",
    name: "logo.png",
    type: "image",
    parent: "folder2",
    size: "420 KB",
    created: "2026-03-20",
  },
  file6: {
    id: "file6",
    name: "brand-guide.pdf",
    type: "pdf",
    parent: "folder2",
    size: "2.1 MB",
    created: "2026-03-15",
  },
  file7: {
    id: "file7",
    name: "music-track.mp3",
    type: "audio",
    parent: "folder2",
    size: "8.5 MB",
    created: "2026-03-10",
  },
  file8: {
    id: "file8",
    name: "mockup-v2.sketch",
    type: "document",
    parent: "subfolder1",
    size: "1.3 GB",
    created: "2026-03-08",
  },
  file9: {
    id: "file9",
    name: "wireframe.figma",
    type: "document",
    parent: "subfolder1",
    size: "850 MB",
    created: "2026-03-05",
  },
};

const fileTypeConfig = {
  image: {
    icon: Image,
    color: "blue",
    accent: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-900/20",
  },
  pdf: {
    icon: FileText,
    color: "red",
    accent: "text-red-500",
    bg: "bg-red-50 dark:bg-red-900/20",
  },
  video: {
    icon: Film,
    color: "violet",
    accent: "text-violet-500",
    bg: "bg-violet-50 dark:bg-violet-900/20",
  },
  audio: {
    icon: Music,
    color: "emerald",
    accent: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
  },
  document: {
    icon: File,
    color: "amber",
    accent: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-900/20",
  },
};

function FileIcon({ type, size = 20 }) {
  const cfg = fileTypeConfig[type] || fileTypeConfig.document;
  const Icon = cfg.icon;
  return (
    <div
      className={`w-10 h-10 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0`}
    >
      <Icon size={size} className={cfg.accent} strokeWidth={1.8} />
    </div>
  );
}

function FolderTreeItem({
  folderId,
  structure,
  onNavigate,
  isExpanded,
  onToggleExpand,
  currentFolder,
}) {
  const folder = structure[folderId];
  const hasChildren = folder.items?.some(
    (id) => structure[id]?.type === "folder",
  );
  const isActive = currentFolder === folderId;

  const childFolders =
    folder.items?.filter((id) => structure[id]?.type === "folder") || [];

  return (
    <div>
      <button
        onClick={() => onNavigate(folderId)}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
          isActive
            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
        }`}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(folderId);
            }}
            className="p-0 flex-shrink-0"
          >
            <ChevronDown
              size={16}
              className={`transition-transform ${
                isExpanded?.[folderId] ? "" : "-rotate-90"
              }`}
            />
          </button>
        )}
        {!hasChildren && <div className="w-4" />}
        <Folder size={16} className="flex-shrink-0" />
        <span className="text-sm font-medium truncate flex-1 text-left">
          {folder.name}
        </span>
      </button>

      {isExpanded?.[folderId] && childFolders.length > 0 && (
        <div className="ml-2 border-l border-slate-200 dark:border-slate-700 pl-0">
          {childFolders.map((childId) => (
            <FolderTreeItem
              key={childId}
              folderId={childId}
              structure={structure}
              onNavigate={onNavigate}
              isExpanded={isExpanded}
              onToggleExpand={onToggleExpand}
              currentFolder={currentFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FileContextMenu({ item, onDelete, onCopy }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
      >
        <MoreVertical size={16} className="text-slate-400" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg z-20 py-1">
          <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
            <Eye size={14} /> Preview
          </button>
          <button
            onClick={() => {
              onCopy(item);
              setOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Copy size={14} /> Copy Link
          </button>
          <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
            <Download size={14} /> Download
          </button>
          <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
          <button
            onClick={() => {
              onDelete(item.id);
              setOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default function FolderSystemUI() {
  const [currentFolder, setCurrentFolder] = useState("root");
  const [expandedFolders, setExpandedFolders] = useState({ root: true });
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(null);
  const [structure] = useState(mockFolderStructure);

  const current = structure[currentFolder];
  const breadcrumbs = [];
  let folderId = currentFolder;
  while (folderId) {
    breadcrumbs.unshift(folderId);
    folderId = structure[folderId]?.parent;
  }

  const items = current.items?.map((id) => structure[id]) || [];
  const folders = items.filter((item) => item.type === "folder");
  const files = items.filter((item) => item.type !== "folder");

  const totalStorage = 42.5; // GB
  const storageLimit = 100; // GB
  const storagePercent = (totalStorage / storageLimit) * 100;

  const handleDelete = (id) => {
    console.log("Delete:", id);
  };

  const handleCopy = (item) => {
    setCopied(item.id);
    setTimeout(() => setCopied(null), 2000);
  };

  const toggleExpand = (folderId) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <HardDrive size={16} />
            My Storage
          </h2>
        </div>

        {/* Quick Access */}
        <div className="px-3 py-3 border-b border-slate-200 dark:border-slate-800 space-y-1">
          <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <Home size={16} /> Home
          </button>
          <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <Clock size={16} /> Recent
          </button>
          <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <Star size={16} /> Starred
          </button>
        </div>

        {/* Folder Tree */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          <p className="text-xs font-semibold text-slate-500 uppercase px-2 mb-2">
            Folders
          </p>
          <FolderTreeItem
            folderId="root"
            structure={structure}
            onNavigate={setCurrentFolder}
            isExpanded={expandedFolders}
            onToggleExpand={toggleExpand}
            currentFolder={currentFolder}
          />
        </div>

        {/* Storage Info */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Storage
            </span>
            <span className="text-xs font-semibold text-slate-900 dark:text-white">
              {storagePercent.toFixed(0)}%
            </span>
          </div>
          <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                storagePercent > 80
                  ? "bg-red-500"
                  : storagePercent > 60
                    ? "bg-yellow-500"
                    : "bg-blue-500"
              }`}
              style={{ width: `${storagePercent}%` }}
            />
          </div>
          <p className="text-xs text-slate-500">
            {totalStorage.toFixed(1)} GB of {storageLimit} GB
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex-1">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1 mb-3">
              {breadcrumbs.map((id, idx) => (
                <button
                  key={id}
                  onClick={() => setCurrentFolder(id)}
                  className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  {idx === 0 ? <Home size={14} /> : <FolderOpen size={14} />}
                  <span>{structure[id].name}</span>
                  {idx < breadcrumbs.length - 1 && <ChevronRight size={14} />}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative max-w-xs">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search files..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <Plus size={18} className="text-slate-600 dark:text-slate-400" />
            </button>
            <button className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium">
              <Upload size={14} /> Upload
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Folders Grid */}
          {folders.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                Folders
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => setCurrentFolder(folder.id)}
                    className="group p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 text-left"
                  >
                    <div className="w-full aspect-square rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 flex items-center justify-center mb-3">
                      <FolderOpen
                        size={32}
                        className="text-blue-500 dark:text-blue-400"
                      />
                    </div>
                    <p className="font-medium text-sm text-slate-900 dark:text-white truncate">
                      {folder.name}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{folder.size}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Files Grid */}
          {files.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                Files
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {files.map((file) => {
                  const cfg =
                    fileTypeConfig[file.type] || fileTypeConfig.document;
                  return (
                    <div
                      key={file.id}
                      className="group p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200"
                    >
                      <div className="w-full aspect-square rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center mb-3 relative overflow-hidden">
                        <FileIcon type={file.type} size={28} />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg" />
                      </div>
                      <p className="font-medium text-sm text-slate-900 dark:text-white truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">{file.size}</p>

                      {/* Hover actions */}
                      <div className="mt-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleCopy(file)}
                          className={`flex-1 px-2 py-1 text-xs rounded-md font-medium transition-colors ${
                            copied === file.id
                              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                              : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"
                          }`}
                        >
                          {copied === file.id ? (
                            <CheckCircle2 size={12} className="inline mr-1" />
                          ) : (
                            <Copy size={12} className="inline mr-1" />
                          )}
                          {copied === file.id ? "Copied" : "Copy"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {folders.length === 0 && files.length === 0 && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <FolderOpen
                  size={48}
                  className="text-slate-300 dark:text-slate-700 mx-auto mb-3"
                />
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  This folder is empty
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
