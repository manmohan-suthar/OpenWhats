import { useState, useEffect, useRef } from "react";
import { Send, Phone, MessageSquare, RefreshCw } from "lucide-react";
import { getMessages, sendMessage, getTemplates } from "../../services/metaApi.js";
import { authFetch } from "../../services/authFetch.js";

const META_BLUE = "#1877F2";

function groupByContact(messages) {
  const map = {};
  messages.forEach(m => {
    const key = m.to === "incoming" ? m.from : m.to;
    if (!map[key]) map[key] = { phone: key, messages: [], lastMsg: m };
    map[key].messages.push(m);
    if (new Date(m.createdAt) > new Date(map[key].lastMsg.createdAt)) map[key].lastMsg = m;
  });
  return Object.values(map).sort((a, b) => new Date(b.lastMsg.createdAt) - new Date(a.lastMsg.createdAt));
}

export default function MetaChat() {
  const [messages, setMessages] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [numbers, setNumbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendForm, setSendForm] = useState({ to: "", wabaId: "", phoneNumberId: "", templateId: "", components: [] });
  const [sending, setSending] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [selected, messages]);

  async function fetchAll() {
    setLoading(true);
    try {
      const [msgRes, tRes, bRes, nRes] = await Promise.all([
        getMessages({ limit: 200 }),
        getTemplates(),
        authFetch("/api/meta/business"),
        authFetch("/api/meta/numbers"),
      ]);
      const msgs = msgRes.data || [];
      setMessages(msgs);
      setContacts(groupByContact(msgs));
      setTemplates((tRes.data || []).filter(t => t.status === "APPROVED"));
      setBusinesses(bRes.data || []);
      setNumbers(nRes.data || []);
    } catch (e) { console.warn(e); }
    finally { setLoading(false); }
  }

  const selectedMessages = selected
    ? messages.filter(m => m.to === selected || m.from === selected)
    : [];

  async function handleSend() {
    if (!sendForm.to || !sendForm.wabaId || !sendForm.phoneNumberId || !sendForm.templateId) return;
    setSending(true);
    try {
      const t = templates.find(x => x._id === sendForm.templateId);
      await sendMessage({
        wabaId: sendForm.wabaId,
        phoneNumberId: sendForm.phoneNumberId,
        to: sendForm.to,
        type: "template",
        templateName: t.name,
        templateLanguage: t.language,
        templateComponents: sendForm.components,
      });
      setShowSend(false);
      setSendForm({ to: "", wabaId: "", phoneNumberId: "", templateId: "", components: [] });
      await fetchAll();
    } catch (e) { alert(e.message); }
    finally { setSending(false); }
  }

  const statusDot = { sent: "bg-slate-400", delivered: "bg-blue-400", read: "bg-emerald-500", failed: "bg-red-400" };

  if (loading) return <div className="page flex items-center justify-center h-64"><div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: META_BLUE, borderTopColor: "transparent" }} /></div>;

  return (
    <div className="page">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Chat</h1>
          <p className="text-sm text-slate-500 mt-0.5">View conversations and send template messages</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchAll} className="btn-secondary btn-sm flex items-center gap-2">
            <RefreshCw size={13} /> Refresh
          </button>
          <button
            onClick={() => setShowSend(true)}
            className="btn btn-sm text-white px-4 flex items-center gap-2"
            style={{ background: META_BLUE }}
          >
            <Send size={13} /> New Message
          </button>
        </div>
      </div>

      <div className="card overflow-hidden flex" style={{ height: "calc(100vh - 220px)", minHeight: 400 }}>
        {/* Contact list */}
        <div className="w-64 border-r border-slate-100 dark:border-slate-800 flex-shrink-0 overflow-y-auto">
          <div className="p-3 border-b border-slate-100 dark:border-slate-800">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Conversations</p>
          </div>
          {contacts.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-400">No conversations yet</div>
          ) : (
            contacts.map(c => (
              <button
                key={c.phone}
                onClick={() => setSelected(c.phone)}
                className={`w-full text-left px-3 py-3 border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${selected === c.phone ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: META_BLUE }}>
                    {c.phone.slice(-2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{c.phone}</p>
                    <p className="text-[10px] text-slate-400 truncate">{c.lastMsg.body || c.lastMsg.templateName}</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 flex flex-col">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <MessageSquare size={40} className="mb-3 opacity-30" />
              <p className="text-sm">Select a conversation</p>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <Phone size={15} className="text-slate-400" />
                <span className="font-medium text-slate-800 dark:text-slate-200 text-sm">{selected}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {selectedMessages.map(m => (
                  <div key={m._id} className={`flex ${m.type === "incoming" ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-xs px-3 py-2 rounded-xl text-sm ${m.type === "incoming" ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200" : "text-white"}`}
                      style={m.type !== "incoming" ? { background: META_BLUE } : {}}>
                      {m.templateName ? (
                        <div>
                          <p className="text-[10px] opacity-70 mb-0.5">Template: {m.templateName}</p>
                          <p>{m.body || "—"}</p>
                        </div>
                      ) : (
                        <p>{m.body || "—"}</p>
                      )}
                      <div className="flex items-center gap-1 mt-1 justify-end">
                        <span className="text-[10px] opacity-60">{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        {m.status && <span className={`w-1.5 h-1.5 rounded-full ${statusDot[m.status] || "bg-slate-400"}`} />}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Send template modal */}
      {showSend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="card p-6 w-full max-w-md mx-4 space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">Send Template Message</h3>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">To (phone number with country code)</label>
              <input type="text" value={sendForm.to} onChange={e => setSendForm(f => ({ ...f, to: e.target.value }))} className="input" placeholder="919876543210" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">WABA Account</label>
              <select value={sendForm.wabaId} onChange={e => setSendForm(f => ({ ...f, wabaId: e.target.value }))} className="input">
                <option value="">Select WABA…</option>
                {businesses.map(b => <option key={b._id} value={b._id}>{b.businessName || b.wabaId}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Phone Number (sender)</label>
              <select value={sendForm.phoneNumberId} onChange={e => setSendForm(f => ({ ...f, phoneNumberId: e.target.value }))} className="input">
                <option value="">Select number…</option>
                {numbers.map(n => <option key={n._id} value={n.phoneNumberId}>{n.displayPhoneNumber || n.phoneNumberId}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Template</label>
              <select value={sendForm.templateId} onChange={e => setSendForm(f => ({ ...f, templateId: e.target.value }))} className="input">
                <option value="">Select approved template…</option>
                {templates.map(t => <option key={t._id} value={t._id}>{t.name} ({t.language})</option>)}
              </select>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowSend(false)} className="btn-secondary btn-sm">Cancel</button>
              <button
                onClick={handleSend}
                disabled={sending || !sendForm.to || !sendForm.templateId || !sendForm.phoneNumberId}
                className="btn btn-sm text-white px-4"
                style={{ background: META_BLUE }}
              >
                {sending ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
