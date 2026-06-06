import { useState } from "react";
import { Handle, Position } from "reactflow";
import {
  Braces,
  Plus,
  Trash2,
  ChevronDown,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Variable,
} from "lucide-react";
import NodeActionBar from "./NodeActionBar";
import { authFetch } from "../../services/api";

export const ApiNodeConfig = {
  label: "API Call",
  icon: Braces,
  accent: "#a855f7",
  defaults: {
    method: "GET",
    url: "",
    headers: [],
    params: [],
    body: "",
    responsePrefix: "api",
    useBackendProxy: true,
    responseKeys: [],
    testStatus: "idle",
    testResponseRaw: "",
    testError: null,
    responseFlat: {},
  },
};

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

const METHOD_COLORS = {
  GET: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  POST: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  PUT: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  PATCH:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  DELETE: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

// Flattens any JSON structure into dot/bracket notation:
//   { user: { name: "A" } }          → { "prefix.user.name": "A" }
//   [{ name: "A" }, { name: "B" }]   → { "prefix[0].name": "A", "prefix[1].name": "B" }
//   { rooms: [{ price: 200 }] }      → { "prefix.rooms[0].price": 200 }
function flattenObject(obj, prefix = "", result = {}) {
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => flattenObject(item, `${prefix}[${i}]`, result));
  } else if (obj !== null && typeof obj === "object") {
    Object.keys(obj).forEach((key) => {
      flattenObject(obj[key], prefix ? `${prefix}.${key}` : key, result);
    });
  } else {
    if (prefix) result[prefix] = obj;
  }
  return result;
}

// ─── Canvas Node ───────────────────────────────────────────────────────────────

