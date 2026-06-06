import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Image,
  Loader2,
  Pin,
  Play,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { createReelCampaign } from "../../services/reelsApi";
import { searchPinterestVideos } from "../../services/pinterestApi";
import { useAuth } from "../../contexts/AuthContext";
import { resolveApiUrl } from "../../config/env";
import io from "socket.io-client";

const GAP_OPTIONS = [30, 60, 120, 360, 720, 1440];
const TONES = ["Viral", "Professional", "Motivational", "Funny", "Educational"];

const STAGES = {
  created: { label: "Campaign Created", icon: "✅", color: "green" },
  preparing: { label: "Preparing Pinterest Posts", icon: "📌", color: "blue" },
  prepared: { label: "Posts Prepared", icon: "✅", color: "green" },
  captioning: { label: "Generating AI Captions", icon: "🤖", color: "blue" },
  complete: { label: "Campaign Ready!", icon: "🎉", color: "green" },
  error: { label: "Error", icon: "❌", color: "red" },
};

function formatDuration(ms) {
  if (ms == null) return "—";
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
  }

  return `${seconds}s`;
}

function SourceBadge({ sourceType }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80 backdrop-blur">
      {sourceType === "pinterest" ? <Pin size={12} /> : <Play size={12} />}
      {sourceType === "pinterest" ? "Pinterest" : "YouTube"}
    </span>
  );
}

function getPreviewVideoSrc(item) {
  const rawUrl = item?.downloadUrl || item?.videoUrl || item?.url || "";
  if (!rawUrl) return "";

  return resolveApiUrl(
    `/api/reels/preview-video?url=${encodeURIComponent(rawUrl)}`,
  );
}

