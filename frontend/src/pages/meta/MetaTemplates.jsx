import { useState, useEffect } from "react";
import { Plus, FileText, Trash2, RefreshCw, Eye, X, Send } from "lucide-react";
import { getTemplates, createTemplate, deleteTemplate, syncTemplate } from "../../services/metaApi.js";
import { authFetch } from "../../services/authFetch.js";

const LANGUAGES = [
  { code: "en_US", label: "English (US)" },
  { code: "en_GB", label: "English (UK)" },
  { code: "hi", label: "Hindi" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "pt_BR", label: "Portuguese (Brazil)" },
  { code: "ar", label: "Arabic" },
  { code: "id", label: "Indonesian" },
];

const statusBadge = { APPROVED: "badge-green", PENDING: "badge-yellow", REJECTED: "badge-red", PAUSED: "badge-yellow", DRAFT: "badge-slate" };
const catBadge = { MARKETING: "badge-purple", UTILITY: "badge-blue", AUTHENTICATION: "badge-slate" };

function TemplateBuilder({ businesses, onSave, onClose }) {
  const [wabaId, setWabaId] = useState(businesses[0]?._id || "");
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("en_US");
  const [category, setCategory] = useState("MARKETING");
  const [headerType, setHeaderType] = useState("none");
  const [headerText, setHeaderText] = useState("");
  const [body, setBody] = useState("");
  const [footer, setFooter] = useState("");
  const [buttons, setButtons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const addButton = () => {
    if (buttons.length >= 3) return;
    setButtons([...buttons, { type: "QUICK_REPLY", text: "" }]);
  };

  function buildComponents() {
    const comps = [];
    if (headerType === "TEXT" && headerText) {
      comps.push({ type: "HEADER", format: "TEXT", text: headerText });
    }
    if (body) {
      comps.push({ type: "BODY", text: body });
    }
    if (footer) {
      comps.push({ type: "FOOTER", text: footer });
    }
    if (buttons.filter(b => b.text).length > 0) {
      comps.push({ type: "BUTTONS", buttons: buttons.filter(b => b.text) });
    }
    return comps;
  }

  function insertVar(setter) {
    setter(prev => {
      const match = (prev.match(/\{\{(\d+)\}\}/g) || []);
      const next = match.length + 1;
      return prev + `{{${next}}}`;
    });
  }

  async function handleSubmit() {
    if (!name || !body || !wabaId) {
      setError("Name, WABA and body are required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onSave({ wabaId, name, language, category, components: buildComponents() });
      onClose();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-modal">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 dark:text-white">Create Template</h3>
          <button onClick={onClose} className="btn-ghost p-2"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>}

          {/* Meta info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">WABA Account</label>
              <select value={wabaId} onChange={e => setWabaId(e.target.value)} className="input">
                {businesses.map(b => <option key={b._id} value={b._id}>{b.businessName || b.wabaId}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="input">
                {["MARKETING", "UTILITY", "AUTHENTICATION"].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Template Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value.toLowerCase().replace(/\s+/g, "_"))} className="input" placeholder="order_confirmation" />
              <p className="text-[10px] text-slate-400 mt-0.5">Lowercase, underscores only</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Language</label>
              <select value={language} onChange={e => setLanguage(e.target.value)} className="input">
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </div>
          </div>

          {/* Header */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Header (optional)</label>
            <div className="flex gap-2 mb-2">
              {["none", "TEXT"].map(t => (
                <button key={t} onClick={() => setHeaderType(t)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${headerType === t ? "border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400" : "border-slate-200 dark:border-slate-700 text-slate-500"}`}>
                  {t === "none" ? "None" : "Text"}
                </button>
              ))}
            </div>
            {headerType === "TEXT" && (
              <input type="text" value={headerText} onChange={e => setHeaderText(e.target.value)} className="input" placeholder="Header text" />
            )}
          </div>

          {/* Body */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Body *</label>
              <button onClick={() => insertVar(setBody)} className="text-xs text-blue-600 hover:text-blue-700">+ Add variable</button>
            </div>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={4} className="input resize-none"
              placeholder="Hello {{1}}, your order {{2}} has been confirmed." />
            <p className="text-[10px] text-slate-400 mt-0.5">Use {`{{1}}`}, {`{{2}}`}… for variables</p>
          </div>

          {/* Footer */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Footer (optional)</label>
            <input type="text" value={footer} onChange={e => setFooter(e.target.value)} className="input" placeholder="Not interested? Tap Stop promotions" />
          </div>

          {/* Buttons */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Buttons (optional)</label>
              {buttons.length < 3 && (
                <button onClick={addButton} className="text-xs text-blue-600 hover:text-blue-700">+ Add button</button>
              )}
            </div>
            {buttons.map((btn, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <select value={btn.type} onChange={e => setButtons(b => { const nb = [...b]; nb[i].type = e.target.value; return nb; })} className="input flex-shrink-0 w-36">
                  <option value="QUICK_REPLY">Quick Reply</option>
                  <option value="URL">URL</option>
                  <option value="PHONE_NUMBER">Phone</option>
                </select>
                <input type="text" value={btn.text} onChange={e => setButtons(b => { const nb = [...b]; nb[i].text = e.target.value; return nb; })} className="input flex-1" placeholder="Button text" />
                <button onClick={() => setButtons(b => b.filter((_, j) => j !== i))} className="btn-ghost p-2 text-red-400">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary btn-sm">Cancel</button>
          <button onClick={handleSubmit} disabled={loading || !name || !body}
            className="btn btn-sm text-white px-5" style={{ background: "#1877F2" }}>
            {loading ? "Submitting…" : "Submit Template"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MetaTemplates() {
  const [templates, setTemplates] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [tRes, bRes] = await Promise.all([
        getTemplates(),
        authFetch("/api/meta/business"),
      ]);
      setTemplates(tRes.data || []);
      setBusinesses(bRes.data || []);
    } catch (e) { console.warn(e); }
    finally { setLoading(false); }
  }

  async function handleCreate(data) {
    await createTemplate(data);
    await fetchAll();
  }

  async function handleDelete(id) {
    if (!confirm("Delete this template? This also removes it from Meta.")) return;
    await deleteTemplate(id);
    setTemplates(t => t.filter(x => x._id !== id));
  }

  async function handleSync(id) {
    await syncTemplate(id);
    await fetchAll();
  }

  const filtered = templates.filter(t => {
    const matchSearch = t.name.includes(search.toLowerCase());
    const matchCat = filterCat ? t.category === filterCat : true;
    return matchSearch && matchCat;
  });

  if (loading) return <div className="page flex items-center justify-center h-64"><div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "#1877F2", borderTopColor: "transparent" }} /></div>;

  return (
    <div className="page space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Message Templates</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Build and manage WhatsApp Business message templates
          </p>
        </div>
        <button
          onClick={() => setShowBuilder(true)}
          className="btn btn-sm text-white px-4 flex items-center gap-2"
          style={{ background: "#1877F2" }}
        >
          <Plus size={14} /> New Template
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search templates…" className="input max-w-xs" />
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="input max-w-xs">
          <option value="">All Categories</option>
          <option value="MARKETING">Marketing</option>
          <option value="UTILITY">Utility</option>
          <option value="AUTHENTICATION">Authentication</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No templates yet</p>
          <p className="text-sm text-slate-400 mt-1">Create your first template to start messaging customers</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="table-container rounded-none border-0">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Language</th>
                  <th>Status</th>
                  <th>WABA</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t._id}>
                    <td className="font-medium text-slate-800 dark:text-slate-200">{t.name}</td>
                    <td><span className={`badge ${catBadge[t.category] || "badge-slate"}`}>{t.category}</span></td>
                    <td className="text-slate-500 text-xs uppercase">{t.language}</td>
                    <td>
                      <span className={`badge ${statusBadge[t.status] || "badge-slate"}`}>{t.status}</span>
                      {t.rejectionReason && (
                        <p className="text-[10px] text-red-500 mt-0.5">{t.rejectionReason}</p>
                      )}
                    </td>
                    <td className="text-slate-500 text-xs">
                      {t.wabaId?.businessName || t.wabaId?.wabaId || "—"}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleSync(t._id)} className="btn-ghost btn-sm p-1.5" title="Sync status">
                          <RefreshCw size={13} />
                        </button>
                        <button onClick={() => handleDelete(t._id)} className="btn-ghost btn-sm p-1.5 text-red-400 hover:text-red-500" title="Delete">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showBuilder && businesses.length > 0 && (
        <TemplateBuilder
          businesses={businesses}
          onSave={handleCreate}
          onClose={() => setShowBuilder(false)}
        />
      )}

      {showBuilder && businesses.length === 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="card p-6 max-w-sm mx-4 text-center">
            <p className="font-medium text-slate-800 dark:text-slate-200 mb-2">No WABA connected</p>
            <p className="text-sm text-slate-400 mb-4">Please connect and sync a WhatsApp Business Account first.</p>
            <button onClick={() => setShowBuilder(false)} className="btn-secondary btn-sm">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
