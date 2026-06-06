import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Handle, Position } from "reactflow";
import {
  Table2,
  Plus,
  Trash2,
  Eye,
  FilePlus,
  Pencil,
  Copy,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Variable,
  X,
  RefreshCw,
  ChevronDown,
  FileSpreadsheet,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { authFetch } from "../../services/authFetch";
import NodeActionBar from "./NodeActionBar";

// ─── OAuth Scopes & Utilities ─────────────────────────────────────────────────

const SHEETS_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
].join(" ");

function loadGsiScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve();
    if (document.getElementById("gsi-script")) {
      const wait = () => {
        if (window.google?.accounts?.oauth2) resolve();
        else setTimeout(wait, 100);
      };
      return wait();
    }
    const s = document.createElement("script");
    s.id = "gsi-script";
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error("Failed to load Google Identity Services. Check internet connection."));
    document.head.appendChild(s);
  });
}

async function apiFetch(url, token) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

async function fetchUserInfo(token) {
  return apiFetch("https://www.googleapis.com/oauth2/v2/userinfo", token);
}

async function fetchUserSheets(token) {
  const data = await apiFetch(
    "https://www.googleapis.com/drive/v3/files?q=mimeType%3D'application%2Fvnd.google-apps.spreadsheet'&fields=files(id%2Cname%2CmodifiedTime)&orderBy=modifiedTime+desc&pageSize=50",
    token,
  );
  return data.files || [];
}

async function fetchSheetTabs(token, spreadsheetId) {
  const data = await apiFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
    token,
  );
  return (data.sheets || []).map((s) => s.properties.title);
}

async function createSheet(token, title) {
  const res = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ properties: { title } }),
  });
  if (!res.ok) throw new Error(`Failed to create sheet: HTTP ${res.status}`);
  return res.json();
}

// ─── Module-level session cache ───────────────────────────────────────────────
// Lives as long as the JS module is loaded (single browser tab).
// Survives component unmount → remount, resets only on full page refresh.

let _cachedClientId = "";

let _cachedToken = null; // { accessToken, expiresAt, email, name, picture }

/** Returns _cachedToken only if it has ≥ 60 s remaining, else null. */
export function getValidCachedToken() {
  if (!_cachedToken?.accessToken) return null;
  return new Date(_cachedToken.expiresAt).getTime() - 60_000 > Date.now()
    ? _cachedToken
    : null;
}

function setCachedToken(accessToken, expiresIn, info = {}) {
  _cachedToken = {
    accessToken,
    expiresAt: new Date(Date.now() + (Number(expiresIn) || 3600) * 1000),
    email: info.email || "",
    name: info.name || "",
    picture: info.picture || "",
  };
}

// ─── Node Config ──────────────────────────────────────────────────────────────

export const GoogleSheetsNodeConfig = {
  label: "Google Sheets",
  icon: Table2,
  accent: "#0a8c4e",
  defaults: {
    // OAuth
    connectionStatus: "disconnected",
    connectedEmail: "",
    connectedName: "",
    connectedPicture: "",
    // Spreadsheet
    spreadsheetId: "",
    spreadsheetName: "",
    sheetName: "Sheet1",
    // Action
    action: "read",
    readRange: "A:Z",
    readFilterColumn: "",
    readFilterValue: "",
    readRowNumber: "",
    readLimit: "1",
    readHeaders: "",
    appendColumns: [{ id: "col_init", column: "", label: "", value: "" }],
    updateFilterColumn: "A",
    updateFilterValue: "",
    updateColumns: [{ id: "upd_init", column: "", label: "", value: "" }],
    deleteFilterColumn: "A",
    deleteFilterValue: "",
    outputPrefix: "sheets",
  },
};

// ─── Shared Styles ────────────────────────────────────────────────────────────

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-slate-200/30 dark:border-slate-700/30 bg-white/5 dark:bg-slate-900/5 backdrop-blur-md text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#0a8c4e]/40 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500";

// ─── Action Metadata ──────────────────────────────────────────────────────────