function PinterestCard({ item, selected, onSelect }) {
  const title = item?.title || "Untitled Pin";
  const description = item?.description || "";

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={`group w-full overflow-hidden rounded-3xl border text-left transition-all ${
        selected
          ? "border-pink-400 bg-pink-50 shadow-lg shadow-pink-200/50"
          : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-pink-200 hover:shadow-xl"
      }`}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-slate-100">
        {item?.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-pink-100 via-rose-50 to-amber-50 text-pink-500">
            <Image size={40} />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent" />

        <div className="absolute left-3 top-3 flex items-center gap-2">
          <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-700">
            {item?.downloadUrl?.includes(".mp4") ? "MP4" : "HLS"}
          </span>
          {selected && (
            <span className="rounded-full bg-pink-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
              Selected
            </span>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
          <p className="line-clamp-2 text-sm font-semibold leading-tight">
            {title}
          </p>
          {description ? (
            <p className="mt-1 line-clamp-2 text-xs text-white/75">
              {description}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onSelect(item, { previewOnly: true });
          }}
          className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-slate-950/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur hover:bg-slate-950"
        >
          <Play size={11} />
          Preview
        </button>
      </div>

      <div className="space-y-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-slate-900">
            {item?.pinner?.fullName || item?.pinner?.username || "Pinterest"}
          </p>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
            {item?.domain || "pinterest"}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Clock3 size={12} />
            {formatDuration(item?.duration)}
          </span>
          <span className="flex items-center gap-1 font-semibold text-pink-600">
            <Play size={12} />
            Use this pin
          </span>
        </div>
      </div>
    </button>
  );
}

export default function CreateCampaignModal({ open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [socket, setSocket] = useState(null);
  const [sourceType, setSourceType] = useState("pinterest");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCount, setSearchCount] = useState(12);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [pinterestResults, setPinterestResults] = useState([]);
  const [selectedPinterests, setSelectedPinterests] = useState([]);
  const [previewItem, setPreviewItem] = useState(null);
  const { user } = useAuth();

  const [form, setForm] = useState({
    campaignTitle: "",
    sourceTitle: "",
    uploadGapMinutes: 60,
    captionTone: "Viral",
    hashtagCount: 5,
    autoDelete: true,
    autoStart: true,
  });

  const sourceTabs = useMemo(
    () => [{ id: "pinterest", label: "Pinterest", icon: Pin }],
    [],
  );

  useEffect(() => {
    if (open && user) {
      const newSocket = io();
      newSocket.emit("join:user", { userId: user._id });
      newSocket.on("reel:progress", (data) => {
        setProgress(data);
      });
      setSocket(newSocket);

      return () => newSocket.close();
    }

    return undefined;
  }, [open, user]);

  useEffect(() => {
    if (!open) {
      setLoading(false);
      setProgress(null);
      setSearchLoading(false);
      setSearchError(null);
      setPinterestResults([]);
      setSelectedPinterests([]);
      setPreviewItem(null);
      setSourceType("pinterest");
      setSearchQuery("");
    }
  }, [open]);

  useEffect(() => {
    if (sourceType === "pinterest") {
      setSearchError(null);
    }
  }, [sourceType]);

  if (!open) return null;

  const update = (key, value) =>
    setForm((current) => ({
      ...current,
      [key]: typeof value === "function" ? value(current[key]) : value,
    }));

  const currentSourceTitle =
    selectedPinterests.length > 0
      ? `${selectedPinterests.length} Pinterest post${selectedPinterests.length > 1 ? "s" : ""} selected`
      : form.sourceTitle || form.campaignTitle;

  async function handleSearchPinterest(event) {
    event?.preventDefault?.();

    if (!searchQuery.trim()) {
      setSearchError("Enter a keyword to search Pinterest.");
      return;
    }

    setSearchLoading(true);
    setSearchError(null);

    try {
      const response = await searchPinterestVideos(searchQuery, searchCount);
      setPinterestResults(response?.data || []);
      if (!response?.data?.length) {
        setSearchError("No Pinterest videos found for this keyword.");
      }
    } catch (error) {
      setSearchError(error?.message || "Pinterest search failed.");
      setPinterestResults([]);
    } finally {
      setSearchLoading(false);
    }
  }

  function handleSelectPinterest(item) {
    setPreviewItem(item);

    setSelectedPinterests((current) => {
      const isSelected = current.some(
        (p) => (p.id || p.nodeId) === (item.id || item.nodeId),
      );
      if (isSelected) {
        return current.filter(
          (p) => (p.id || p.nodeId) !== (item.id || item.nodeId),
        );
      }
      return [...current, item];
    });

    if (!form.campaignTitle) {
      setForm((current) => ({
        ...current,
        campaignTitle: `Pinterest Video Campaign`,
      }));
    }
  }

  function handlePreviewPinterest(item) {
    setPreviewItem(item);
  }

  async function handleCreate() {
    if (sourceType === "pinterest" && selectedPinterests.length === 0) {
      setSearchError(
        "Select at least one Pinterest pin before creating the campaign.",
      );
      return;
    }

    setLoading(true);
    setProgress({ stage: "created", message: "Starting campaign creation..." });

    try {
      const payload = {
        ...form,
        sourceType,
        sourceTitle:
          form.sourceTitle || `${selectedPinterests.length} Pinterest posts`,
        posts: selectedPinterests,
      };

      const result = await createReelCampaign(payload);
      if (result?.success === false) {
        throw new Error(result.error || "Failed to create campaign");
      }

      setTimeout(() => {
        onClose();
        setLoading(false);
        setProgress(null);
      }, 2000);
    } catch (error) {
      setProgress({
        stage: "error",
        message: error?.message || "Failed to create campaign",
      });
      setLoading(false);
    }
  }

  const progressPercent = (() => {
    if (!progress) return 0;
    if (progress.stage === "preparing") return 20;
    if (progress.stage === "prepared") return 40;
    if (progress.stage === "captioning") {
      return Math.min(
        90,
        40 + ((progress.current || 0) / (progress.total || 1)) * 50,
      );
    }
    if (progress.stage === "complete") return 100;
    return 0;
  })();

  const stageMeta = STAGES[progress?.stage] || {
    label: "Loading",
    icon: "⏳",
    color: "gray",
  };

  if (loading && progress) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white p-8 shadow-2xl">
          <div className="text-center">
            <div className="mb-4 text-6xl animate-bounce">{stageMeta.icon}</div>
            <h3 className="mb-2 text-xl font-bold text-slate-900">
              {stageMeta.label}
            </h3>
            <p className="mb-6 text-sm text-slate-500">
              {progress.message || "Creating your reels..."}
            </p>

            {progress.current && progress.total ? (
              <div className="mb-6 text-sm font-semibold text-slate-700">
                Progress: {progress.current} / {progress.total}
              </div>
            ) : null}

            <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-xs text-slate-400">
              {Math.round(progressPercent)}%
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 px-3 py-3 backdrop-blur-sm sm:px-4 sm:py-4">
      <div className="mx-auto grid h-full w-full max-w-7xl overflow-hidden rounded-[2rem] border border-white/10 bg-white shadow-2xl lg:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-b border-slate-200 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white lg:border-b-0 lg:border-r">
          <div className="border-b border-white/10 p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/30">
                <Sparkles size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/50">
                  Source Studio
                </p>
                <h3 className="text-xl font-bold">Choose a video source</h3>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white/5 p-1">
              {sourceTabs.map((tab) => {
                const Icon = tab.icon;
                const active = sourceType === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSourceType(tab.id)}
                    className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition-all ${
                      active
                        ? "bg-white text-slate-950 shadow-lg"
                        : "text-white/70 hover:bg-white/8 hover:text-white"
                    }`}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {sourceType === "pinterest" && (
              <div className="space-y-4">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="mb-3 text-sm font-semibold text-white">
                    Pinterest search
                  </p>
                  <form onSubmit={handleSearchPinterest} className="space-y-3">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/40">
                        Search keyword
                      </label>
                      <input
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        className="w-full bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
                        placeholder="karan aujla song, fashion reel, luxury b-roll..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="rounded-2xl border border-white/10 bg-black/20 p-3">
                        <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-white/40">
                          Results
                        </span>
                        <select
                          value={searchCount}
                          onChange={(event) =>
                            setSearchCount(parseInt(event.target.value, 10))
                          }
                          className="w-full bg-transparent text-sm text-white focus:outline-none"
                        >
                          {[5, 8, 12, 16, 20].map((value) => (
                            <option
                              key={value}
                              value={value}
                              className="text-slate-900"
                            >
                              {value}
                            </option>
                          ))}
                        </select>
                      </label>

                      <button
                        type="submit"
                        disabled={searchLoading}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-pink-500/30 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {searchLoading ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Search size={16} />
                        )}
                        Search
                      </button>
                    </div>
                  </form>

                  {searchError ? (
                    <p className="mt-3 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-100">
                      {searchError}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="mb-2 text-sm font-semibold text-white">
                    How it works
                  </p>
                  <ol className="space-y-2 text-sm text-white/65">
                    <li className="flex gap-2">
                      <span>1.</span>
                      <span>Search a Pinterest keyword.</span>
                    </li>
                    <li className="flex gap-2">
                      <span>2.</span>
                      <span>Select multiple pins from the results.</span>
                    </li>
                    <li className="flex gap-2">
                      <span>3.</span>
                      <span>
                        Create the campaign and upload videos directly using
                        remote MP4 URLs.
                      </span>
                    </li>
                  </ol>
                </div>

                {selectedPinterests.length > 0 ? (
                  <div className="rounded-3xl border border-pink-400/30 bg-pink-500/10 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="font-semibold text-white">
                        {selectedPinterests.length} pin
                        {selectedPinterests.length > 1 ? "s" : ""} selected
                      </p>
                      <button
                        type="button"
                        onClick={() => setSelectedPinterests([])}
                        className="text-xs font-semibold text-white/60 hover:text-white"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {selectedPinterests.map((item) => (
                        <div
                          key={item.id || item.nodeId}
                          className="relative overflow-hidden rounded-2xl border border-white/20 bg-black/20"
                        >
                          {item.thumbnail ? (
                            <img
                              src={item.thumbnail}
                              alt={item.title}
                              className="aspect-square w-full object-cover"
                            />
                          ) : (
                            <div className="aspect-square w-full bg-white/5 flex items-center justify-center text-white/30">
                              <Image size={16} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-pink-600">
                      <CheckCircle2 size={12} />
                      Ready to upload
                    </div>
                  </div>
                ) : null}

                <div className="min-h-0 space-y-3">
                  {searchLoading ? (
                    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/65">
                      <Loader2
                        className="mx-auto mb-3 animate-spin text-pink-400"
                        size={22}
                      />
                      Searching Pinterest...
                    </div>
                  ) : null}

                  {!searchLoading && pinterestResults.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                      {pinterestResults.map((item) => (
                        <PinterestCard
                          key={item.id || item.nodeId || item.downloadUrl}
                          item={item}
                          selected={selectedPinterests.some(
                            (p) =>
                              (p.id || p.nodeId) === (item.id || item.nodeId),
                          )}
                          onSelect={(selectedItem, options = {}) => {
                            if (options.previewOnly) {
                              handlePreviewPinterest(selectedItem);
                              return;
                            }

                            handleSelectPinterest(selectedItem);
                          }}
                        />
                      ))}
                    </div>
                  ) : null}

                  {!searchLoading &&
                  pinterestResults.length === 0 &&
                  !searchError ? (
                    <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 p-6 text-center text-sm text-white/55">
                      <Pin className="mx-auto mb-3 text-pink-300" size={24} />
                      Search results will appear here.
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </aside>

        <main className="flex min-h-0 flex-col bg-slate-50">
          <div className="border-b border-slate-200 bg-white px-6 py-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <SourceBadge sourceType={sourceType} />
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Auto split, caption, and upload
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-slate-900">
                  Create Reel Campaign
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Select a source on the left, then tune the campaign settings
                  here.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <ArrowRight size={14} className="text-pink-500" />
                  {currentSourceTitle || "No source selected yet"}
                </div>
                <p className="mt-1 max-w-[320px] truncate text-xs text-slate-500">
                  {selectedPinterests.length > 0
                    ? `${selectedPinterests.length} video${selectedPinterests.length > 1 ? "s" : ""} ready to upload`
                    : "Pick videos from the left panel to generate the campaign."}
                </p>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="md:col-span-2">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Campaign Title
                </div>
                <input
                  value={form.campaignTitle}
                  onChange={(event) =>
                    update("campaignTitle", event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-pink-400 focus:outline-none"
                  placeholder="My luxury reel campaign"
                />
              </label>

              <label>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Source Title
                </div>
                <input
                  value={form.sourceTitle}
                  onChange={(event) =>
                    update("sourceTitle", event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-pink-400 focus:outline-none"
                  placeholder="Video title or Pinterest pin title"
                />
              </label>

              <label>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Upload Gap
                </div>
                <select
                  value={form.uploadGapMinutes}
                  onChange={(event) =>
                    update("uploadGapMinutes", parseInt(event.target.value, 10))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-pink-400 focus:outline-none"
                >
                  {GAP_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {value} minutes
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Caption Tone
                </div>
                <select
                  value={form.captionTone}
                  onChange={(event) =>
                    update("captionTone", event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-pink-400 focus:outline-none"
                >
                  {TONES.map((tone) => (
                    <option key={tone} value={tone}>
                      {tone}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Hashtag Count
                </div>
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={form.hashtagCount}
                  onChange={(event) =>
                    update("hashtagCount", parseInt(event.target.value, 10))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-pink-400 focus:outline-none"
                />
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 md:col-span-2">
                <input
                  type="checkbox"
                  checked={form.autoDelete}
                  onChange={(event) =>
                    update("autoDelete", event.target.checked)
                  }
                  className="h-4 w-4 rounded border-slate-300 text-pink-600 focus:ring-pink-500"
                />
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Auto Delete Files
                  </div>
                  <div className="text-xs text-slate-500">
                    Delete temporary files after upload
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 md:col-span-2">
                <input
                  type="checkbox"
                  checked={form.autoStart}
                  onChange={(event) =>
                    update("autoStart", event.target.checked)
                  }
                  className="h-4 w-4 rounded border-slate-300 text-pink-600 focus:ring-pink-500"
                />
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Auto Start Campaign
                  </div>
                  <div className="text-xs text-slate-500">
                    Begin uploads automatically after processing
                  </div>
                </div>
              </label>
            </div>

            <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Preview
                  </p>
                  <p className="text-xs text-slate-500">
                    Selected Pinterest posts will be uploaded directly with AI
                    captions.
                  </p>
                </div>
                <span className="rounded-full bg-pink-50 px-3 py-1 text-xs font-semibold text-pink-600">
                  Pinterest → Direct Upload
                </span>
              </div>
              <div className="flex flex-col gap-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 sm:flex-row sm:items-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm">
                  <Pin className="text-pink-500" size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">
                    {currentSourceTitle || "No source selected"}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {selectedPinterests.length} post
                    {selectedPinterests.length !== 1 ? "s" : ""} ready
                  </p>
                </div>
              </div>

              {previewItem ? (
                <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-slate-950">
                  <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-white">
                    <div>
                      <p className="text-sm font-semibold">Live Preview</p>
                      <p className="text-xs text-white/60">
                        Play the selected video before creating the campaign.
                      </p>
                    </div>
                    <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/70">
                      {previewItem.downloadUrl ? "MP4" : "Video"}
                    </span>
                  </div>

                  <video
                    key={
                      previewItem.downloadUrl ||
                      previewItem.videoUrl ||
                      previewItem.thumbnail
                    }
                    src={getPreviewVideoSrc(previewItem)}
                    poster={previewItem.thumbnail || undefined}
                    controls
                    playsInline
                    className="aspect-video w-full bg-black object-contain"
                  />

                  <div className="space-y-1 px-4 py-3 text-white">
                    <p className="line-clamp-2 text-sm font-semibold">
                      {previewItem.title || "Selected video"}
                    </p>
                    <p className="text-xs text-white/60">
                      {previewItem.pinner?.fullName ||
                        previewItem.pinner?.username ||
                        "Pinterest source"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  Select a pin, then press Preview to watch it here.
                </div>
              )}
            </div>
          </div>

          {searchError ? (
            <div className="mx-6 mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {searchError}
            </div>
          ) : null}

          <div className="border-t border-slate-200 bg-white px-6 py-4">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                onClick={onClose}
                disabled={loading}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={
                  loading ||
                  (sourceType === "pinterest" &&
                    selectedPinterests.length === 0)
                }
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-pink-500/30 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Create Campaign
                  </>
                )}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
