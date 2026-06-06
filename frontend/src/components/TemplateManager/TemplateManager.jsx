import { useEffect, useState } from "react";
import { PlusCircle, Save } from "lucide-react";
import Modal from "../ui/Modal";
import { saveMessageTemplate } from "../../services/messageBuilderApi";

export default function TemplateManager({
  onClose,
  onSaved,
  sessions = [],
  defaultSessionId = "",
}) {
  const [loading, setLoading] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState(
    defaultSessionId || "",
  );
  const [name, setName] = useState("");
  const [header, setHeader] = useState("");
  const [body, setBody] = useState("");
  const [footer, setFooter] = useState("");
  const [buttons, setButtons] = useState([{ text: "", code: "" }]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (defaultSessionId) {
      setSelectedSessionId(defaultSessionId);
      return;
    }
    if (!selectedSessionId && sessions.length > 0) {
      const first =
        sessions[0].sessionId || sessions[0]._id || sessions[0].id || "";
      setSelectedSessionId(first);
    }
  }, [defaultSessionId, sessions, selectedSessionId]);

  function updateButton(idx, field, value) {
    setButtons((prev) =>
      prev.map((b, i) => (i === idx ? { ...b, [field]: value } : b)),
    );
  }
  function addButton() {
    setButtons((p) => [...p, { text: "", code: "" }]);
  }
  function removeButton(idx) {
    setButtons((p) => p.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    setError("");
    if (!selectedSessionId)
      return setError("No active session. Connect a WhatsApp session first.");
    if (!name.trim()) return setError("Template name is required");
    if (!body.trim()) return setError("Body is required");

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        type: "cta_copy",
        sessionId: selectedSessionId,
        data: {
          body: body.trim(),
          footer: footer.trim(),
          ...(header.trim() ? { header: header.trim() } : {}),
          buttons: buttons
            .filter((b) => (b.text || "").toString().trim())
            .map((b) => {
              const text = (b.text || "").toString().trim();
              const code = (b.code || "").toString().trim();
              const params = { display_text: text, copy_code: code };
              return {
                name: "cta_copy",
                text,
                code,
                params,
                buttonParamsJson: JSON.stringify(params),
              };
            }),
        },
      };

      const res = await saveMessageTemplate(payload);
      if (!res || !res.success)
        throw new Error(res?.error || "Failed to create template");
      onSaved && onSaved({ ...res.data, selectedSessionId });
    } catch (err) {
      setError(err?.message || "Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Create Message Template"
      size="2xl"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary px-4 py-2 rounded">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 rounded bg-blue-600 text-white inline-flex items-center gap-2"
          >
            <Save size={16} /> {loading ? "Saving…" : "Save Template"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="text-sm text-red-700 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-slate-600">WhatsApp Session</label>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="mt-1 block w-full border rounded p-2"
            >
              <option value="">Select session</option>
              {sessions.map((s) => {
                const value = s.sessionId || s._id || s.id || "";
                const label = s.phoneNumber || s.phone || s.name || value;
                return (
                  <option key={value} value={value}>
                    {label}
                  </option>
                );
              })}
            </select>
            {sessions.length === 0 && (
              <p className="mt-1 text-xs text-amber-700">
                No active session found. Please create/connect a session first.
              </p>
            )}
          </div>

          <div>
            <label className="text-sm text-slate-600">Template Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full border rounded p-2"
              placeholder="my_template_name"
            />
          </div>
        </div>

        <div>
          <label className="text-sm text-slate-600">Header (optional)</label>
          <input
            value={header}
            onChange={(e) => setHeader(e.target.value)}
            className="mt-1 block w-full border rounded p-2"
            placeholder="Optional header text"
          />
        </div>

        <div>
          <label className="text-sm text-slate-600">Body</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="mt-1 block w-full border rounded p-2"
            rows={4}
            placeholder="Hello {{1}}, your OTP is {{2}}"
          />
        </div>

        <div>
          <label className="text-sm text-slate-600">Footer (optional)</label>
          <input
            value={footer}
            onChange={(e) => setFooter(e.target.value)}
            className="mt-1 block w-full border rounded p-2"
            placeholder="Footer text"
          />
        </div>

        <div>
          <label className="text-sm text-slate-600">Buttons (optional)</label>
          <div className="space-y-2 mt-2">
            {buttons.map((b, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  value={b.text}
                  onChange={(e) => updateButton(idx, "text", e.target.value)}
                  placeholder="Button text"
                  className="flex-1 border rounded p-2"
                />
                <input
                  value={b.code}
                  onChange={(e) => updateButton(idx, "code", e.target.value)}
                  placeholder="code (e.g. OTP)"
                  className="w-40 border rounded p-2"
                />
                <button
                  onClick={() => removeButton(idx)}
                  className="p-2 text-red-600"
                >
                  Remove
                </button>
              </div>
            ))}

            <button
              onClick={addButton}
              className="inline-flex items-center gap-2 text-blue-600"
            >
              <PlusCircle size={16} /> Add button
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
