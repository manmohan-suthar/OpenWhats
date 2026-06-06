import { Plus, X } from "lucide-react";
import { useState } from "react";

export default function QuickReplyForm({ data, onChange }) {
  const [buttonText, setButtonText] = useState("");

  const handleAddButton = () => {
    if (!buttonText.trim()) return;

    const buttons = data.buttons || [];
    const newButton = {
      name: "quick_reply",
      params: {
        display_text: buttonText,
        id: `btn_${Date.now()}`,
      },
      buttonParamsJson: JSON.stringify({
        display_text: buttonText,
        id: `btn_${Date.now()}`,
      }),
    };

    onChange({
      ...data,
      buttons: [...buttons, newButton],
    });

    setButtonText("");
  };

  const handleRemoveButton = (index) => {
    const buttons = data.buttons || [];
    onChange({
      ...data,
      buttons: buttons.filter((_, i) => i !== index),
    });
  };

  const handleBodyChange = (e) => {
    onChange({
      ...data,
      body: e.target.value,
    });
  };

  const handleFooterChange = (e) => {
    onChange({
      ...data,
      footer: e.target.value,
    });
  };

  return (
    <div className="space-y-4">
      {/* Body */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Message Body
        </label>
        <textarea
          value={data.body || ""}
          onChange={handleBodyChange}
          placeholder="Enter message content..."
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
          onChange={handleFooterChange}
          placeholder="Footer text"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Buttons */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Quick Reply Buttons (Max 3)
        </label>

        <div className="space-y-2">
          {data.buttons &&
            data.buttons.map((btn, idx) => {
              let displayText = "Button";
              try {
                const params = btn.params || JSON.parse(btn.buttonParamsJson);
                displayText = params.display_text || "Button";
              } catch {}

              return (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-gray-50 p-2 rounded"
                >
                  <span className="text-sm">{displayText}</span>
                  <button
                    onClick={() => handleRemoveButton(idx)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X size={18} />
                  </button>
                </div>
              );
            })}
        </div>

        {data.buttons?.length < 3 && (
          <div className="flex gap-2 mt-3">
            <input
              type="text"
              value={buttonText}
              onChange={(e) => setButtonText(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAddButton()}
              placeholder="Button text..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddButton}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center gap-2"
            >
              <Plus size={18} />
              Add
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
