import { Plus, X } from "lucide-react";
import { useState } from "react";

export default function ListForm({ data, onChange }) {
  const [newRow, setNewRow] = useState({ title: "", description: "", id: "" });

  const sections = data.sections || [];

  const handleAddRow = () => {
    if (!newRow.title.trim() || !newRow.id.trim()) return;

    const updatedSections =
      sections.length > 0 ? [...sections] : [{ title: "Options", rows: [] }];

    if (!updatedSections[0].rows) {
      updatedSections[0].rows = [];
    }

    updatedSections[0].rows.push({
      title: newRow.title,
      description: newRow.description,
      rowId: newRow.id,
    });

    onChange({
      ...data,
      sections: updatedSections,
    });

    setNewRow({ title: "", description: "", id: "" });
  };

  const handleRemoveRow = (index) => {
    const updatedSections =
      sections.length > 0 ? [...sections] : [{ title: "Options", rows: [] }];
    if (updatedSections[0].rows) {
      updatedSections[0].rows.splice(index, 1);
    }
    onChange({
      ...data,
      sections: updatedSections,
    });
  };

  const rows = sections.length > 0 && sections[0].rows ? sections[0].rows : [];

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Message Title
        </label>
        <input
          type="text"
          value={data.title || ""}
          onChange={(e) =>
            onChange({
              ...data,
              title: e.target.value,
            })
          }
          placeholder="e.g., Choose an option"
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
          onChange={(e) =>
            onChange({
              ...data,
              body: e.target.value,
            })
          }
          placeholder="Enter message..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows="2"
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
          onChange={(e) =>
            onChange({
              ...data,
              footer: e.target.value,
            })
          }
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
          value={data.buttonText || "View Options"}
          onChange={(e) =>
            onChange({
              ...data,
              buttonText: e.target.value,
            })
          }
          placeholder="e.g., View Options"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* List Items */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          List Options
        </label>

        <div className="space-y-2 mb-4">
          {rows.map((row, idx) => (
            <div
              key={idx}
              className="bg-blue-50 p-3 rounded-lg border border-blue-200"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium text-sm text-gray-800">
                    {row.title}
                  </p>
                  {row.description && (
                    <p className="text-xs text-gray-600">{row.description}</p>
                  )}
                  <p className="text-xs text-blue-600 mt-1">ID: {row.rowId}</p>
                </div>
                <button
                  onClick={() => handleRemoveRow(idx)}
                  className="text-red-500 hover:text-red-700 ml-2"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2 border-t pt-4">
          <input
            type="text"
            value={newRow.title}
            onChange={(e) => setNewRow({ ...newRow, title: e.target.value })}
            placeholder="Option title"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            value={newRow.description}
            onChange={(e) =>
              setNewRow({ ...newRow, description: e.target.value })
            }
            placeholder="Description (optional)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            value={newRow.id}
            onChange={(e) => setNewRow({ ...newRow, id: e.target.value })}
            placeholder="Option ID (e.g., option_1)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAddRow}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            Add Option
          </button>
        </div>
      </div>
    </div>
  );
}
