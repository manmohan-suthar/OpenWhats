import { MessageCircle, CheckCircle, AlertCircle } from "lucide-react";

export default function WhatsAppPreview({ type, data }) {
  const safeData = data || {};

  const safeJsonParse = (value, fallback = {}) => {
    if (!value || typeof value !== "string") return fallback;
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  };

  const renderContent = () => {
    switch (type) {
      case "quick_reply":
        return (
          <div className="space-y-3">
            <p className="text-gray-800">{safeData.body}</p>
            {safeData.buttons && safeData.buttons.length > 0 && (
              <div className="space-y-2">
                {safeData.buttons.map((btn, idx) => {
                  let text = "Button";
                  const params =
                    btn.params || safeJsonParse(btn.buttonParamsJson);
                  text = params.display_text || btn.text || text;
                  return (
                    <button
                      key={idx}
                      className="w-full bg-blue-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-600"
                      disabled
                    >
                      {text}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );

      case "cta_url":
      case "cta_call":
        return (
          <div className="space-y-3">
            {safeData.title && (
              <p className="font-bold text-gray-900">{safeData.title}</p>
            )}
            <p className="text-gray-800">{safeData.body}</p>
            <button
              className="w-full bg-green-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-600"
              disabled
            >
              {safeData.buttons?.[0]?.text || "Button"}
            </button>
          </div>
        );

      case "cta_copy":
        return (
          <div className="space-y-3">
            <p className="text-gray-800">{safeData.body}</p>
            <div className="bg-blue-50 border border-blue-300 rounded-lg p-3 text-center">
              <p className="text-blue-600 font-mono font-bold text-2xl">
                {safeData.buttons?.[0]?.params?.copy_code ||
                  safeJsonParse(safeData.buttons?.[0]?.buttonParamsJson)
                    .copy_code ||
                  safeData.buttons?.[0]?.code ||
                  "000000"}
              </p>
            </div>
            <button
              className="w-full bg-blue-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-600"
              disabled
            >
              Copy OTP
            </button>
          </div>
        );

      case "list":
        return (
          <div className="space-y-3">
            {safeData.title && (
              <p className="font-bold text-gray-900">{safeData.title}</p>
            )}
            <p className="text-gray-800 text-sm">{safeData.body}</p>
            <button
              className="w-full bg-blue-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-600"
              disabled
            >
              {safeData.buttonText || "View Options"} ⬇️
            </button>
            {safeData.sections?.[0]?.rows && (
              <div className="border-t pt-3 space-y-1">
                {safeData.sections[0].rows.slice(0, 3).map((row, idx) => (
                  <div
                    key={idx}
                    className="bg-gray-50 p-2 rounded text-sm hover:bg-gray-100 cursor-pointer"
                  >
                    <p className="font-medium text-gray-900">{row.title}</p>
                    {row.description && (
                      <p className="text-xs text-gray-600">{row.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return <p className="text-gray-500">Select a message type</p>;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b">
        <MessageCircle className="text-green-600" size={20} />
        <span className="text-sm font-medium text-gray-700">
          WhatsApp Preview
        </span>
      </div>

      <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-4 border border-green-100 min-h-40">
        <div className="bg-white rounded-lg shadow-sm p-4">
          {renderContent()}
        </div>
      </div>

      {safeData.footer && (
        <p className="text-xs text-gray-500 text-center mt-3">
          {safeData.footer}
        </p>
      )}
    </div>
  );
}
