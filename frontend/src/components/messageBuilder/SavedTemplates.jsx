import { useState, useEffect } from "react";
import {
  Trash2,
  Copy,
  Loader,
  ChevronDown,
  ChevronUp,
  Code,
  Check,
} from "lucide-react";
import {
  getMessageTemplates,
  deleteMessageTemplate,
  sendInteractiveMessage,
} from "../../services/messageBuilderApi";

export default function SavedTemplates({ onLoadTemplate }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await getMessageTemplates();
      setTemplates(data.data || []);
    } catch (err) {
      console.error("Failed to load templates:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (templateId) => {
    if (!confirm("Delete this template?")) return;

    try {
      await deleteMessageTemplate(templateId);
      setTemplates(templates.filter((t) => t._id !== templateId));
      setMessage({
        type: "success",
        text: "Template deleted",
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: "Failed to delete template",
      });
    }

    setTimeout(() => setMessage(null), 2000);
  };

  const copyToClipboard = (text, templateId) => {
    navigator.clipboard.writeText(text);
    setCopiedId(templateId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const generateCurlCommand = (template) => {
    const apiKey = "your_api_key_here"; // User should replace this
    const sessionId = template.sessionId || "wa_xxxxx";
    const phoneNumber = "918307418627"; // User should replace this

    // Build message object based on template type
    let messageObj = {};

    if (template.type === "cta_copy") {
      const buttonCode =
        template.data?.buttons?.[0]?.params?.copy_code ||
        template.data?.buttons?.[0]?.code ||
        "123456";
      const buttonText =
        template.data?.buttons?.[0]?.params?.display_text ||
        template.data?.buttons?.[0]?.text ||
        "Copy Code";
      messageObj = {
        header: template.data?.header,
        text: template.data?.body || template.data?.text,
        footer: template.data?.footer,
        button: {
          text: buttonText,
          code: buttonCode,
        },
      };
    } else if (template.type === "cta_call") {
      const buttonPhone =
        template.data?.buttons?.[0]?.params?.phone_number ||
        template.data?.buttons?.[0]?.phone ||
        "919876543210";
      const buttonText =
        template.data?.buttons?.[0]?.params?.display_text ||
        template.data?.buttons?.[0]?.text ||
        "Call Now";
      messageObj = {
        header: template.data?.header,
        text: template.data?.body || template.data?.text,
        footer: template.data?.footer,
        button: {
          text: buttonText,
          phone: buttonPhone,
        },
      };
    } else if (template.type === "cta_url") {
      const buttonUrl =
        template.data?.buttons?.[0]?.params?.url ||
        template.data?.buttons?.[0]?.url ||
        "https://example.com";
      const buttonText =
        template.data?.buttons?.[0]?.params?.display_text ||
        template.data?.buttons?.[0]?.text ||
        "Open Link";
      messageObj = {
        header: template.data?.header,
        text: template.data?.body || template.data?.text,
        footer: template.data?.footer,
        button: {
          text: buttonText,
          url: buttonUrl,
        },
      };
    }

    // Remove undefined fields
    Object.keys(messageObj).forEach(
      (key) => messageObj[key] === undefined && delete messageObj[key],
    );

    const curl = `curl -X POST http://localhost:3000/api/messages/send \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "session": "${sessionId}",
    "to": "${phoneNumber}",
    "type": "${template.type}",
    "message": ${JSON.stringify(messageObj, null, 2).split("\n").join("\n    ")}
  }'`;
    return curl;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader size={24} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No templates saved yet</p>
        <p className="text-sm">Create and save templates to see them here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {message && (
        <div
          className={`rounded p-2 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {templates.map((template) => (
        <div
          key={template._id}
          className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition"
        >
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{template.name}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Type:{" "}
                  <span className="uppercase font-medium">{template.type}</span>
                </p>

                {/* Template ID */}
                <div className="mt-2 p-2 bg-gray-50 rounded flex items-center justify-between">
                  <span className="text-xs text-gray-600">
                    ID:{" "}
                    <code className="font-mono text-gray-800">
                      {template._id}
                    </code>
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(template._id, `id-${template._id}`)
                    }
                    className="ml-2 p-1 hover:bg-gray-200 rounded transition"
                    title="Copy Template ID"
                  >
                    {copiedId === `id-${template._id}` ? (
                      <Check size={14} className="text-green-600" />
                    ) : (
                      <Copy size={14} className="text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => onLoadTemplate(template)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                  title="Load template"
                >
                  <Copy size={18} />
                </button>
                <button
                  onClick={() =>
                    setExpandedId(
                      expandedId === template._id ? null : template._id,
                    )
                  }
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded transition"
                  title="View usage"
                >
                  {expandedId === template._id ? (
                    <ChevronUp size={18} />
                  ) : (
                    <ChevronDown size={18} />
                  )}
                </button>
                <button
                  onClick={() => handleDelete(template._id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                  title="Delete template"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            {/* Expanded Usage Section */}
            {expandedId === template._id && (
              <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                {/* Template Preview */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                    <Code size={16} /> Template Details
                  </h4>
                  <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-3 rounded border border-slate-200 text-sm space-y-2">
                    {template.data?.header && (
                      <p>
                        <strong className="text-slate-700">Header:</strong>{" "}
                        <span className="text-slate-600">{template.data.header}</span>
                      </p>
                    )}
                    {(template.data?.body || template.data?.text) && (
                      <p>
                        <strong className="text-slate-700">Body:</strong>{" "}
                        <span className="text-slate-600">{template.data.body || template.data.text}</span>
                      </p>
                    )}
                    {template.data?.footer && (
                      <p>
                        <strong className="text-slate-700">Footer:</strong>{" "}
                        <span className="text-slate-600">{template.data.footer}</span>
                      </p>
                    )}
                    {template.data?.buttons?.length > 0 && (
                      <div>
                        <strong className="text-slate-700">Buttons:</strong>
                        <ul className="mt-1 ml-4 space-y-1">
                          {template.data.buttons.map((btn, idx) => {
                            const displayText = btn.text || btn.params?.display_text || btn.name;
                            const actionValue = btn.code || btn.params?.copy_code || 
                                               btn.phone || btn.params?.phone_number ||
                                               btn.url || btn.params?.url || 
                                               btn.params?.merchant_url || "N/A";
                            return (
                              <li key={idx} className="text-xs text-slate-600">
                                • <strong>{displayText}</strong> → {actionValue}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                    {/* Message Type Badge */}
                    <div className="mt-2 pt-2 border-t border-slate-200">
                      <span className={`inline-block px-2.5 py-1 rounded text-xs font-semibold ${
                        template.type === 'cta_copy' ? 'bg-rose-100 text-rose-700' :
                        template.type === 'cta_call' ? 'bg-emerald-100 text-emerald-700' :
                        template.type === 'cta_url' ? 'bg-violet-100 text-violet-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {template.type === 'cta_copy' ? '🔐 OTP Copy' :
                         template.type === 'cta_call' ? '📞 Call Button' :
                         template.type === 'cta_url' ? '🔗 Link Button' :
                         template.type}
                      </span>
                    </div>
                  </div>
                </div>

                {/* How to Use */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    🔌 How to Use via cURL
                  </h4>
                  <p className="text-xs text-gray-600 mb-2">
                    Copy and paste this command. Update the phone number and session ID:
                  </p>
                  <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-xs overflow-x-auto border border-slate-700 shadow-md">
                    <pre className="whitespace-pre-wrap break-words">{generateCurlCommand(template)}</pre>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        generateCurlCommand(template),
                        `curl-${template._id}`,
                      )
                    }
                    className="mt-2 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center gap-2 font-medium"
                  >
                    {copiedId === `curl-${template._id}` ? (
                      <>
                        <Check size={12} /> Copied to Clipboard!
                      </>
                    ) : (
                      <>
                        <Copy size={12} /> Copy cURL Command
                      </>
                    )}
                  </button>
                </div>

                {/* Additional Info */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 shadow-sm">
                  <p className="font-semibold mb-2">📌 Before Using:</p>
                  <ul className="space-y-1.5 ml-4 list-disc">
                    <li>
                      Update <code className="bg-blue-100 px-1.5 py-0.5 rounded">session</code> with your actual WhatsApp session ID
                    </li>
                    <li>
                      Update <code className="bg-blue-100 px-1.5 py-0.5 rounded">to</code> with the recipient's phone number (with country code, no +)
                    </li>
                    <li>
                      Verify your WhatsApp session is <strong>active and connected</strong>
                    </li>
                    <li>
                      For OTP: Update the <code className="bg-blue-100 px-1.5 py-0.5 rounded">code</code> value with the actual OTP
                    </li>
                  </ul>
                  <p className="mt-2 pt-2 border-t border-blue-200 text-blue-700">
                    ℹ️ No API key needed - just use the session ID
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
