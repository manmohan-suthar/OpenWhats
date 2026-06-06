import { Link2 } from "lucide-react";

export default function CTAUrlForm({ data, onChange }) {
  const handleChange = (field, value) => {
    onChange({
      ...data,
      [field]: value,
    });
  };

  const updateButton = (field, value) => {
    const buttons = data.buttons || [
      {
        type: "cta_url",
        name: "cta_url",
        buttonParamsJson: JSON.stringify({
          display_text: "",
          url: "",
        }),
      },
    ];

    try {
      const params = JSON.parse(buttons[0].buttonParamsJson);
      params[field] = value;
      buttons[0].buttonParamsJson = JSON.stringify(params);
    } catch {
      buttons[0].buttonParamsJson = JSON.stringify({
        display_text: field === "display_text" ? value : "",
        url: field === "url" ? value : "",
      });
    }

    onChange({
      ...data,
      buttons,
    });
  };

  let displayText = "Open Website";
  let url = "";

  try {
    const buttons = data.buttons || [];
    if (buttons.length > 0) {
      const params = JSON.parse(buttons[0].buttonParamsJson);
      displayText = params.display_text || "Open Website";
      url = params.url || "";
    }
  } catch {}

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Header (Optional)
        </label>
        <input
          type="text"
          value={data.header || ""}
          onChange={(e) => handleChange("header", e.target.value)}
          placeholder="e.g., Special Offer"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Body */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Message Body
        </label>
        <textarea
          value={data.body || ""}
          onChange={(e) => handleChange("body", e.target.value)}
          placeholder="Enter message..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows="3"
        />
      </div>

      {/* Footer */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Footer (Optional)
        </label>
        <input
          type="text"
          value={data.footer || ""}
          onChange={(e) => handleChange("footer", e.target.value)}
          placeholder="Footer text"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Button Text */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Button Text
        </label>
        <input
          type="text"
          value={displayText}
          onChange={(e) => updateButton("display_text", e.target.value)}
          placeholder="e.g., Visit Website"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* URL */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          <Link2 size={16} />
          URL
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => updateButton("url", e.target.value)}
          placeholder="https://example.com"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}
