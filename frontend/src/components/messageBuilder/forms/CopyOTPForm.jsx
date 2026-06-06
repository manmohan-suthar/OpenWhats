import { Copy, Lock } from "lucide-react";

export default function CopyOTPForm({ data, onChange }) {
  const handleChange = (field, value) => {
    onChange({
      ...data,
      [field]: value,
    });
  };

  const updateButton = (field, value) => {
    const buttons = data.buttons || [
      {
        type: "cta_copy",
        name: "cta_copy",
        params: {
          display_text: "Copy OTP",
          copy_code: "",
        },
        buttonParamsJson: JSON.stringify({
          display_text: "Copy OTP",
          copy_code: "",
        }),
      },
    ];

    try {
      const params =
        buttons[0].params || JSON.parse(buttons[0].buttonParamsJson);
      params[field] = value;
      buttons[0].params = params;
      buttons[0].buttonParamsJson = JSON.stringify(params);
    } catch {
      buttons[0].params = {
        display_text: "Copy OTP",
        copy_code: value,
      };
      buttons[0].buttonParamsJson = JSON.stringify(buttons[0].params);
    }

    onChange({
      ...data,
      buttons,
    });
  };

  let otpCode = "";

  try {
    const buttons = data.buttons || [];
    if (buttons.length > 0) {
      const params =
        buttons[0].params || JSON.parse(buttons[0].buttonParamsJson);
      otpCode = params.copy_code || "";
    }
  } catch {}

  return (
    <div className="space-y-4">
      {/* Info */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
        <p className="font-medium mb-1 flex items-center gap-2">
          <Lock size={16} />
          OTP Copy Message
        </p>
        <p>Users can tap the button to copy the OTP code to their clipboard.</p>
      </div>

      {/* Header */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Header (Optional)
        </label>
        <input
          type="text"
          value={data.header || ""}
          onChange={(e) => handleChange("header", e.target.value)}
          placeholder="e.g., Verification Code"
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
          placeholder="e.g., Your OTP is below. Tap to copy."
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

      {/* OTP Code */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          <Copy size={16} />
          OTP Code
        </label>
        <input
          type="text"
          value={otpCode}
          onChange={(e) => updateButton("copy_code", e.target.value)}
          placeholder="e.g., 482910"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-center text-lg"
        />
        <p className="text-xs text-gray-500 mt-1">
          The code will be displayed and copyable to user's clipboard
        </p>
      </div>

      {/* Preview */}
      {otpCode && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-xs text-green-800 font-medium mb-2">Preview:</p>
          <div className="bg-white border border-green-300 rounded p-2 text-center">
            <p className="text-green-600 font-mono font-bold text-2xl">
              {otpCode}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
