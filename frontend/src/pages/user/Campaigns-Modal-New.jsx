import { useState, useEffect } from "react";
import {
  Megaphone,
  Plus,
  Search,
  MoreVertical,
  Play,
  Pause,
  Trash2,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  RotateCw,
  BarChart2,
  Calendar,
  ChevronRight,
  StopCircle,
  Eye,
  LayoutGrid,
  List,
  Send,
  AlertTriangle,
  Zap,
  MessageSquare,
  ArrowRight,
  Bell,
  Upload,
  Image as ImageIcon,
  Folder,
  FolderOpen,
  ChevronDown,
  AlertCircle,
  CheckCircleIcon,
  Lock,
  FileText,
  Music,
  Video,
  File,
} from "lucide-react";
import { resolveApiUrl } from "../../config/env";

// Create Campaign Modal - REDESIGNED
function CreateCampaignModal({ numberLists, sessions, onClose, onCreate }) {
  const { token } = useAuth();
  const [step, setStep] = useState(1);
  const [collections, setCollections] = useState([]);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [loadingMedia, setLoadingMedia] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "broadcast",
    message: "",
    mediaFile: null,
    mediaPreview: null,
    numberListId: "",
    sessionId: "",
    mode: "instant",
    startTime: "14:00",
    scheduledFor: "",
    delaySeconds: 15,
    minDelay: 10,
    maxDelay: 30,
    randomizeDelay: false,
    autoRetry: false,
  });

  // Fetch collections with all media
  const fetchCollections = async () => {
    try {
      setLoadingMedia(true);
      const res = await fetch("/api/media", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success || data.data) {
        setCollections(Array.isArray(data.data) ? data.data : []);
      }
    } catch (err) {
      console.error("Error fetching collections:", err);
    } finally {
      setLoadingMedia(false);
    }
  };

  // Calculate completion percentage
  const getStepCompletion = () => {
    switch (step) {
      case 1:
        return formData.name.trim() && formData.type ? 100 : 0;
      case 2:
        return formData.message.trim() ? 100 : 0;
      case 3:
        return formData.numberListId && formData.sessionId ? 100 : 0;
      case 4:
        return formData.mode === "scheduled" && !formData.scheduledFor
          ? 0
          : 100;
      default:
        return 0;
    }
  };

  const getStepErrors = () => {
    const errors = [];
    if (step === 1) {
      if (!formData.name.trim()) errors.push("Campaign name is required");
      if (!formData.type) errors.push("Campaign type is required");
    }
    if (step === 2) {
      if (!formData.message.trim()) errors.push("Message content is required");
    }
    if (step === 3) {
      if (!formData.numberListId) errors.push("Number list is required");
      if (!formData.sessionId) errors.push("WhatsApp session is required");
    }
    return errors;
  };

  const canProceedToNext = () => {
    if (step === 1) return formData.name.trim() && formData.type;
    if (step === 2) return formData.message.trim();
    if (step === 3) return formData.numberListId && formData.sessionId;
    if (step === 4 && formData.mode === "scheduled")
      return !!formData.scheduledFor;
    return true;
  };

  const handleNext = () => {
    if (canProceedToNext()) {
      setStep(step + 1);
    }
  };

  const handleCreate = () => {
    if (canProceedToNext()) {
      onCreate(formData);
    }
  };

  const selectedList = numberLists?.find(
    (l) => l._id === formData.numberListId,
  );
  const selectedSession = sessions?.find((s) => s._id === formData.sessionId);
  const steps = ["Details", "Message", "Recipients", "Settings"];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-b border-slate-200 dark:border-slate-700 px-8 py-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                <Megaphone size={20} className="text-primary-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Create Campaign
              </h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Step {step} of 4: {steps[step - 1]}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <XCircle size={24} className="text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-8 py-4">
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex-1">
                <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      s < step
                        ? "bg-green-500"
                        : s === step
                          ? "bg-primary-500"
                          : "bg-slate-300 dark:bg-slate-600"
                    }`}
                    style={{
                      width: s < step ? "100%" : s === step ? "75%" : "0%",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {/* Step 1: Details */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white mb-3">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 text-xs font-bold text-primary-600">
                    *
                  </span>
                  Campaign Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g. April Promo Blast"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-primary-500 dark:focus:border-primary-500 text-slate-900 dark:text-white placeholder-slate-400"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-900 dark:text-white mb-3 block">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="What is this campaign about?"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-primary-500 dark:focus:border-primary-500 text-slate-900 dark:text-white placeholder-slate-400"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white mb-3">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 text-xs font-bold text-primary-600">
                    *
                  </span>
                  Campaign Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {CAMPAIGN_TYPES.map((type) => {
                    const TypeIcon = type.icon;
                    return (
                      <button
                        key={type.id}
                        onClick={() =>
                          setFormData({ ...formData, type: type.id })
                        }
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          formData.type === type.id
                            ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <TypeIcon
                            size={18}
                            className={
                              formData.type === type.id
                                ? "text-primary-600"
                                : "text-slate-600 dark:text-slate-400"
                            }
                          />
                          <p className="font-semibold text-sm text-slate-900 dark:text-white">
                            {type.label}
                          </p>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {type.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Message & Media */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white mb-3">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 text-xs font-bold text-primary-600">
                    *
                  </span>
                  Message Text
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  placeholder="Enter your message (use {name}, {date}, {time}, {phone} for placeholders)"
                  rows="5"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-primary-500 dark:focus:border-primary-500 text-slate-900 dark:text-white placeholder-slate-400 resize-none"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  💡 Use {"{name}"}, {"{date}"}, {"{time}"}, {"{phone}"} for
                  dynamic values
                </p>
              </div>

              {/* Media Section */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                <label className="text-sm font-semibold text-slate-900 dark:text-white mb-3 block">
                  Add Media (Optional)
                </label>

                {formData.mediaPreview ? (
                  <div className="relative mb-4">
                    {formData.mediaFile?.type === "image" ? (
                      <img
                        src={formData.mediaPreview}
                        alt="Selected"
                        className="w-full h-48 object-cover rounded-xl border-2 border-primary-200 dark:border-primary-800"
                      />
                    ) : formData.mediaFile?.type === "video" ? (
                      <video
                        src={formData.mediaPreview}
                        controls
                        className="w-full h-48 rounded-xl border-2 border-primary-200 dark:border-primary-800 bg-black"
                      />
                    ) : formData.mediaFile?.type === "audio" ? (
                      <div className="w-full h-48 rounded-xl border-2 border-primary-200 dark:border-primary-800 bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center gap-3">
                        <Music size={36} className="text-primary-500" />
                        <span className="text-sm text-slate-600 dark:text-slate-400 truncate max-w-[80%]">
                          {formData.mediaFile?.name}
                        </span>
                        <audio
                          src={formData.mediaPreview}
                          controls
                          className="w-[80%]"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-48 rounded-xl border-2 border-primary-200 dark:border-primary-800 bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center gap-3">
                        {formData.mediaFile?.type === "pdf" ? (
                          <FileText size={36} className="text-red-500" />
                        ) : (
                          <File size={36} className="text-slate-500" />
                        )}
                        <span className="text-sm text-slate-600 dark:text-slate-400 truncate max-w-[80%]">
                          {formData.mediaFile?.name}
                        </span>
                      </div>
                    )}
                    <button
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          mediaFile: null,
                          mediaPreview: null,
                        }))
                      }
                      className="absolute top-3 right-3 bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors shadow-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Upload Card */}
                    <button
                      onClick={() => setShowMediaPicker(true)}
                      className="w-full p-6 border-2 border-dashed border-primary-300 dark:border-primary-700 rounded-xl hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors group"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-lg group-hover:bg-primary-200 dark:group-hover:bg-primary-900/50 transition-colors">
                          <ImageIcon size={24} className="text-primary-600" />
                        </div>
                        <p className="font-semibold text-primary-600 dark:text-primary-400">
                          Browse Media Gallery
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Click to choose from collections
                        </p>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Recipients & Session */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Number List */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white mb-3">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 text-xs font-bold text-primary-600">
                    *
                  </span>
                  Number List
                </label>

                {numberLists && numberLists.length > 0 ? (
                  <div className="space-y-2">
                    <select
                      value={formData.numberListId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          numberListId: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-primary-500 dark:focus:border-primary-500 text-slate-900 dark:text-white"
                    >
                      <option value="">Select a number list...</option>
                      {numberLists.map((list) => (
                        <option key={list._id} value={list._id}>
                          {list.name} •{" "}
                          {list.numbers?.length || list.count || 0} contacts
                        </option>
                      ))}
                    </select>
                    {selectedList && (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
                        <CheckCircle2 size={18} className="text-green-600" />
                        <p className="text-sm text-green-700 dark:text-green-300">
                          ✓{" "}
                          {selectedList.numbers?.length ||
                            selectedList.count ||
                            0}{" "}
                          contacts ready to receive
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-3">
                    <AlertCircle
                      size={20}
                      className="text-amber-600 flex-shrink-0 mt-0.5"
                    />
                    <div>
                      <p className="font-semibold text-amber-900 dark:text-amber-200 text-sm">
                        No number lists created
                      </p>
                      <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                        You need to create at least one number list before you
                        can send campaigns.
                      </p>
                      <a
                        href="/dashboard/lists"
                        className="inline-flex items-center gap-1 mt-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs rounded-lg transition-colors"
                      >
                        <Plus size={12} /> Create Number List
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* WhatsApp Session */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white mb-3">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 text-xs font-bold text-primary-600">
                    *
                  </span>
                  WhatsApp Session
                </label>

                {sessions && sessions.length > 0 ? (
                  <div className="space-y-2">
                    <select
                      value={formData.sessionId}
                      onChange={(e) =>
                        setFormData({ ...formData, sessionId: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-primary-500 dark:focus:border-primary-500 text-slate-900 dark:text-white"
                    >
                      <option value="">Select a session...</option>
                      {sessions.map((session) => (
                        <option key={session._id} value={session._id}>
                          {session.phone} • {session.sessionId} ✓
                        </option>
                      ))}
                    </select>
                    {selectedSession && (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
                        <CheckCircle2 size={18} className="text-green-600" />
                        <p className="text-sm text-green-700 dark:text-green-300">
                          ✓ Connected from {selectedSession.phone}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-3">
                    <AlertCircle
                      size={20}
                      className="text-amber-600 flex-shrink-0 mt-0.5"
                    />
                    <div>
                      <p className="font-semibold text-amber-900 dark:text-amber-200 text-sm">
                        No WhatsApp sessions connected
                      </p>
                      <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                        You need at least one connected WhatsApp session to send
                        campaigns.
                      </p>
                      <a
                        href="/dashboard/sessions"
                        className="inline-flex items-center gap-1 mt-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs rounded-lg transition-colors"
                      >
                        <Plus size={12} /> Connect Session
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Settings */}
          {step === 4 && (
            <div className="space-y-5">
              {/* Send Mode */}
              <div>
                <label className="text-sm font-semibold text-slate-900 dark:text-white mb-3 block">
                  Send Mode *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      id: "instant",
                      icon: Zap,
                      label: "Instant",
                      desc: "Send all messages immediately",
                    },
                    {
                      id: "interval",
                      icon: Clock,
                      label: "Delayed",
                      desc: "Gap between each message",
                    },
                    {
                      id: "scheduled",
                      icon: Calendar,
                      label: "Scheduled",
                      desc: "Auto-start at a set time",
                    },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() =>
                        setFormData({ ...formData, mode: mode.id })
                      }
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        formData.mode === mode.id
                          ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <mode.icon
                        size={18}
                        className={`mb-1.5 ${formData.mode === mode.id ? "text-primary-600" : "text-slate-400"}`}
                      />
                      <p className="font-semibold text-sm text-slate-900 dark:text-white">
                        {mode.label}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {mode.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Scheduled: date/time picker */}
              {formData.mode === "scheduled" && (
                <div className="rounded-xl border-2 border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/10 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar size={15} className="text-primary-600" />
                    <p className="text-sm font-semibold text-primary-800 dark:text-primary-200">
                      Schedule Date &amp; Time *
                    </p>
                  </div>
                  <input
                    type="datetime-local"
                    value={formData.scheduledFor}
                    min={new Date().toISOString().slice(0, 16)}
                    onChange={(e) =>
                      setFormData({ ...formData, scheduledFor: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-primary-500 text-slate-900 dark:text-white text-sm"
                  />
                  {formData.scheduledFor && (
                    <p className="text-xs text-primary-700 dark:text-primary-300">
                      ⏰ Campaign will auto-start on{" "}
                      <strong>
                        {new Date(formData.scheduledFor).toLocaleString()}
                      </strong>
                    </p>
                  )}
                </div>
              )}

              {/* Message Gap Settings (interval or scheduled) */}
              {(formData.mode === "interval" ||
                formData.mode === "scheduled") && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Message Gap Settings
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Each message waits before the next is sent
                    </p>
                  </div>
                  <div className="p-4 space-y-4">
                    {/* Randomize toggle */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                          Randomize Delay
                        </p>
                        <p className="text-xs text-slate-500">
                          Randomizes gap to appear more natural
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setFormData({
                            ...formData,
                            randomizeDelay: !formData.randomizeDelay,
                          })
                        }
                        className={`relative inline-flex w-11 h-6 rounded-full transition-colors flex-shrink-0 ${formData.randomizeDelay ? "bg-primary-600" : "bg-slate-300 dark:bg-slate-600"}`}
                      >
                        <span
                          className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${formData.randomizeDelay ? "translate-x-5" : "translate-x-0"}`}
                        />
                      </button>
                    </div>

                    {formData.randomizeDelay ? (
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between mb-1">
                            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                              Min delay
                            </label>
                            <span className="text-xs font-bold text-primary-600">
                              {formData.minDelay}s
                            </span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="120"
                            step="1"
                            value={formData.minDelay}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                minDelay: Math.min(
                                  parseInt(e.target.value),
                                  formData.maxDelay - 1,
                                ),
                              })
                            }
                            className="w-full accent-primary-600"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                              Max delay
                            </label>
                            <span className="text-xs font-bold text-primary-600">
                              {formData.maxDelay}s
                            </span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="300"
                            step="1"
                            value={formData.maxDelay}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                maxDelay: Math.max(
                                  parseInt(e.target.value),
                                  formData.minDelay + 1,
                                ),
                              })
                            }
                            className="w-full accent-primary-600"
                          />
                        </div>
                        <p className="text-xs text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">
                          Each message will wait a random{" "}
                          <strong>
                            {formData.minDelay}–{formData.maxDelay}s
                          </strong>{" "}
                          before sending
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div className="flex justify-between mb-1">
                          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            Fixed delay
                          </label>
                          <span className="text-xs font-bold text-primary-600">
                            {formData.delaySeconds}s
                          </span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="300"
                          step="1"
                          value={formData.delaySeconds}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              delaySeconds: parseInt(e.target.value),
                            })
                          }
                          className="w-full accent-primary-600"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Auto-retry failed */}
              <div className="flex items-center justify-between px-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    Auto-retry Failed
                  </p>
                  <p className="text-xs text-slate-500">
                    Retry failed numbers once after campaign ends
                  </p>
                </div>
                <button
                  onClick={() =>
                    setFormData({ ...formData, autoRetry: !formData.autoRetry })
                  }
                  className={`relative inline-flex w-11 h-6 rounded-full transition-colors flex-shrink-0 ${formData.autoRetry ? "bg-primary-600" : "bg-slate-300 dark:bg-slate-600"}`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${formData.autoRetry ? "translate-x-5" : "translate-x-0"}`}
                  />
                </button>
              </div>

              {/* Summary */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
                  📊 Campaign Summary
                </p>
                <ul className="space-y-1 text-xs text-blue-800 dark:text-blue-300">
                  <li>
                    • Recipients:{" "}
                    <span className="font-semibold">
                      {selectedList?.numbers?.length ||
                        selectedList?.count ||
                        0}{" "}
                      contacts
                    </span>
                  </li>
                  <li>
                    • From:{" "}
                    <span className="font-semibold">
                      {selectedSession?.phone}
                    </span>
                  </li>
                  <li>
                    • Mode:{" "}
                    <span className="font-semibold capitalize">
                      {formData.mode}
                    </span>
                  </li>
                  {formData.mode === "scheduled" && formData.scheduledFor && (
                    <li>
                      • Starts:{" "}
                      <span className="font-semibold">
                        {new Date(formData.scheduledFor).toLocaleString()}
                      </span>
                    </li>
                  )}
                  {formData.mode !== "instant" && (
                    <li>
                      • Gap:{" "}
                      <span className="font-semibold">
                        {formData.randomizeDelay
                          ? `${formData.minDelay}–${formData.maxDelay}s (random)`
                          : `${formData.delaySeconds}s fixed`}
                      </span>
                    </li>
                  )}
                  {formData.autoRetry && (
                    <li>
                      • Auto-retry: <span className="font-semibold">On</span>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Errors */}
        {getStepErrors().length > 0 && (
          <div className="border-t border-slate-200 dark:border-slate-700 bg-red-50 dark:bg-red-900/20 px-8 py-3">
            {getStepErrors().map((error, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300"
              >
                <AlertTriangle size={16} />
                {error}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-t border-slate-200 dark:border-slate-700 px-8 py-4 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors font-medium"
          >
            Cancel
          </button>
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="px-6 py-2 border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium"
            >
              Back
            </button>
          )}
          {step < 4 ? (
            <button
              onClick={handleNext}
              disabled={!canProceedToNext()}
              className={`px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-all ${
                canProceedToNext()
                  ? "bg-primary-600 hover:bg-primary-700 text-white"
                  : "bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-50"
              }`}
            >
              Next
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={!canProceedToNext()}
              className={`px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-all ${
                canProceedToNext()
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-50"
              }`}
            >
              <Send size={16} />
              Create Campaign
            </button>
          )}
        </div>
      </div>

      {/* Media Picker Modal */}
      {showMediaPicker && (
        <MediaPickerModal
          collections={collections}
          loading={loadingMedia}
          onSelect={(media) => {
            setFormData((prev) => ({
              ...prev,
              mediaFile: media,
              mediaPreview: media.fileUrl ? resolveApiUrl(media.fileUrl) : null,
            }));
            setShowMediaPicker(false);
          }}
          onClose={() => setShowMediaPicker(false)}
        />
      )}
    </div>
  );
}

// Media Picker Modal
function MediaPickerModal({ collections, loading, onSelect, onClose }) {
  const [expandedCollections, setExpandedCollections] = useState({});

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <ImageIcon size={24} className="text-primary-600" />
            Select Media
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
          >
            <XCircle size={24} className="text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-slate-200 dark:border-slate-700 border-t-primary-600 rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-slate-600 dark:text-slate-400">
                  Loading collections...
                </p>
              </div>
            </div>
          ) : collections && collections.length > 0 ? (
            collections.map((collection) => (
              <CollectionMediaSection
                key={collection._id}
                collection={collection}
                expanded={expandedCollections[collection._id]}
                onToggle={() =>
                  setExpandedCollections((prev) => ({
                    ...prev,
                    [collection._id]: !prev[collection._id],
                  }))
                }
                onSelect={onSelect}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-64">
              <FolderOpen
                size={48}
                className="text-slate-300 dark:text-slate-700 mb-3"
              />
              <p className="text-slate-600 dark:text-slate-400">
                No media collections found
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
                Create a collection in Media Gallery first
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Collection Media Section
function CollectionMediaSection({ collection, expanded, onToggle, onSelect }) {
  const allMedia = [
    ...(collection.media || []),
    ...(collection.subcollections?.flatMap((sc) => sc.media) || []),
  ];

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Folder size={20} className="text-primary-600" />
          <div className="text-left">
            <p className="font-semibold text-slate-900 dark:text-white">
              {collection.name}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {allMedia.length} file{allMedia.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <ChevronDown
          size={20}
          className={`text-slate-600 dark:text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          {allMedia.length > 0 ? (
            <div className="grid grid-cols-4 gap-3">
              {allMedia.map((media) => (
                <button
                  key={media.id}
                  onClick={() => onSelect(media)}
                  className="aspect-square overflow-hidden rounded-lg border-2 border-slate-200 dark:border-slate-700 hover:border-primary-500 transition-all group relative"
                  title={media.name}
                >
                  {media.type === "image" ? (
                    <img
                      src={resolveApiUrl(media.fileUrl)}
                      alt={media.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    />
                  ) : media.type === "video" ? (
                    <div className="w-full h-full bg-slate-800 flex flex-col items-center justify-center gap-1">
                      <Video size={28} className="text-blue-400" />
                      <span className="text-[10px] text-slate-300 truncate max-w-[90%] px-1">
                        {media.name}
                      </span>
                    </div>
                  ) : media.type === "audio" ? (
                    <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center gap-1">
                      <Music size={28} className="text-purple-500" />
                      <span className="text-[10px] text-slate-500 dark:text-slate-300 truncate max-w-[90%] px-1">
                        {media.name}
                      </span>
                    </div>
                  ) : media.type === "pdf" ? (
                    <div className="w-full h-full bg-red-50 dark:bg-red-900/20 flex flex-col items-center justify-center gap-1">
                      <FileText size={28} className="text-red-500" />
                      <span className="text-[10px] text-slate-500 dark:text-slate-300 truncate max-w-[90%] px-1">
                        {media.name}
                      </span>
                    </div>
                  ) : (
                    <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center gap-1">
                      <File size={28} className="text-slate-500" />
                      <span className="text-[10px] text-slate-500 dark:text-slate-300 truncate max-w-[90%] px-1">
                        {media.name}
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-4">
              No images in this collection
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function Campaigns() {
  // ... (rest of campaigns code remains the same)
}
