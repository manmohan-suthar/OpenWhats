import { Phone } from "lucide-react";

export default function CTACallForm({ data, onChange }) {
  const handleChange = (field, value) => {
    onChange({
      ...data,
      [field]: value,
    });
  };

  const updateButton = (field, value) => {
    const buttons = data.buttons || [
      {
        type: "cta_call",
        name: "cta_call",
        text: "Call Now",
        phone: "",
      },
    ];

    buttons[0][field] = value;

    onChange({
      ...data,
      buttons,
    });
  };

  let buttonText = "Call Now";
  let phone = "";

  if (data.buttons && data.buttons.length > 0) {
    buttonText = data.buttons[0].text || "Call Now";
    phone = data.buttons[0].phone || "";
  }

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
          placeholder="e.g., Contact Support"
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
          value={buttonText}
          onChange={(e) => updateButton("text", e.target.value)}
          placeholder="e.g., Call Now"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Phone Number */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          <Phone size={16} />
          Phone Number
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => updateButton("phone", e.target.value)}
          placeholder="918307418627 (without +)"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Enter phone number without country code prefix
        </p>
      </div>
    </div>
  );
}
