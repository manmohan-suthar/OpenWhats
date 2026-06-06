import { useState, useEffect } from "react";
import { Megaphone, Plus, Play, Eye, Upload, X } from "lucide-react";
import { getCampaigns, createCampaign, startCampaign, getTemplates } from "../../services/metaApi.js";
import { authFetch } from "../../services/authFetch.js";

const META_BLUE = "#1877F2";
const statusBadge = { draft: "badge-slate", running: "badge-blue", completed: "badge-green", failed: "badge-red", scheduled: "badge-yellow" };

function CampaignModal({ businesses, numbers, templates, onSave, onClose }) {
  const [form, setForm] = useState({
    name: "", wabaId: "", phoneNumberId: "", templateId: "", recipients: "", delayMs: 1000,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function parseRecipients(text) {
    return text.split(/[\n,]+/)
      .map(l => l.trim())
      .filter(Boolean)
      .map(phone => ({ phone: phone.replace(/\D/g, "") }));
  }

  async function handleSubmit() {
    if (!form.name || !form.wabaId || !form.phoneNumberId || !form.templateId || !form.recipients) {
      setError("All fields are required");
      return;
    }
    const recipients = parseRecipients(form.recipients);
    if (recipients.length === 0) { setError("No valid phone numbers"); return; }
    setLoading(true);
    setError("");
    try {
      await onSave({ ...form, recipients });
      onClose();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-modal">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 dark:text-white">Create Campaign</h3>
          <button onClick={onClose} className="btn-ghost p-2"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Campaign Name</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input" placeholder="Summer Promo 2026" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">WABA</label>
              <select value={form.wabaId} onChange={e => setForm(f => ({ ...f, wabaId: e.target.value }))} className="input">
                <option value="">Select…</option>
                {businesses.map(b => <option key={b._id} value={b._id}>{b.businessName || b.wabaId}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">From Number</label>
              <select value={form.phoneNumberId} onChange={e => setForm(f => ({ ...f, phoneNumberId: e.target.value }))} className="input">
                <option value="">Select…</option>
                {numbers.map(n => <option key={n._id} value={n.phoneNumberId}>{n.displayPhoneNumber || n.phoneNumberId}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Template</label>
            <select value={form.templateId} onChange={e => setForm(f => ({ ...f, templateId: e.target.value }))} className="input">
              <option value="">Select approved template…</option>
              {templates.map(t => <option key={t._id} value={t._id}>{t.name} — {t.category}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Recipients (one per line or comma-separated)
            </label>
            <textarea
              value={form.recipients}
              onChange={e => setForm(f => ({ ...f, recipients: e.target.value }))}
              rows={5} className="input resize-none"
              placeholder={"919876543210\n918765432109\n..."}
            />
            <p className="text-[10px] text-slate-400 mt-0.5">
              Count: {form.recipients.split(/[\n,]+/).filter(l => l.trim()).length} numbers
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Delay between messages (ms)</label>
            <input type="number" value={form.delayMs} onChange={e => setForm(f => ({ ...f, delayMs: Number(e.target.value) }))} className="input" min={500} max={10000} />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary btn-sm">Cancel</button>
          <button onClick={handleSubmit} disabled={loading} className="btn btn-sm text-white px-5" style={{ background: META_BLUE }}>
            {loading ? "Creating…" : "Create Campaign"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MetaCampaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [numbers, setNumbers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [cRes, bRes, nRes, tRes] = await Promise.all([
        getCampaigns(),
        authFetch("/api/meta/business"),
        authFetch("/api/meta/numbers"),
        getTemplates(),
      ]);
      setCampaigns(cRes.data || []);
      setBusinesses(bRes.data || []);
      setNumbers(nRes.data || []);
      setTemplates((tRes.data || []).filter(t => t.status === "APPROVED"));
    } catch (e) { console.warn(e); }
    finally { setLoading(false); }
  }

  async function handleCreate(data) {
    await createCampaign(data);
    await fetchAll();
  }

  async function handleStart(id) {
    if (!confirm("Start this campaign? Messages will be sent to all recipients.")) return;
    try {
      await startCampaign(id);
      await fetchAll();
    } catch (e) { alert(e.message); }
  }

  if (loading) return <div className="page flex items-center justify-center h-64"><div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: META_BLUE, borderTopColor: "transparent" }} /></div>;

  return (
    <div className="page space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Campaigns</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Bulk messaging campaigns using approved WhatsApp templates
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn btn-sm text-white px-4 flex items-center gap-2"
          style={{ background: META_BLUE }}
        >
          <Plus size={14} /> New Campaign
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div className="card p-12 text-center">
          <Megaphone size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No campaigns yet</p>
          <p className="text-sm text-slate-400 mt-1">Create a campaign to send bulk template messages</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(c => (
            <div key={c._id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-slate-900 dark:text-white">{c.name}</p>
                    <span className={`badge ${statusBadge[c.status] || "badge-slate"}`}>{c.status}</span>
                  </div>
                  <p className="text-xs text-slate-400">Template: {c.templateName} · {c.totalCount} recipients</p>
                </div>
                <div className="flex gap-2">
                  {c.status === "draft" && (
                    <button onClick={() => handleStart(c._id)} className="btn btn-sm text-white px-3 flex items-center gap-1.5" style={{ background: META_BLUE }}>
                      <Play size={12} /> Start
                    </button>
                  )}
                </div>
              </div>

              {c.totalCount > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex gap-4 text-xs">
                    <span className="text-slate-500">Sent: <span className="font-medium text-slate-700 dark:text-slate-300">{c.sentCount}</span></span>
                    <span className="text-slate-500">Delivered: <span className="font-medium text-emerald-600">{c.deliveredCount}</span></span>
                    <span className="text-slate-500">Failed: <span className="font-medium text-red-500">{c.failedCount}</span></span>
                  </div>
                  {c.status === "running" && (
                    <div className="mt-2 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.round((c.sentCount / c.totalCount) * 100)}%`, background: META_BLUE }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CampaignModal
          businesses={businesses}
          numbers={numbers}
          templates={templates}
          onSave={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