const ACTION_META = {
  read: {
    label: "Read",
    icon: Eye,
    active: "bg-blue-600 text-white shadow-md shadow-blue-500/20",
    inactive: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 hover:opacity-80",
    canvasBadge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  },
  append: {
    label: "Append",
    icon: FilePlus,
    active: "bg-emerald-600 text-white shadow-md shadow-emerald-500/20",
    inactive: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 hover:opacity-80",
    canvasBadge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  update: {
    label: "Update",
    icon: Pencil,
    active: "bg-amber-600 text-white shadow-md shadow-amber-500/20",
    inactive: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300 hover:opacity-80",
    canvasBadge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  },
  delete: {
    label: "Delete",
    icon: Trash2,
    active: "bg-red-600 text-white shadow-md shadow-red-500/20",
    inactive: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 hover:opacity-80",
    canvasBadge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function genId() {
  return `col_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
}

function GoogleIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z" />
      <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z" />
      <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z" />
      <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z" />
    </svg>
  );
}

function SectionHeader({ children, badge, badgeColor }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 flex-shrink-0">
        {children}
      </p>
      {badge && (
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${badgeColor || "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
          {badge}
        </span>
      )}
      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
    </div>
  );
}

// ─── Variable Picker Input ────────────────────────────────────────────────────
// An <input> with a small toggle button that opens a searchable variable list.

const SYSTEM_VARS = [
  { key: "user.phone", source: "system" },
  { key: "user.message", source: "system" },
  { key: "user.name", source: "system" },
  { key: "user.reply", source: "system" },
];

const SOURCE_LABELS = {
  system: "System",
  input: "User Input",
  "input.split": "Split Variables",
  api: "API Response",
  "sheets.read": "Sheets Read",
  sheets: "Sheets",
};

function VarPickerInput({
  value,
  onChange,
  placeholder,
  inputClassName = "",
  wrapClassName = "relative w-full",
  flowVariables = [],
  externalInputRef = null, // optional ref for cursor-position insertion
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [dropRect, setDropRect] = useState(null);
  const btnRef = useRef(null);
  const dropRef = useRef(null);

  // Recompute dropdown position whenever it opens or the window scrolls/resizes
  useEffect(() => {
    if (!open) return;

    function reposition() {
      if (!btnRef.current) return;
      const r = btnRef.current.getBoundingClientRect();
      setDropRect({ top: r.bottom + 4, left: r.left, width: Math.max(r.width + 120, 260) });
    }

    reposition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function outside(e) {
      if (
        btnRef.current && !btnRef.current.contains(e.target) &&
        dropRef.current && !dropRef.current.contains(e.target)
      ) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [open]);

  const allVars = [...SYSTEM_VARS, ...flowVariables].filter(
    (v, i, arr) => v?.key && arr.findIndex((x) => x.key === v.key) === i,
  );

  const filtered = search
    ? allVars.filter((v) => v.key.toLowerCase().includes(search.toLowerCase()))
    : allVars;

  const sources = [...new Set(filtered.map((v) => v.source || "other"))];

  function insert(key) {
    const snippet = `{{${key}}}`;
    const el = externalInputRef?.current;
    if (el) {
      const start = el.selectionStart ?? (value || "").length;
      const end = el.selectionEnd ?? (value || "").length;
      const before = (value || "").slice(0, start);
      const after = (value || "").slice(end);
      onChange(before + snippet + after);
      requestAnimationFrame(() => {
        if (el) {
          el.selectionStart = el.selectionEnd = start + snippet.length;
          el.focus();
        }
      });
    } else {
      onChange((value || "") + snippet);
    }
    setOpen(false);
    setSearch("");
  }

  // Dropdown rendered via portal → escapes sidebar's overflow-y:auto clipping
  const dropdown =
    open && dropRect
      ? createPortal(
          <div
            ref={dropRef}
            style={{
              position: "fixed",
              top: dropRect.top,
              left: dropRect.left,
              width: dropRect.width,
              zIndex: 9999,
            }}
            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden"
          >
            {/* Search bar */}
            <div className="px-2.5 pt-2 pb-1.5 border-b border-slate-100 dark:border-slate-700/60">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search variables…"
                autoFocus
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-600/60 bg-slate-50 dark:bg-slate-700/50 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-400/50 placeholder:text-slate-400"
              />
            </div>

            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-[11px] text-slate-400 italic text-center">
                {allVars.length === 0
                  ? "No variables yet — add User Input or Google Sheets Read nodes."
                  : "No match."}
              </p>
            ) : (
              <div className="max-h-52 overflow-y-auto p-1.5">
                {sources.map((src) => {
                  const group = filtered.filter((v) => (v.source || "other") === src);
                  if (!group.length) return null;
                  return (
                    <div key={src}>
                      <p className="px-2 pt-2 pb-0.5 text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                        {SOURCE_LABELS[src] || src}
                      </p>
                      {group.map((v) => (
                        <button
                          key={v.key}
                          type="button"
                          onMouseDown={(e) => {
                            // prevent blur on input before insert
                            e.preventDefault();
                            insert(v.key);
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                        >
                          <span className="text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-300">
                            {`{{${v.key}}}`}
                          </span>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={wrapClassName}>
      <input
        ref={externalInputRef || undefined}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${inputClassName} !pr-12`}
      />
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Insert variable"
        className={`absolute right-1 top-1/2 -translate-y-1/2 px-1.5 py-1 rounded flex items-center gap-0.5 transition-colors ${
          open
            ? "text-emerald-600 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40"
            : "text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
        }`}
      >
        <Variable size={11} />
        <ChevronDown size={8} className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>

      {dropdown}
    </div>
  );
}

// ─── Column-Value Row ─────────────────────────────────────────────────────────
// Card layout — variable chips insert at cursor position (not append-only)

const BASE_QUICK_VARS = [
  { key: "user_input" },
  { key: "user.phone" },
  { key: "user.message" },
];

function ColValueRow({
  item,
  onChange,
  onRemove,
  valPlaceholder = "Value or {{variable}}",
  showLabel = false,
  flowVariables = [],
}) {
  const inputRef = useRef(null);

  function insertVar(key) {
    const el = inputRef.current;
    const snippet = `{{${key}}}`;
    if (!el) {
      onChange({ ...item, value: (item.value || "") + snippet });
      return;
    }
    const start = el.selectionStart ?? (item.value || "").length;
    const end = el.selectionEnd ?? (item.value || "").length;
    const before = (item.value || "").slice(0, start);
    const after = (item.value || "").slice(end);
    onChange({ ...item, value: before + snippet + after });
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.selectionStart =
          inputRef.current.selectionEnd = start + snippet.length;
        inputRef.current.focus();
      }
    });
  }

  const extraVars = (flowVariables || [])
    .filter((v) => v?.key && !BASE_QUICK_VARS.find((b) => b.key === v.key))
    .slice(0, 4);
  const quickVars = [...BASE_QUICK_VARS, ...extraVars];

  return (
    <div className="rounded-xl border border-slate-200/50 dark:border-slate-700/40 bg-white dark:bg-slate-800/50 shadow-sm overflow-hidden">
      {/* Header row: column letter + optional label + delete */}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50/70 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-700/30">
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 flex-shrink-0">
          Col
        </span>
        <input
          type="text"
          value={item.column}
          onChange={(e) =>
            onChange({ ...item, column: e.target.value.toUpperCase() })
          }
          placeholder="A"
          maxLength={2}
          title="Spreadsheet column letter (A, B, C…)"
          className="w-9 h-7 px-0 rounded-md border border-slate-200/70 dark:border-slate-600/60 bg-white dark:bg-slate-800 text-xs font-mono font-bold uppercase text-center text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0a8c4e]/40 flex-shrink-0"
        />
        {showLabel && (
          <>
            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
            <input
              type="text"
              value={item.label || ""}
              onChange={(e) => onChange({ ...item, label: e.target.value })}
              placeholder="Label (optional)"
              className="flex-1 h-7 px-2 rounded-md border-0 bg-transparent text-[11px] text-slate-500 dark:text-slate-400 focus:outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
            />
          </>
        )}
        {!showLabel && <div className="flex-1" />}
        <button
          onClick={onRemove}
          title="Remove row"
          className="flex-shrink-0 p-1 rounded-md text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Value field */}
      <div className="px-3 pt-2.5 pb-3 space-y-2">
        <VarPickerInput
          value={item.value}
          onChange={(v) => onChange({ ...item, value: v })}
          placeholder={valPlaceholder}
          inputClassName="w-full px-2.5 py-2 rounded-lg border border-slate-200/60 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-900/40 text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0a8c4e]/40 focus:border-[#0a8c4e]/30 placeholder:text-slate-300 dark:placeholder:text-slate-600 transition-all"
          wrapClassName="relative w-full"
          flowVariables={flowVariables}
          externalInputRef={inputRef}
        />

        {/* Quick-insert variable chips — click to insert at cursor */}
        <div className="flex flex-wrap gap-1">
          {quickVars.map((v) => (
            <button
              key={v.key}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                insertVar(v.key);
              }}
              title={`Insert {{${v.key}}} at cursor`}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-semibold border transition-colors select-none bg-white dark:bg-slate-800 border-[#0a8c4e]/25 text-[#0a8c4e] dark:text-emerald-400 hover:bg-[#0a8c4e]/10 hover:border-[#0a8c4e]/50"
            >
              <Variable size={7} className="flex-shrink-0" />
              {v.key}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Canvas Node ──────────────────────────────────────────────────────────────

export function GoogleSheetsFlowNode({ id, data, selected }) {
  const action = data.action || "read";
  const actionMeta = ACTION_META[action] || ACTION_META.read;
  const ActionIcon = actionMeta.icon;
  const isConnected = data.connectionStatus === "connected";
  const prefix = data.outputPrefix || "sheets";
  const executionState = data.executionState;
  const isExecuting = ["active", "loading", "success", "error"].includes(executionState);

  const execTone =
    executionState === "error"
      ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300"
      : executionState === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
      : "border-[#0a8c4e]/30 bg-[#0a8c4e]/5 text-[#0a8c4e] dark:border-[#0a8c4e]/40 dark:bg-[#0a8c4e]/10";

  return (
    <div
      className={`group relative min-w-[240px] max-w-[270px] rounded-2xl border bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-[0_14px_30px_rgba(2,6,23,0.1)] dark:shadow-[0_14px_30px_rgba(0,0,0,0.45)] transition-all duration-200 ${
        isExecuting
          ? "ring-2 ring-[#0a8c4e]/70 ring-offset-2 ring-offset-white dark:ring-offset-slate-950 scale-[1.02] animate-pulse"
          : selected
          ? "ring-2 ring-[#0a8c4e] ring-offset-2 ring-offset-white dark:ring-offset-slate-950"
          : "hover:shadow-[0_18px_38px_rgba(2,6,23,0.16)]"
      }`}
      style={{ borderColor: "#0a8c4e44" }}
    >
      <NodeActionBar nodeId={id} />
      <Handle type="target" position="top" className="!w-3 !h-3 !bg-slate-500 !border-2 !border-white dark:!border-slate-900" />

      <div className="p-3.5">
        {/* Header */}
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-[#0a8c4e] flex items-center justify-center flex-shrink-0 shadow-sm">
            <Table2 size={15} className="text-white" />
          </div>
          <div className="min-w-0 flex-1 pr-[120px]">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Google Sheets</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">#{id.slice(-6)}</p>
          </div>
        </div>

        {/* Action badge + sheet name */}
        <div className="mt-3 flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${actionMeta.canvasBadge}`}>
            <ActionIcon size={9} />
            {actionMeta.label.toUpperCase()}
          </span>
          <span className="text-[11px] text-slate-600 dark:text-slate-300 truncate font-medium">
            {data.spreadsheetName || (data.spreadsheetId ? `ID: ${data.spreadsheetId.slice(0, 12)}…` : "No sheet selected")}
          </span>
        </div>

        {/* Tab + connection status row */}
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 truncate">
            {data.spreadsheetId ? (data.sheetName || "Sheet1") : "—"}
          </span>
          <div className={`flex-shrink-0 flex items-center gap-1.5 text-[10px] font-medium ${isConnected ? "text-[#0a8c4e]" : "text-slate-400 dark:text-slate-500"}`}>
            {isConnected && data.connectedPicture ? (
              <img src={data.connectedPicture} alt="" className="w-4 h-4 rounded-full" />
            ) : (
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-[#0a8c4e] animate-pulse" : "bg-slate-300 dark:bg-slate-600"}`} />
            )}
            <span className="truncate max-w-[90px]">
              {isConnected ? (data.connectedEmail?.split("@")[0] || "Connected") : "Not connected"}
            </span>
          </div>
        </div>

        {/* Variable badge */}
        <div className="mt-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#0a8c4e]/10 dark:bg-[#0a8c4e]/20 border border-[#0a8c4e]/20 dark:border-[#0a8c4e]/30 px-2 py-0.5 text-[10px] font-mono font-semibold text-[#0a8c4e] dark:text-emerald-300">
            <Variable size={9} />
            {`{{${prefix}.*}}`}
          </span>
        </div>

        {/* Execution overlay */}
        {data.executionTitle && (
          <div className={`mt-3 rounded-xl border px-3 py-2 shadow-sm ${execTone}`}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-80">{data.executionTitle}</p>
              {executionState && (
                <span className="rounded-full bg-white/60 dark:bg-black/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                  {executionState}
                </span>
              )}
            </div>
            {data.executionMessage && <p className="mt-1 text-sm font-medium break-words">{data.executionMessage}</p>}
            {data.executionDetail && <p className="mt-1 text-[11px] opacity-80 break-words">{data.executionDetail}</p>}
          </div>
        )}
      </div>

      <Handle type="source" position="bottom" className="!w-3 !h-3 !bg-slate-600 !border-2 !border-white dark:!border-slate-900" />
    </div>
  );
}

// ─── Sidebar Editor ───────────────────────────────────────────────────────────

export function GoogleSheetsNodeEditor({ data, onUpdate, flowVariables = [] }) {
  // ── State — seeded from module cache so remounts are instant ─────────────
  // getValidCachedToken() is synchronous: if user was connected in this tab,
  // these all initialise to the correct values on first render. Zero flash.
  const _boot = getValidCachedToken();

  const [accessToken, setAccessToken]   = useState(() => _boot?.accessToken || "");
  const [connectStatus, setConnectStatus] = useState(() => _boot ? "connected" : "idle");
  const [connectError, setConnectError] = useState("");
  const [userInfo, setUserInfo]         = useState(() => _boot ? { email: _boot.email, name: _boot.name, picture: _boot.picture } : null);
  const oauthClientRef                  = useRef(null);

  const [clientId, setClientId]         = useState(() => _cachedClientId);
  const [clientIdError, setClientIdError] = useState("");

  // initializing = true only when we need async work; false immediately if cache hit
  const [initializing, setInitializing] = useState(() => !_boot || !_cachedClientId);

  // Sheet picker
  const [sheetsList, setSheetsList]     = useState([]);
  const [sheetsLoading, setSheetsLoading] = useState(false);
  const [sheetsError, setSheetsError]   = useState("");
  const [tabsList, setTabsList]         = useState([]);
  const [tabsLoading, setTabsLoading]   = useState(false);

  // Create new sheet
  const [showCreate, setShowCreate]     = useState(false);
  const [newSheetName, setNewSheetName] = useState("");
  const [creating, setCreating]         = useState(false);
  const [createError, setCreateError]   = useState("");

  // Sheet data preview (READ section)
  const [previewRows, setPreviewRows]   = useState(null); // null = not fetched, [] = empty
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  const isConnected = !!accessToken;
  const hasSheet    = !!data.spreadsheetId;
  const action      = data.action || "read";
  const prefix      = data.outputPrefix || "sheets";

  // ── Effect: load tabs when spreadsheetId is already set but tabsList is empty ──
  useEffect(() => {
    if (accessToken && data.spreadsheetId && tabsList.length === 0 && !tabsLoading) {
      loadTabs(accessToken, data.spreadsheetId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, data.spreadsheetId]);

  // ── Effect: sync parent node + load sheets (cache hit), or full async init ──
  useEffect(() => {
    const cached = getValidCachedToken();

    // FAST PATH — module cache valid: sync parent, load sheets, done
    if (cached && _cachedClientId) {
      onUpdate({
        connectionStatus: "connected",
        connectedEmail:   cached.email,
        connectedName:    cached.name,
        connectedPicture: cached.picture || "",
      });
      setInitializing(false);
      loadSheets(cached.accessToken);
      // Re-sync token to DB so simulation and real flows always find it
      saveTokenToDb(cached.accessToken, Math.floor((new Date(cached.expiresAt).getTime() - Date.now()) / 1000), { email: cached.email, name: cached.name, picture: cached.picture });
      return;
    }

    // SLOW PATH — first visit this tab or page refresh: fetch from server
    let cancelled = false;

    async function init() {
      // Step 1: client ID
      let cid = _cachedClientId;
      if (!cid) {
        try {
          const res = await authFetch("/api/settings/google-client-id");
          if (cancelled) return;
          if (!res.data?.clientId) {
            setClientIdError("Google OAuth is not configured. Ask your admin (Admin → Google OAuth).");
            setInitializing(false);
            return;
          }
          if (!res.data?.enabled) {
            setClientIdError("Google OAuth is disabled by your admin.");
            setInitializing(false);
            return;
          }
          cid = res.data.clientId;
          _cachedClientId = cid;           // cache for this tab session
          setClientId(cid);
        } catch {
          if (!cancelled) { setClientIdError("Could not load Google OAuth config."); setInitializing(false); }
          return;
        }
      }

      // Step 2: saved token in DB
      try {
        const conn = await authFetch("/api/settings/google-connection");
        if (cancelled) return;

        if (!conn.data?.connected) { setInitializing(false); return; }

        const { accessToken: saved, expired, email, name, picture } = conn.data;

        if (!expired) {
          // Valid — restore, update cache, done
          setCachedToken(saved, 3600, { email, name, picture });
          setAccessToken(saved);
          setConnectStatus("connected");
          setUserInfo({ email, name, picture });
          onUpdate({ connectionStatus: "connected", connectedEmail: email, connectedName: name, connectedPicture: picture || "" });
          setInitializing(false);
          loadSheets(saved);
          return;
        }

        // Step 3: expired — silent refresh (no popup)
        try {
          await loadGsiScript();
          if (cancelled) return;

          let done = false;
          const giveUp = setTimeout(() => { if (!done && !cancelled) setInitializing(false); }, 5000);

          window.google.accounts.oauth2.initTokenClient({
            client_id: cid,
            scope: SHEETS_SCOPES,
            prompt: "none",
            hint: email,
            callback: async (response) => {
              done = true;
              clearTimeout(giveUp);
              if (cancelled) return;
              if (response.error) { setInitializing(false); return; }

              const token = response.access_token;
              setCachedToken(token, response.expires_in, { email, name, picture });
              setAccessToken(token);
              setConnectStatus("connected");
              setUserInfo({ email, name, picture });
              onUpdate({ connectionStatus: "connected", connectedEmail: email, connectedName: name, connectedPicture: picture || "" });
              setInitializing(false);
              saveTokenToDb(token, response.expires_in, { email, name, picture });
              loadSheets(token);
            },
          }).requestAccessToken();
        } catch { if (!cancelled) setInitializing(false); }

      } catch { if (!cancelled) setInitializing(false); }
    }

    init();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Save token to backend DB (fire-and-forget) ────────────────────────────
  async function saveTokenToDb(token, expiresIn, info) {
    const safeInfo = (info && typeof info === "object") ? info : {};
    try {
      await authFetch("/api/settings/google-connection", {
        method: "POST",
        body: {
          accessToken: token,
          expiresIn: expiresIn || 3600,
          email: safeInfo.email || "",
          name: safeInfo.name || "",
          picture: safeInfo.picture || "",
        },
      });
    } catch { /* non-critical */ }
  }

  // ── Load sheets after connect ───────────────────────────────────────────────

  const loadSheets = useCallback(
    async (token) => {
      setSheetsLoading(true);
      setSheetsError("");
      try {
        const files = await fetchUserSheets(token);
        setSheetsList(files);
      } catch (err) {
        setSheetsError(err.message);
      } finally {
        setSheetsLoading(false);
      }
    },
    [],
  );

  // ── Load tabs when sheet is selected ───────────────────────────────────────

  const loadTabs = useCallback(async (token, spreadsheetId) => {
    if (!token || !spreadsheetId) return;
    setTabsLoading(true);
    try {
      const tabs = await fetchSheetTabs(token, spreadsheetId);
      setTabsList(tabs);
      if (tabs.length && !data.sheetName) {
        onUpdate({ sheetName: tabs[0] });
      }
    } catch {
      setTabsList([]);
    } finally {
      setTabsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Google OAuth Connect ────────────────────────────────────────────────────
  // IMPORTANT: This function MUST be called directly from a button onClick
  // so the popup is triggered by a real user interaction.

  async function handleConnect() {
    if (!clientId) {
      setConnectError(clientIdError || "Google OAuth Client ID not configured. Contact your admin.");
      return;
    }
    setConnectError("");
    setConnectStatus("loading");

    try {
      await loadGsiScript();

      oauthClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SHEETS_SCOPES,
        callback: async (response) => {
          if (response.error) {
            setConnectStatus("error");
            setConnectError(response.error_description || response.error);
            return;
          }

          const token = response.access_token;
          setAccessToken(token);
          setConnectStatus("connected");

          // Fetch user's Google account info
          let info = null;
          try {
            info = await fetchUserInfo(token);
            setUserInfo(info);
            onUpdate({ connectionStatus: "connected", connectedEmail: info.email, connectedName: info.name, connectedPicture: info.picture || "" });
          } catch {
            onUpdate({ connectionStatus: "connected", connectedEmail: "Connected" });
          }

          // Save to module cache (instant restore on next remount)
          setCachedToken(token, response.expires_in || 3600, info || {});
          // Save to DB (persists across page refreshes)
          saveTokenToDb(token, response.expires_in, info);

          await loadSheets(token);
        },
      });

      // 🔥 This opens the real Google OAuth popup
      oauthClientRef.current.requestAccessToken();
    } catch (err) {
      setConnectStatus("error");
      setConnectError(err.message);
    }
  }

  function handleDisconnect() {
    if (accessToken && window.google?.accounts?.oauth2) {
      try { window.google.accounts.oauth2.revoke(accessToken, () => {}); } catch { /* noop */ }
    }
    // Clear module cache + DB
    _cachedToken = null;
    authFetch("/api/settings/google-connection", { method: "DELETE" }).catch(() => {});

    setAccessToken("");
    setUserInfo(null);
    setSheetsList([]);
    setTabsList([]);
    setConnectStatus("idle");
    setConnectError("");
    onUpdate({
      connectionStatus: "disconnected",
      connectedEmail: "",
      connectedName: "",
      connectedPicture: "",
      spreadsheetId: "",
      spreadsheetName: "",
    });
  }

  async function handleSelectSheet(sheet) {
    onUpdate({ spreadsheetId: sheet.id, spreadsheetName: sheet.name, sheetName: "" });
    await loadTabs(accessToken, sheet.id);
  }

  function handleChangeSheet() {
    onUpdate({ spreadsheetId: "", spreadsheetName: "", sheetName: "Sheet1" });
    setTabsList([]);
  }

  async function handleCreateSheet() {
    if (!newSheetName.trim()) return;
    setCreating(true);
    setCreateError("");
    try {
      const created = await createSheet(accessToken, newSheetName.trim());
      const sheet = { id: created.spreadsheetId, name: newSheetName.trim() };
      setSheetsList((prev) => [sheet, ...prev]);
      await handleSelectSheet(sheet);
      setNewSheetName("");
      setShowCreate(false);
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleRefreshSheets() {
    if (!accessToken) return;
    await loadSheets(accessToken);
  }

  // ── Preview sheet data (READ section) ──────────────────────────────────────
  async function handlePreview() {
    if (!accessToken || !data.spreadsheetId) return;
    setPreviewLoading(true);
    setPreviewError("");
    setPreviewRows(null);
    try {
      const sheetName = data.sheetName || "Sheet1";
      const range = data.readRange || "A:Z";
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${data.spreadsheetId}/values/${encodeURIComponent(sheetName + "!" + range)}`;
      const result = await apiFetch(url, accessToken);
      setPreviewRows((result.values || []).slice(0, 8));
    } catch (err) {
      setPreviewError(err.message);
    } finally {
      setPreviewLoading(false);
    }
  }

  // ── Column row helpers ──────────────────────────────────────────────────────

  function addRow(field) {
    onUpdate({ [field]: [...(data[field] || []), { id: genId(), column: "", label: "", value: "" }] });
  }
  function removeRow(field, i) {
    onUpdate({ [field]: (data[field] || []).filter((_, idx) => idx !== i) });
  }
  function updateRow(field, i, updated) {
    onUpdate({ [field]: (data[field] || []).map((item, idx) => (idx === i ? updated : item)) });
  }

  // ── All available variables for this flow (system + user input + sheets read)
  const allFlowVars = [
    ...SYSTEM_VARS,
    ...flowVariables,
  ].filter((v, i, arr) => v?.key && arr.findIndex((x) => x.key === v.key) === i);

  // ── Quick-insert strip: shows all variables as chips; clicking copies {{key}} into clipboard
  // Used at the top of each action section so variables are always visible, no dropdown needed.
  function VarQuickStrip({ onPick }) {
    const [copied, setCopied] = useState("");
    const [search, setSearch] = useState("");

    const shown = search
      ? allFlowVars.filter((v) => v.key.includes(search.toLowerCase()))
      : allFlowVars;

    function pick(key) {
      if (onPick) { onPick(key); return; }
      navigator.clipboard?.writeText(`{{${key}}}`).catch(() => {});
      setCopied(key);
      setTimeout(() => setCopied(""), 1500);
    }

    return (
      <div className="rounded-lg border border-slate-200/50 dark:border-slate-700/40 bg-slate-50/60 dark:bg-slate-800/40 p-2 space-y-1.5">
        <div className="flex items-center gap-2">
          <Variable size={11} className="text-emerald-500 flex-shrink-0" />
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 flex-1">
            Available Variables — click to copy
          </p>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="filter…"
            className="w-20 px-1.5 py-0.5 rounded text-[10px] border border-slate-200/60 dark:border-slate-600/60 bg-white dark:bg-slate-700/50 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-400/50"
          />
        </div>
        {shown.length === 0 ? (
          <p className="text-[11px] text-slate-400 italic px-1">
            {allFlowVars.length === 0
              ? "No variables yet — add a User Input node above this node."
              : "No match."}
          </p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {shown.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => pick(v.key)}
                title={`Click to copy {{${v.key}}}`}
                className={`inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px] font-mono font-semibold transition-all ${
                  copied === v.key
                    ? "bg-emerald-100 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-600 text-emerald-700 dark:text-emerald-300"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                }`}
              >
                {copied === v.key ? (
                  <><CheckCircle2 size={8} className="text-emerald-500" /> copied!</>
                ) : (
                  `{{${v.key}}}`
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Output variable preview ─────────────────────────────────────────────────

  const outputVars = (() => {
    const p = prefix;
    if (action === "read") {
      const headers = (data.readHeaders || "").split(",").map((h) => h.trim()).filter(Boolean);
      const isMultiRow = data.readLimit && data.readLimit !== "1";

      const firstKey = headers.length
        ? headers[0].replace(/\s+/g, "_").toLowerCase()
        : "A";

      // Shorthand vars — always point to the first matched row
      const colVars = headers.length
        ? headers.map((h, i) => ({
            key: `{{${p}.${h.replace(/\s+/g, "_").toLowerCase()}}}`,
            desc: `col ${String.fromCharCode(65 + i)} — "${h}" (1st match)`,
          }))
        : [
            { key: `{{${p}.A}}`, desc: "col A — 1st matched row" },
            { key: `{{${p}.B}}`, desc: "col B — 1st matched row" },
            { key: `{{${p}.C}}`, desc: "col C — 1st matched row" },
          ];

      // Full-row shorthand (always available)
      const rowVar = { key: `{{${p}.row}}`, desc: "1st match — all columns comma-joined" };

      // Indexed access — always available (0-based: row 0 = 1st match)
      const indexedVars = [
        { key: `{{${p}.0.${firstKey}}}`, desc: `row 0 (1st match) — ${headers[0] ? `"${headers[0]}"` : "col A"}` },
        { key: `{{${p}.0.row}}`, desc: "row 0 (1st match) — all columns comma-joined" },
      ];

      // Extra indexed rows — shown when limit > 1
      const extraIndexedVars = isMultiRow
        ? [
            { key: `{{${p}.1.${firstKey}}}`, desc: `row 1 (2nd match) — ${headers[0] ? `"${headers[0]}"` : "col A"}` },
            { key: `{{${p}.1.row}}`, desc: "row 1 (2nd match) — all columns comma-joined" },
            { key: `{{${p}.2.${firstKey}}}`, desc: `row 2 (3rd match) — ${headers[0] ? `"${headers[0]}"` : "col A"}` },
          ]
        : [];

      return [
        ...colVars,
        rowVar,
        ...indexedVars,
        ...extraIndexedVars,
        { key: `{{${p}.found}}`, desc: "true / false — was a row found?" },
        { key: `{{${p}.count}}`, desc: "number of rows returned" },
        { key: `{{${p}.success}}`, desc: "true if request succeeded" },
      ];
    }
    if (action === "append") {
      return [
        { key: `{{${p}.success}}`, desc: "true if row was added" },
        { key: `{{${p}.affectedRows}}`, desc: "rows written (usually 1)" },
        { key: `{{${p}.updatedRange}}`, desc: "e.g. Sheet1!A5:C5" },
      ];
    }
    if (action === "update") {
      return [
        { key: `{{${p}.success}}`, desc: "true if update ran" },
        { key: `{{${p}.affectedRows}}`, desc: "rows updated" },
        { key: `{{${p}.updatedRange}}`, desc: "ranges that were updated" },
      ];
    }
    // delete
    return [
      { key: `{{${p}.success}}`, desc: "true if delete ran" },
      { key: `{{${p}.affectedRows}}`, desc: "rows deleted" },
    ];
  })();

  function copyVar(v) { navigator.clipboard?.writeText(v).catch(() => {}); }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ══ OAUTH CONFIG STATUS (admin-managed) ══════════════════════════════ */}
      {initializing ? (
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200/40 dark:border-slate-700/40 bg-slate-50/80 dark:bg-slate-800/40">
          <Loader2 size={13} className="animate-spin text-[#0a8c4e]" />
          <span className="text-xs text-slate-500 dark:text-slate-400">Loading Google connection…</span>
        </div>
      ) : clientIdError ? (
        <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl border border-amber-200/60 dark:border-amber-700/40 bg-amber-50/70 dark:bg-amber-900/15">
          <AlertCircle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">{clientIdError}</p>
            <a
              href="/admin/google-settings"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 hover:underline mt-0.5"
            >
              Go to Admin → Google OAuth <ExternalLink size={9} />
            </a>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-[#0a8c4e]/25 bg-[#0a8c4e]/5 dark:bg-[#0a8c4e]/10">
          <CheckCircle2 size={13} className="text-[#0a8c4e] flex-shrink-0" />
          <span className="text-[11px] text-[#0a8c4e] dark:text-emerald-300 font-semibold">Google OAuth configured by admin</span>
        </div>
      )}

      {/* ══ SECTION 1 · GOOGLE ACCOUNT ══════════════════════════════════════ */}
      <SectionHeader
        badge={isConnected ? "● Connected" : "○ Not connected"}
        badgeColor={isConnected
          ? "bg-[#0a8c4e]/10 text-[#0a8c4e] dark:bg-[#0a8c4e]/20 dark:text-emerald-300"
          : "bg-slate-100 dark:bg-slate-800 text-slate-500"}
      >
        Google Account
      </SectionHeader>

      {initializing ? null : isConnected ? (
        /* ── Connected state ── */
        <div className="rounded-xl border border-[#0a8c4e]/25 bg-gradient-to-br from-[#0a8c4e]/5 to-transparent dark:from-[#0a8c4e]/10 dark:to-transparent p-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {userInfo?.picture ? (
                <img src={userInfo.picture} alt="" className="w-10 h-10 rounded-full border-2 border-[#0a8c4e]/30 flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#0a8c4e]/20 flex items-center justify-center flex-shrink-0">
                  <GoogleIcon size={20} />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-[#0a8c4e] flex-shrink-0" />
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                    {userInfo?.name || data.connectedName || "Connected"}
                  </p>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {userInfo?.email || data.connectedEmail}
                </p>
              </div>
            </div>
            <button
              onClick={handleDisconnect}
              className="flex-shrink-0 flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 font-medium transition-colors px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20"
            >
              <X size={11} /> Disconnect
            </button>
          </div>
        </div>
      ) : (
        /* ── Connect button ── */
        <div className="space-y-2.5">
          {connectError && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-900/15 border border-red-200/60 dark:border-red-700/40 px-3 py-2.5">
              <AlertCircle size={13} className="text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-red-600 dark:text-red-400">{connectError}</p>
            </div>
          )}

          {/* The real Google OAuth button — MUST be triggered by onClick */}
          <button
            onClick={handleConnect}
            disabled={connectStatus === "loading" || !clientId}
            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 hover:shadow-md transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {connectStatus === "loading" ? (
              <Loader2 size={18} className="animate-spin text-[#0a8c4e]" />
            ) : (
              <GoogleIcon size={20} />
            )}
            <span>
              {connectStatus === "loading" ? "Opening Google…" : "Connect with Google Sheets"}
            </span>
          </button>

          <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">
            A Google sign-in popup will open to grant Sheets access.
          </p>
        </div>
      )}

      {/* ══ SECTION 2 · SPREADSHEET ══════════════════════════════════════════ */}
      {!initializing && isConnected && (
        <>
          <SectionHeader
            badge={hasSheet ? data.spreadsheetName || "Selected" : undefined}
            badgeColor="bg-[#0a8c4e]/10 text-[#0a8c4e] dark:text-emerald-300"
          >
            Spreadsheet
          </SectionHeader>

          {hasSheet ? (
            /* ── Sheet selected ── */
            <div className="space-y-3">
              <div className="rounded-xl border border-[#0a8c4e]/25 bg-[#0a8c4e]/5 dark:bg-[#0a8c4e]/10 p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#0a8c4e]/15 flex items-center justify-center flex-shrink-0">
                    <FileSpreadsheet size={15} className="text-[#0a8c4e]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                      {data.spreadsheetName}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono truncate">
                      {data.spreadsheetId}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleChangeSheet}
                  className="flex-shrink-0 text-[11px] text-slate-400 hover:text-[#0a8c4e] font-medium transition-colors"
                >
                  Change
                </button>
              </div>

              {/* Tab selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Sheet Tab
                  {tabsLoading && <Loader2 size={11} className="inline ml-1.5 animate-spin text-[#0a8c4e]" />}
                </label>
                {tabsList.length > 0 ? (
                  <div className="relative">
                    <select
                      value={data.sheetName || ""}
                      onChange={(e) => onUpdate({ sheetName: e.target.value })}
                      className={`${inputCls} appearance-none pr-8`}
                    >
                      {tabsList.map((tab) => (
                        <option key={tab} value={tab}>{tab}</option>
                      ))}
                    </select>
                    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                ) : (
                  <input
                    type="text"
                    value={data.sheetName || "Sheet1"}
                    onChange={(e) => onUpdate({ sheetName: e.target.value })}
                    placeholder="Sheet1"
                    className={inputCls}
                  />
                )}
              </div>
            </div>
          ) : (
            /* ── Sheet picker ── */
            <div className="space-y-3">
              {/* Sheets list */}
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Your Google Sheets
                  {sheetsLoading && <Loader2 size={11} className="inline ml-1.5 animate-spin text-[#0a8c4e]" />}
                </p>
                <button onClick={handleRefreshSheets} className="text-[11px] text-[#0a8c4e] hover:opacity-80 transition-opacity flex items-center gap-1">
                  <RefreshCw size={11} /> Refresh
                </button>
              </div>

              {sheetsError && (
                <p className="text-[11px] text-red-500 flex items-center gap-1">
                  <AlertCircle size={11} /> {sheetsError}
                </p>
              )}

              {!sheetsLoading && sheetsList.length === 0 && !sheetsError && (
                <p className="text-[11px] text-slate-400 italic py-2 text-center">
                  No Google Sheets found in your Drive.
                </p>
              )}

              {sheetsList.length > 0 && (
                <div className="space-y-1.5 max-h-52 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 p-1.5 bg-white/40 dark:bg-slate-900/30">
                  {sheetsList.map((sheet) => (
                    <button
                      key={sheet.id}
                      onClick={() => handleSelectSheet(sheet)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-white dark:bg-slate-800/60 hover:bg-[#0a8c4e]/5 dark:hover:bg-[#0a8c4e]/10 border border-slate-200/60 dark:border-slate-700/50 hover:border-[#0a8c4e]/30 transition-all group text-left"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-[#0a8c4e]/10 flex items-center justify-center flex-shrink-0">
                          <FileSpreadsheet size={13} className="text-[#0a8c4e]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{sheet.name}</p>
                          {sheet.modifiedTime && (
                            <p className="text-[10px] text-slate-400 dark:text-slate-500">
                              {new Date(sheet.modifiedTime).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <ArrowRight size={13} className="flex-shrink-0 text-slate-300 group-hover:text-[#0a8c4e] transition-colors ml-2" />
                    </button>
                  ))}
                </div>
              )}

              {/* Create new sheet */}
              {!showCreate ? (
                <button
                  onClick={() => setShowCreate(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-[#0a8c4e]/40 text-[#0a8c4e] dark:text-emerald-300 text-xs font-semibold hover:bg-[#0a8c4e]/5 transition-all"
                >
                  <Plus size={13} /> Create new spreadsheet
                </button>
              ) : (
                <div className="rounded-xl border border-[#0a8c4e]/25 bg-[#0a8c4e]/5 dark:bg-[#0a8c4e]/10 p-3 space-y-2">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">New Spreadsheet</p>
                  <input
                    type="text"
                    value={newSheetName}
                    onChange={(e) => { setNewSheetName(e.target.value); setCreateError(""); }}
                    placeholder="e.g. Customer Leads 2025"
                    className={inputCls}
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") handleCreateSheet(); if (e.key === "Escape") setShowCreate(false); }}
                  />
                  {createError && <p className="text-[11px] text-red-500">{createError}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateSheet}
                      disabled={!newSheetName.trim() || creating}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#0a8c4e] text-white text-xs font-semibold hover:bg-[#0b7a40] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {creating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                      {creating ? "Creating…" : "Create"}
                    </button>
                    <button
                      onClick={() => { setShowCreate(false); setNewSheetName(""); setCreateError(""); }}
                      className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ══ SECTION 3 · ACTION ═══════════════════════════════════════════════ */}
      {!initializing && isConnected && hasSheet && (
        <>
          <SectionHeader>Action</SectionHeader>

          {/* 4 action tiles */}
          <div className="grid grid-cols-4 gap-1.5">
            {Object.entries(ACTION_META).map(([key, meta]) => {
              const Icon = meta.icon;
              const isActive = action === key;
              return (
                <button
                  key={key}
                  onClick={() => onUpdate({ action: key })}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl text-[10px] font-bold transition-all ${isActive ? meta.active : meta.inactive}`}
                >
                  <Icon size={15} />
                  {meta.label}
                </button>
              );
            })}
          </div>

          {/* ── READ ── */}
          {action === "read" && (
            <div className="space-y-4">

              {/* ── Range ── */}
              <div className="rounded-xl border border-blue-200/40 dark:border-blue-800/30 bg-blue-50/30 dark:bg-blue-900/5 p-3.5 space-y-3">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Read Range</p>
                <input
                  type="text"
                  value={data.readRange || "A:Z"}
                  onChange={(e) => onUpdate({ readRange: e.target.value.toUpperCase() })}
                  placeholder="A:Z or A1:D100"
                  className={`${inputCls} font-mono uppercase`}
                />
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  <span className="font-mono text-slate-500">A:Z</span> — all columns · <span className="font-mono text-slate-500">A1:D50</span> — specific range
                </p>
              </div>

              {/* ── Find row ── filter OR row number */}
              <div className="rounded-xl border border-blue-200/40 dark:border-blue-800/30 bg-blue-50/30 dark:bg-blue-900/5 p-3.5 space-y-3">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Find Row</p>

                {/* Filter by column value */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Filter by column value</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Column</label>
                      <input
                        type="text"
                        value={data.readFilterColumn || ""}
                        onChange={(e) => onUpdate({ readFilterColumn: e.target.value.toUpperCase() })}
                        placeholder="A"
                        maxLength={2}
                        className={`${inputCls} font-mono uppercase`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Equals</label>
                      <VarPickerInput
                        value={data.readFilterValue || ""}
                        onChange={(v) => onUpdate({ readFilterValue: v })}
                        placeholder="{{user_input}} or value"
                        inputClassName={inputCls}
                        wrapClassName="relative w-full"
                        flowVariables={flowVariables}
                      />
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-blue-200/60 dark:bg-blue-800/40" />
                  <span className="text-[9px] font-bold text-blue-400 dark:text-blue-600 uppercase tracking-widest">OR</span>
                  <div className="flex-1 h-px bg-blue-200/60 dark:bg-blue-800/40" />
                </div>

                {/* Read by specific row number */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Read specific row number</p>
                  <VarPickerInput
                    value={data.readRowNumber || ""}
                    onChange={(v) => onUpdate({ readRowNumber: v })}
                    placeholder="e.g. 2  or  {{row_var}}"
                    inputClassName={`${inputCls} font-mono`}
                    wrapClassName="relative w-full"
                    flowVariables={flowVariables}
                  />
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    Row 1 = first row, row 2 = second, etc. Overrides filter above when set.
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Return Limit</label>
                  <select value={data.readLimit || "1"} onChange={(e) => onUpdate({ readLimit: e.target.value })} className={inputCls}>
                    <option value="1">1 row (first match)</option>
                    <option value="5">Up to 5 rows</option>
                    <option value="10">Up to 10 rows</option>
                    <option value="50">Up to 50 rows</option>
                    <option value="all">All matching rows</option>
                  </select>
                  {(data.readLimit && data.readLimit !== "1") ? (
                    <p className="mt-1.5 text-[10px] text-blue-500 dark:text-blue-400 leading-relaxed">
                      Access rows by index (0-based): <span className="font-mono">{`{{${prefix}.0.A}}`}</span> = 1st row, <span className="font-mono">{`{{${prefix}.1.A}}`}</span> = 2nd row, <span className="font-mono">{`{{${prefix}.2.A}}`}</span> = 3rd row, etc. Use <span className="font-mono">{`{{${prefix}.N.row}}`}</span> for the full row.
                    </p>
                  ) : (
                    <p className="mt-1.5 text-[10px] text-slate-400 dark:text-slate-500">
                      To access 2nd, 3rd… rows, set limit to &gt; 1 and use <span className="font-mono">{`{{${prefix}.1.A}}`}</span>, <span className="font-mono">{`{{${prefix}.2.A}}`}</span>, etc.
                    </p>
                  )}
                </div>
              </div>

              {/* ── Column headers ── */}
              <div className="rounded-xl border border-blue-200/40 dark:border-blue-800/30 bg-blue-50/30 dark:bg-blue-900/5 p-3.5 space-y-2">
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Column Headers</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    Name each column so you get <span className="font-mono">{"{{sheets.name}}"}</span> instead of <span className="font-mono">{"{{sheets.A}}"}</span>
                  </p>
                </div>
                <input
                  type="text"
                  value={data.readHeaders || ""}
                  onChange={(e) => onUpdate({ readHeaders: e.target.value })}
                  placeholder="name, email, phone, status"
                  className={inputCls}
                />
                {data.readHeaders && (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {data.readHeaders.split(",").map((h) => h.trim()).filter(Boolean).map((h, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40">
                        <span className="opacity-50">{String.fromCharCode(65 + i)}→</span>
                        {`{{${prefix}.${h.replace(/\s+/g, "_").toLowerCase()}}}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Preview sheet data ── */}
              {hasSheet && isConnected && (
                <div className="rounded-xl border border-slate-200/50 dark:border-slate-700/40 bg-white dark:bg-slate-800/40 overflow-hidden">
                  <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-700/30">
                    <div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Sheet Data Preview</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">See what's in the sheet — first 8 rows</p>
                    </div>
                    <button
                      onClick={handlePreview}
                      disabled={previewLoading}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-[11px] font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors flex-shrink-0"
                    >
                      {previewLoading
                        ? <><Loader2 size={11} className="animate-spin" /> Loading…</>
                        : <><Eye size={11} /> Preview</>
                      }
                    </button>
                  </div>

                  {previewError && (
                    <div className="px-3.5 py-2 flex items-center gap-2 text-red-500">
                      <AlertCircle size={11} />
                      <p className="text-[11px]">{previewError}</p>
                    </div>
                  )}

                  {previewRows !== null && !previewError && (
                    previewRows.length === 0 ? (
                      <p className="px-3.5 py-4 text-[11px] text-slate-400 italic text-center">
                        No data found in this range.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-[10px] border-collapse">
                          <thead>
                            <tr className="bg-blue-50 dark:bg-blue-900/20">
                              <th className="px-2 py-1.5 text-left font-bold text-blue-500 dark:text-blue-400 border-b border-slate-200/50 dark:border-slate-700/30 w-8 flex-shrink-0">#</th>
                              {(previewRows[0] || []).map((_, ci) => {
                                const headerDefs = (data.readHeaders || "").split(",").map(h => h.trim()).filter(Boolean);
                                const label = headerDefs[ci]
                                  ? `${String.fromCharCode(65 + ci)} — ${headerDefs[ci]}`
                                  : String.fromCharCode(65 + ci);
                                return (
                                  <th key={ci} className="px-2 py-1.5 text-left font-bold text-blue-700 dark:text-blue-300 border-b border-slate-200/50 dark:border-slate-700/30 whitespace-nowrap">
                                    {label}
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody>
                            {previewRows.map((row, ri) => (
                              <tr key={ri} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                                <td className="px-2 py-1.5 font-mono font-bold text-slate-300 dark:text-slate-600 border-b border-slate-100/60 dark:border-slate-700/20">{ri + 1}</td>
                                {(previewRows[0] || []).map((_, ci) => (
                                  <td key={ci} className="px-2 py-1.5 text-slate-700 dark:text-slate-300 border-b border-slate-100/60 dark:border-slate-700/20 max-w-[120px] truncate font-mono">
                                    {row[ci] ?? <span className="text-slate-300 dark:text-slate-600 italic">—</span>}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  )}

                  {previewRows === null && !previewLoading && !previewError && (
                    <p className="px-3.5 py-3 text-[10px] text-slate-400 dark:text-slate-500 text-center italic">
                      Click Preview to load sheet data
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── APPEND ── */}
          {action === "append" && (
            <div className="space-y-3">
              {/* Section header */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Column Mapping</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    Map each spreadsheet column to a value or variable
                  </p>
                </div>
                <button
                  onClick={() => addRow("appendColumns")}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0a8c4e] text-white text-[11px] font-semibold hover:bg-[#0b7a40] transition-colors shadow-sm flex-shrink-0"
                >
                  <Plus size={11} /> Add Column
                </button>
              </div>

              {(data.appendColumns || []).length === 0 ? (
                <button
                  onClick={() => addRow("appendColumns")}
                  className="w-full flex flex-col items-center gap-2 py-6 rounded-xl border-2 border-dashed border-emerald-200/70 dark:border-emerald-800/40 text-emerald-400 dark:text-emerald-600 hover:border-emerald-400 hover:text-emerald-600 dark:hover:border-emerald-600 transition-colors"
                >
                  <FilePlus size={20} />
                  <span className="text-[11px] font-semibold">Add your first column mapping</span>
                  <span className="text-[10px] opacity-70">e.g. Column A → {"{{user_input}}"}</span>
                </button>
              ) : (
                <div className="space-y-2">
                  {(data.appendColumns || []).map((row, i) => (
                    <ColValueRow
                      key={row.id || i}
                      item={row}
                      onChange={(u) => updateRow("appendColumns", i, u)}
                      onRemove={() => removeRow("appendColumns", i)}
                      showLabel
                      valPlaceholder={`e.g. {{user_input}} or fixed text`}
                      flowVariables={flowVariables}
                    />
                  ))}
                </div>
              )}

              {/* How it works hint */}
              {(data.appendColumns || []).length > 0 && (
                <div className="flex items-start gap-2 rounded-lg bg-emerald-50/60 dark:bg-emerald-900/10 border border-emerald-200/40 dark:border-emerald-800/30 px-3 py-2">
                  <AlertCircle size={11} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-400 leading-relaxed">
                    Click a <span className="font-mono font-bold">variable chip</span> inside each row to insert it at the cursor.
                    Use the <span className="font-mono font-bold">✕</span> button to clear a value field before re-inserting.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── UPDATE ── */}
          {action === "update" && (
            <div className="space-y-4">
              {/* Find row filter */}
              <div className="rounded-xl border border-amber-200/50 dark:border-amber-800/30 bg-amber-50/30 dark:bg-amber-900/5 p-3.5 space-y-2.5">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Find Row Where</p>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Col</span>
                    <input
                      type="text"
                      value={data.updateFilterColumn || "A"}
                      onChange={(e) => onUpdate({ updateFilterColumn: e.target.value.toUpperCase() })}
                      placeholder="A"
                      maxLength={2}
                      className="w-9 h-8 px-0 rounded-lg border border-slate-200/70 dark:border-slate-600/60 bg-white dark:bg-slate-800 text-xs font-mono font-bold uppercase text-center text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0a8c4e]/40"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 flex-shrink-0">=</span>
                  <VarPickerInput
                    value={data.updateFilterValue || ""}
                    onChange={(v) => onUpdate({ updateFilterValue: v })}
                    placeholder="{{user_input}} or fixed value"
                    inputClassName={`${inputCls} py-1.5 text-xs font-mono`}
                    wrapClassName="relative flex-1"
                    flowVariables={flowVariables}
                  />
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  Rows where the column value matches will be updated.
                </p>
              </div>

              {/* Set columns */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Set Columns To</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                      New values for each column in matching rows
                    </p>
                  </div>
                  <button
                    onClick={() => addRow("updateColumns")}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500 text-white text-[11px] font-semibold hover:bg-amber-600 transition-colors shadow-sm flex-shrink-0"
                  >
                    <Plus size={11} /> Add Column
                  </button>
                </div>

                {(data.updateColumns || []).length === 0 ? (
                  <button
                    onClick={() => addRow("updateColumns")}
                    className="w-full flex flex-col items-center gap-1.5 py-5 rounded-xl border-2 border-dashed border-amber-200/70 dark:border-amber-800/40 text-amber-400 hover:border-amber-400 transition-colors"
                  >
                    <Pencil size={16} />
                    <span className="text-[11px] font-semibold">Add a column to update</span>
                  </button>
                ) : (
                  <div className="space-y-2">
                    {(data.updateColumns || []).map((row, i) => (
                      <ColValueRow
                        key={row.id || i}
                        item={row}
                        onChange={(u) => updateRow("updateColumns", i, u)}
                        onRemove={() => removeRow("updateColumns", i)}
                        valPlaceholder="New value or {{variable}}"
                        flowVariables={flowVariables}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── DELETE ── */}
          {action === "delete" && (
            <div className="space-y-3">
              <div className="rounded-xl border border-red-200/50 dark:border-red-800/30 bg-red-50/30 dark:bg-red-900/5 p-3.5 space-y-2.5">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Delete Rows Where</p>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Col</span>
                    <input
                      type="text"
                      value={data.deleteFilterColumn || "A"}
                      onChange={(e) => onUpdate({ deleteFilterColumn: e.target.value.toUpperCase() })}
                      placeholder="A"
                      maxLength={2}
                      className="w-9 h-8 px-0 rounded-lg border border-slate-200/70 dark:border-slate-600/60 bg-white dark:bg-slate-800 text-xs font-mono font-bold uppercase text-center text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-400/40"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 flex-shrink-0">=</span>
                  <VarPickerInput
                    value={data.deleteFilterValue || ""}
                    onChange={(v) => onUpdate({ deleteFilterValue: v })}
                    placeholder="{{user_input}} or fixed value"
                    inputClassName={`${inputCls} py-1.5 text-xs font-mono`}
                    wrapClassName="relative flex-1"
                    flowVariables={flowVariables}
                  />
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-xl border border-red-200/60 dark:border-red-800/40 bg-red-50/60 dark:bg-red-900/15 px-3 py-2.5">
                <AlertCircle size={12} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-red-600 dark:text-red-400">
                  All rows where column{" "}
                  <span className="font-mono font-bold bg-red-100 dark:bg-red-900/30 px-1 rounded">
                    {data.deleteFilterColumn || "A"}
                  </span>{" "}
                  matches the value above will be <strong>permanently deleted</strong>.
                </p>
              </div>
            </div>
          )}

          {/* ══ SECTION 4 · OUTPUT VARIABLES ═══════════════════════════════ */}
          <SectionHeader>Output Variables</SectionHeader>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Variable Prefix</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 pointer-events-none">{"{{"}</span>
                <input
                  type="text"
                  value={prefix}
                  onChange={(e) => onUpdate({ outputPrefix: e.target.value.replace(/[^a-z0-9_]/gi, "_").toLowerCase() || "sheets" })}
                  placeholder="sheets"
                  className={`${inputCls} pl-7 pr-16 font-mono`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 pointer-events-none">{".*}}"}</span>
              </div>
            </div>

            <div className="space-y-1 rounded-xl border border-slate-200 dark:border-slate-700 p-2 bg-white/30 dark:bg-slate-900/30 max-h-48 overflow-y-auto">
              {outputVars.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => copyVar(v.key)}
                  className="w-full flex items-start justify-between px-2.5 py-2 rounded-lg bg-[#0a8c4e]/5 dark:bg-[#0a8c4e]/10 hover:bg-[#0a8c4e]/10 dark:hover:bg-[#0a8c4e]/20 border border-[#0a8c4e]/15 dark:border-[#0a8c4e]/25 text-left transition-colors group gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[11px] font-semibold text-[#0a8c4e] dark:text-emerald-300 truncate">{v.key}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">{v.desc}</p>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] text-slate-400 group-hover:text-[#0a8c4e] transition-colors flex-shrink-0 mt-0.5">
                    <Copy size={9} /> copy
                  </span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Click any variable to copy it. Paste into messages, conditions, or other nodes.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