export function ApiFlowNode({ id, data, selected }) {
  const methodColor = METHOD_COLORS[data.method] || METHOD_COLORS.GET;
  const varCount = data.responseKeys?.length || 0;
  const prefix = data.responsePrefix || "api";
  const executionState = data.executionState;
  const isExecuting = ["active", "loading", "success", "error"].includes(
    executionState,
  );
  const statusTone =
    executionState === "error"
      ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300"
      : executionState === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
        : "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-900/20 dark:text-purple-300";

  return (
    <div
      className={`group relative min-w-[240px] max-w-[270px] rounded-2xl border bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-[0_14px_30px_rgba(2,6,23,0.1)] dark:shadow-[0_14px_30px_rgba(0,0,0,0.45)] transition-all duration-200 ${
        isExecuting
          ? "ring-2 ring-purple-400/70 ring-offset-2 ring-offset-white dark:ring-offset-slate-950 scale-[1.02] animate-pulse"
          : selected
            ? "ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-950"
            : "hover:shadow-[0_18px_38px_rgba(2,6,23,0.16)]"
      }`}
      style={{ borderColor: "#a855f766" }}
    >
      <NodeActionBar nodeId={id} />
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-slate-500 !border-2 !border-white dark:!border-slate-900"
      />

      <div className="p-3.5">
        <div className="flex items-center gap-2.5">
          <div
            className="h-8 w-8 rounded-xl flex items-center justify-center text-white flex-shrink-0"
            style={{ backgroundColor: "#a855f7" }}
          >
            <Braces size={15} />
          </div>
          <div className="min-w-0 flex-1 pr-[120px]">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              API Call
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              #{id.slice(-6)}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${methodColor}`}
          >
            {data.method || "GET"}
          </span>
          <span className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
            {data.url ? data.url.replace(/^https?:\/\//, "") : "No URL set"}
          </span>
        </div>

        {varCount > 0 && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              Variables:
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700/60 px-2 py-0.5 text-[10px] font-mono font-semibold text-purple-700 dark:text-purple-300">
              <Variable size={9} />
              {`{{${prefix}.*}}`} ×{varCount}
            </span>
          </div>
        )}

        <div className="mt-2">
          {data.testStatus === "success" && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={10} /> Response ready
            </span>
          )}
          {data.testStatus === "error" && (
            <span className="flex items-center gap-1 text-[10px] text-red-500 dark:text-red-400">
              <AlertCircle size={10} /> Fetch error
            </span>
          )}
          {(!data.testStatus || data.testStatus === "idle") && (
            <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">
              Not tested yet
            </span>
          )}
        </div>

        {data.executionTitle && (
          <div
            className={`mt-3 rounded-xl border px-3 py-2 shadow-sm ${statusTone}`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-80">
                {data.executionTitle}
              </p>
              {executionState && (
                <span className="rounded-full bg-white/60 dark:bg-black/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                  {executionState}
                </span>
              )}
            </div>
            {data.executionMessage && (
              <p className="mt-1 text-sm font-medium break-words">
                {data.executionMessage}
              </p>
            )}
            {data.executionDetail && (
              <p className="mt-1 text-[11px] opacity-80 break-words">
                {data.executionDetail}
              </p>
            )}
            {data.executionPreview && (
              <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-white/70 dark:bg-slate-950/40 p-2 text-[10px] leading-relaxed text-slate-700 dark:text-slate-200 border border-white/40 dark:border-white/10 whitespace-pre-wrap">
                {data.executionPreview}
              </pre>
            )}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-slate-600 !border-2 !border-white dark:!border-slate-900"
      />
    </div>
  );
}

// ─── Panel shared styles ───────────────────────────────────────────────────────

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-slate-200/30 dark:border-slate-700/30 bg-white/5 dark:bg-slate-900/5 backdrop-blur-md text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all";

function genId() {
  return `kv_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
}

// ─── Key-value row (headers / params) ─────────────────────────────────────────

function KVRow({
  item,
  onChange,
  onRemove,
  keyPlaceholder = "Key",
  valuePlaceholder = "Value",
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={item.key}
        onChange={(e) => onChange({ ...item, key: e.target.value })}
        placeholder={keyPlaceholder}
        className={`${inputCls} flex-1 py-1.5 text-xs`}
      />
      <input
        type="text"
        value={item.value}
        onChange={(e) => onChange({ ...item, value: e.target.value })}
        placeholder={valuePlaceholder}
        className={`${inputCls} flex-1 py-1.5 text-xs`}
      />
      <button
        onClick={onRemove}
        className="flex-shrink-0 p-1 text-slate-400 hover:text-red-500 transition-colors"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

// ─── Panel Editor ──────────────────────────────────────────────────────────────

export function ApiNodeEditor({ data, onUpdate }) {
  const [sampleJson, setSampleJson] = useState("");
  const [parseError, setParseError] = useState("");
  const [isFetching, setIsFetching] = useState(false);

  const hasBody = ["POST", "PUT", "PATCH"].includes(data.method || "GET");
  const prefix = data.responsePrefix || "api";

  function addRow(field) {
    onUpdate({
      [field]: [...(data[field] || []), { id: genId(), key: "", value: "" }],
    });
  }

  function removeRow(field, index) {
    onUpdate({ [field]: (data[field] || []).filter((_, i) => i !== index) });
  }

  function updateRow(field, index, updated) {
    onUpdate({
      [field]: (data[field] || []).map((item, i) =>
        i === index ? updated : item,
      ),
    });
  }

  function processResponse(json) {
    const flat = flattenObject(json, prefix);
    const keys = Object.keys(flat);
    onUpdate({
      testStatus: "success",
      testResponseRaw: JSON.stringify(json, null, 2),
      responseKeys: keys,
      responseFlat: flat,
      testError: null,
    });
    setSampleJson("");
    setParseError("");
  }

  async function handleFetchLive() {
    if (!data.url) return;
    setIsFetching(true);
    onUpdate({ testStatus: "loading" });
    try {
      const headerObj = {};
      (data.headers || []).forEach(({ key, value }) => {
        if (key) headerObj[key] = value;
      });

      const urlObj = new URL(data.url);
      (data.params || []).forEach(({ key, value }) => {
        if (key) urlObj.searchParams.set(key, value);
      });

      const fetchOpts = { method: data.method || "GET", headers: headerObj };
      if (hasBody && data.body?.trim()) fetchOpts.body = data.body;

      if (data.useBackendProxy !== false) {
        const paramsObj = {};
        (data.params || []).forEach(({ key, value }) => {
          if (key) paramsObj[key] = value ?? "";
        });

        const response = await authFetch("/flows/proxy-request", {
          method: "POST",
          body: JSON.stringify({
            method: data.method || "GET",
            url: data.url,
            headers: headerObj,
            params: paramsObj,
            body: hasBody ? data.body || "" : "",
          }),
        });

        const payload = await response.json();
        if (!response.ok || !payload?.success) {
          throw new Error(
            payload?.message || payload?.statusText || "Proxy request failed",
          );
        }

        const proxyData = payload.data;
        if (proxyData && typeof proxyData === "object") {
          processResponse(proxyData);
        } else {
          throw new Error(
            "Proxy returned non-JSON response; paste sample JSON manually.",
          );
        }
      } else {
        const res = await fetch(urlObj.toString(), fetchOpts);
        const json = await res.json();
        processResponse(json);
      }
    } catch (err) {
      onUpdate({ testStatus: "error", testError: err.message });
    } finally {
      setIsFetching(false);
    }
  }

  function handleParseSample() {
    try {
      processResponse(JSON.parse(sampleJson));
    } catch {
      setParseError("Invalid JSON — check syntax and try again");
    }
  }

  function copyVar(key) {
    navigator.clipboard?.writeText(`{{${key}}}`).catch(() => {});
  }

  return (
    <div className="space-y-5">
      {/* ── Method + URL ── */}
      <div className="flex gap-2">
        <div className="relative flex-shrink-0" style={{ width: 96 }}>
          <select
            value={data.method || "GET"}
            onChange={(e) => onUpdate({ method: e.target.value })}
            className={`${inputCls} appearance-none font-bold text-center pr-6`}
          >
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <ChevronDown
            size={11}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        </div>
        <input
          type="url"
          value={data.url || ""}
          onChange={(e) => onUpdate({ url: e.target.value })}
          placeholder="https://api.example.com/endpoint"
          className={`${inputCls} flex-1`}
        />
      </div>

      {/* ── Response variable prefix ── */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
          Save response as
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 pointer-events-none">
            {"{{"}
          </span>
          <input
            type="text"
            value={prefix}
            onChange={(e) =>
              onUpdate({
                responsePrefix:
                  e.target.value.replace(/[^a-z0-9_]/gi, "_").toLowerCase() ||
                  "api",
              })
            }
            placeholder="api1"
            className={`${inputCls} pl-7 pr-16 font-mono`}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 pointer-events-none">
            {".*}}"}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
          Each field becomes{" "}
          <code className="font-mono bg-slate-100 dark:bg-slate-700/60 px-1 rounded text-purple-600 dark:text-purple-400">
            {`{{${prefix}.fieldName}}`}
          </code>{" "}
          for use in later nodes.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200/40 dark:border-slate-700/40 bg-slate-50/60 dark:bg-slate-800/20 px-3 py-2.5">
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={data.useBackendProxy !== false}
            onChange={(e) => onUpdate({ useBackendProxy: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
          />
          Use Backend Proxy (recommended)
        </label>
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          Bypasses browser CORS restrictions for APIs that block frontend
          origin.
        </p>
      </div>

      {/* ── Headers ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Headers
          </label>
          <button
            onClick={() => addRow("headers")}
            className="flex items-center gap-1 text-[11px] text-purple-600 dark:text-purple-400 hover:text-purple-700 transition-colors"
          >
            <Plus size={11} /> Add
          </button>
        </div>
        {(data.headers || []).length === 0 ? (
          <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">
            No headers — click Add to insert one
          </p>
        ) : (
          <div className="space-y-2">
            {(data.headers || []).map((h, i) => (
              <KVRow
                key={h.id || i}
                item={h}
                onChange={(updated) => updateRow("headers", i, updated)}
                onRemove={() => removeRow("headers", i)}
                keyPlaceholder="Authorization"
                valuePlaceholder="Bearer token..."
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Query Params ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Query Params
          </label>
          <button
            onClick={() => addRow("params")}
            className="flex items-center gap-1 text-[11px] text-purple-600 dark:text-purple-400 hover:text-purple-700 transition-colors"
          >
            <Plus size={11} /> Add
          </button>
        </div>
        {(data.params || []).length === 0 ? (
          <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">
            No params — click Add to insert one
          </p>
        ) : (
          <div className="space-y-2">
            {(data.params || []).map((p, i) => (
              <KVRow
                key={p.id || i}
                item={p}
                onChange={(updated) => updateRow("params", i, updated)}
                onRemove={() => removeRow("params", i)}
                keyPlaceholder="page"
                valuePlaceholder="1 or {{variable}}"
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Body (POST / PUT / PATCH only) ── */}
      {hasBody && (
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
            Request Body (JSON)
          </label>
          <textarea
            rows={5}
            value={data.body || ""}
            onChange={(e) => onUpdate({ body: e.target.value })}
            placeholder={'{\n  "id": "{{order_id}}"\n}'}
            className={`${inputCls} resize-none font-mono text-xs`}
          />
          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
            Use {"{{variable}}"} to reference flow variables in the body.
          </p>
        </div>
      )}

      {/* ── Test section ── */}
      <div className="rounded-xl border border-slate-200/40 dark:border-slate-700/40 bg-slate-50/60 dark:bg-slate-800/20 p-3.5 space-y-3">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          Test & Extract Variables
        </p>

        <button
          onClick={handleFetchLive}
          disabled={!data.url || isFetching}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isFetching ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Braces size={13} />
          )}
          {isFetching ? "Fetching..." : "Fetch Live Response"}
        </button>

        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-slate-200/60 dark:bg-slate-700/40" />
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            or paste sample JSON
          </span>
          <div className="h-px flex-1 bg-slate-200/60 dark:bg-slate-700/40" />
        </div>

        <div className="flex gap-2 items-start">
          <textarea
            rows={4}
            value={sampleJson}
            onChange={(e) => {
              setSampleJson(e.target.value);
              setParseError("");
            }}
            placeholder={'{\n  "result": "paste your API response here"\n}'}
            className={`${inputCls} resize-none font-mono text-xs flex-1`}
          />
          <button
            onClick={handleParseSample}
            disabled={!sampleJson.trim()}
            className="px-3 py-2 rounded-lg bg-slate-700 dark:bg-slate-600 text-white text-xs font-semibold hover:bg-slate-600 dark:hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-start mt-0.5"
          >
            Parse
          </button>
        </div>
        {parseError && <p className="text-[11px] text-red-500">{parseError}</p>}
      </div>

      {/* ── Fetch error ── */}
      {data.testStatus === "error" && (
        <div className="rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/10 p-3 space-y-1">
          <p className="text-xs font-semibold text-red-700 dark:text-red-300">
            Request failed
          </p>
          <p className="text-[11px] text-red-600 dark:text-red-400 font-mono">
            {data.testError}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            CORS may be blocking browser requests. Enable "Use Backend Proxy"
            above, or paste sample JSON manually.
          </p>
        </div>
      )}

      {/* ── Extracted variables list ── */}
      {data.testStatus === "success" &&
        (data.responseKeys?.length || 0) > 0 && (
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
              Available Variables{" "}
              <span className="font-normal text-slate-400">
                ({data.responseKeys.length})
              </span>
            </label>
            <div className="space-y-1 max-h-52 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 p-2 bg-white/30 dark:bg-slate-900/30">
              {data.responseKeys.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => copyVar(key)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 border border-purple-200/60 dark:border-purple-700/40 text-left transition-colors group"
                >
                  <span className="font-mono text-[11px] font-semibold text-purple-700 dark:text-purple-300 break-all">
                    {`{{${key}}}`}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors flex-shrink-0 ml-2">
                    <Copy size={9} /> copy
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
              Click any variable to copy it. Paste in message text, conditions,
              or other API URLs.
            </p>
          </div>
        )}

      {/* ── Raw response preview ── */}
      {data.testResponseRaw && (
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
            Raw Response
          </label>
          <pre className="text-[10px] font-mono text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/60 rounded-xl p-3 overflow-auto max-h-44 border border-slate-200 dark:border-slate-700 leading-relaxed">
            {data.testResponseRaw}
          </pre>
        </div>
      )}
    </div>
  );
}
