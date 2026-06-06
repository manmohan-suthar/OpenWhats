import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Clock3,
  Film,
  Image,
  Link2,
  Loader2,
  Play,
  Sparkles,
  Upload,
  WandSparkles,
  X,
} from "lucide-react";
import { createReelCampaign } from "../../services/reelsApi";
import { resolvePinterestUrls } from "../../services/pinterestApi";

function parsePinterestUrls(text) {
  return Array.from(
    new Set(
      String(text || "")
        .split(/[\n,;\s]+/)
        .map((item) => item.trim())
        .filter((item) => /pinterest\.com|pinimg\.com/i.test(item)),
    ),
  );
}

function formatDuration(ms) {
  if (!ms) return "—";
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0
    ? `${minutes}m ${seconds.toString().padStart(2, "0")}s`
    : `${seconds}s`;
}

export default function ReelCampaignsV1() {
  const navigate = useNavigate();
  const [urlText, setUrlText] = useState("");
  const [resolvedItems, setResolvedItems] = useState([]);
  const [selectedUrls, setSelectedUrls] = useState([]);
  const [loadingResolve, setLoadingResolve] = useState(false);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    campaignTitle: "",
    sourceTitle: "",
    captionTone: "Viral",
    hashtagCount: 5,
    uploadGapMinutes: 60,
    autoStart: true,
    autoDelete: true,
  });

  const resolvedCount = resolvedItems.length;
  const selectedCount = selectedUrls.length;

  const selectedItems = useMemo(
    () =>
      resolvedItems.filter((item) =>
        selectedUrls.includes(item.sourceUrl || item.url || item.downloadUrl),
      ),
    [resolvedItems, selectedUrls],
  );

  const allSelected =
    resolvedItems.length > 0 && selectedItems.length === resolvedItems.length;

  const updateField = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const toggleSelected = (item) => {
    const key = item.sourceUrl || item.url || item.downloadUrl;
    if (!key) return;

    setSelectedUrls((current) =>
      current.includes(key)
        ? current.filter((url) => url !== key)
        : [...current, key],
    );
  };

  const handleResolve = async () => {
    const urls = parsePinterestUrls(urlText);

    if (!urls.length) {
      setError("Paste one or more Pinterest video URLs first.");
      setSuccess("");
      return;
    }

    setLoadingResolve(true);
    setError("");
    setSuccess("");

    try {
      const response = await resolvePinterestUrls(urls);
      const items = response?.data || [];
      setResolvedItems(items);
      setSelectedUrls(
        items
          .filter((item) => item?.success !== false && item?.downloadUrl)
          .map((item) => item.sourceUrl || item.url || item.downloadUrl),
      );
      setSuccess(
        `Resolved ${items.filter((item) => item?.success !== false).length} Pinterest video${items.length === 1 ? "" : "s"}.`,
      );
    } catch (resolveError) {
      setError(resolveError?.message || "Pinterest resolution failed.");
      setResolvedItems([]);
      setSelectedUrls([]);
    } finally {
      setLoadingResolve(false);
    }
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedUrls([]);
      return;
    }

    setSelectedUrls(
      resolvedItems
        .filter((item) => item?.success !== false)
        .map((item) => item.sourceUrl || item.url || item.downloadUrl),
    );
  };

  const handleCreate = async () => {
    if (!form.campaignTitle.trim()) {
      setError("Campaign name is required.");
      setSuccess("");
      return;
    }

    if (!selectedItems.length) {
      setError("Select at least one resolved Pinterest video.");
      setSuccess("");
      return;
    }

    setLoadingCreate(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        sourceType: "pinterest",
        campaignTitle: form.campaignTitle.trim(),
        sourceTitle: form.sourceTitle.trim(),
        captionTone: form.captionTone,
        hashtagCount: Number(form.hashtagCount) || 5,
        uploadGapMinutes: Number(form.uploadGapMinutes) || 60,
        autoStart: !!form.autoStart,
        autoDelete: !!form.autoDelete,
        posts: selectedItems.map((item) => ({
          ...item,
          url:
            item.downloadUrl || item.videoUrl || item.url || item.mp4 || null,
          mp4:
            item.downloadUrl || item.videoUrl || item.url || item.mp4 || null,
          downloadUrl:
            item.downloadUrl || item.videoUrl || item.url || item.mp4 || null,
        })),
      };

      const response = await createReelCampaign(payload);
      if (response?.success === false) {
        throw new Error(response?.error || "Failed to create campaign");
      }

      setSuccess("Reel campaign created successfully.");
      navigate(`/instagram/reels/${response?.campaign?._id}`);
    } catch (createError) {
      setError(createError?.message || "Failed to create campaign.");
    } finally {
      setLoadingCreate(false);
    }
  };

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="rounded-3xl border border-pink-100 bg-gradient-to-br from-slate-950 via-slate-900 to-pink-950 p-6 text-white shadow-2xl shadow-pink-950/20">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-pink-100">
              <Sparkles size={14} /> Reel Campaigns v1
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Paste Pinterest videos, resolve MP4 URLs, and publish a campaign.
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
              Use the Pinterest downloader API to convert one or more Pinterest
              video links into direct MP4 URLs, then create a reel campaign with
              AI caption settings and auto upload.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center text-xs sm:text-sm">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
              <p className="text-white/60">URLs</p>
              <p className="mt-1 text-2xl font-bold text-white">
                {parsePinterestUrls(urlText).length}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
              <p className="text-white/60">Resolved</p>
              <p className="mt-1 text-2xl font-bold text-white">
                {resolvedCount}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
              <p className="text-white/60">Selected</p>
              <p className="mt-1 text-2xl font-bold text-white">
                {selectedCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      {(error || success) && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}
        >
          {error || success}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Link2 className="text-pink-500" size={18} />
              <h2 className="text-lg font-semibold text-slate-900">
                Pinterest URLs
              </h2>
            </div>

            <label className="mb-2 block text-sm font-medium text-slate-700">
              Paste one or more Pinterest video links
            </label>
            <textarea
              value={urlText}
              onChange={(event) => setUrlText(event.target.value)}
              rows={8}
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-pink-400 focus:bg-white"
              placeholder={
                "https://www.pinterest.com/pin/...\nhttps://www.pinterest.com/pin/..."
              }
            />

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleResolve}
                disabled={loadingResolve}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-pink-500/20 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingResolve ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <WandSparkles size={16} />
                )}
                Resolve MP4 URLs
              </button>

              <button
                type="button"
                onClick={() => {
                  setUrlText("");
                  setResolvedItems([]);
                  setSelectedUrls([]);
                  setError("");
                  setSuccess("");
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <X size={16} />
                Clear
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Film className="text-pink-500" size={18} />
                  <h2 className="text-lg font-semibold text-slate-900">
                    Resolved Videos
                  </h2>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Select the Pinterest videos you want to publish in this
                  campaign.
                </p>
              </div>

              <button
                type="button"
                onClick={toggleAll}
                className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                disabled={!resolvedItems.length}
              >
                {allSelected ? "Clear selection" : "Select all"}
              </button>
            </div>

            {resolvedItems.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
                <Film size={42} className="mx-auto text-slate-300" />
                <p className="mt-3 font-semibold text-slate-700">
                  No videos resolved yet
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Paste Pinterest links above and resolve them to get MP4 URLs.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {resolvedItems.map((item, index) => {
                  const key =
                    item.sourceUrl ||
                    item.url ||
                    item.downloadUrl ||
                    String(index);
                  const isSelected = selectedUrls.includes(key);

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleSelected(item)}
                      className={`group relative overflow-hidden rounded-3xl border text-left transition-all ${isSelected ? "border-pink-400 bg-pink-50 shadow-lg shadow-pink-200/60" : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-pink-200 hover:shadow-xl"}`}
                    >
                      <div className="relative aspect-[9/16] bg-slate-100">
                        {item.thumbnail ? (
                          <img
                            src={item.thumbnail}
                            alt={item.title || "Pinterest video"}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-pink-100 via-rose-50 to-amber-50 text-pink-500">
                            <Image size={44} />
                          </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

                        <div className="absolute left-3 top-3 flex items-center gap-2">
                          <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                            {item.type || "video"}
                          </span>
                          <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                            {item.pinType || "data"}
                          </span>
                        </div>

                        <div className="absolute right-3 top-3 flex items-center gap-2 rounded-full bg-slate-950/70 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
                          {isSelected ? (
                            <CheckCircle2
                              size={14}
                              className="text-green-300"
                            />
                          ) : (
                            <Play size={14} />
                          )}
                          {isSelected ? "Selected" : "Tap to add"}
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                          <p className="line-clamp-2 text-sm font-semibold leading-tight">
                            {item.title || "Untitled video"}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs text-white/75">
                            {item.message ||
                              item.sourceUrl ||
                              "Pinterest MP4 resolved"}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {item.success === false
                              ? "Resolution failed"
                              : "Ready for campaign"}
                          </p>
                          <span
                            className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${item.success === false ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}
                          >
                            {item.success === false ? "Error" : "MP4"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock3 size={12} />
                            {formatDuration(item.duration)}
                          </span>
                          <span className="truncate text-slate-400">
                            {item.width && item.height
                              ? `${item.width} × ${item.height}`
                              : item.sourceUrl}
                          </span>
                        </div>

                        <div className="flex gap-2 pt-1">
                          <a
                            href={
                              item.downloadUrl ||
                              item.videoUrl ||
                              item.url ||
                              item.sourceUrl
                            }
                            target="_blank"
                            rel="noreferrer"
                            onClick={(event) => event.stopPropagation()}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            <Play size={12} />
                            Preview
                          </a>
                          <span
                            className={`inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold ${isSelected ? "bg-pink-600 text-white" : "bg-slate-100 text-slate-600"}`}
                          >
                            {isSelected ? "Selected" : "Add"}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Upload className="text-pink-500" size={18} />
              <h2 className="text-lg font-semibold text-slate-900">
                Campaign Settings
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Campaign name
                </label>
                <input
                  value={form.campaignTitle}
                  onChange={(event) =>
                    updateField("campaignTitle", event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pink-400 focus:bg-white"
                  placeholder="Pinterest Reel Campaign"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  AI bio / source context
                </label>
                <textarea
                  value={form.sourceTitle}
                  onChange={(event) =>
                    updateField("sourceTitle", event.target.value)
                  }
                  rows={4}
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pink-400 focus:bg-white"
                  placeholder="Add a short AI bio or content direction for caption generation"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Caption tone
                  </label>
                  <select
                    value={form.captionTone}
                    onChange={(event) =>
                      updateField("captionTone", event.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pink-400 focus:bg-white"
                  >
                    <option>Viral</option>
                    <option>Professional</option>
                    <option>Motivational</option>
                    <option>Funny</option>
                    <option>Educational</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Hashtags
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={form.hashtagCount}
                    onChange={(event) =>
                      updateField("hashtagCount", event.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pink-400 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Upload gap (minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.uploadGapMinutes}
                    onChange={(event) =>
                      updateField("uploadGapMinutes", event.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pink-400 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Auto upload
                  </label>
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.autoStart}
                      onChange={(event) =>
                        updateField("autoStart", event.target.checked)
                      }
                    />
                    Start uploading automatically
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.autoDelete}
                  onChange={(event) =>
                    updateField("autoDelete", event.target.checked)
                  }
                />
                Delete source clips after upload
              </label>
            </div>

            <button
              type="button"
              onClick={handleCreate}
              disabled={loadingCreate || !selectedItems.length}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-pink-500/20 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingCreate ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              Create Reel Campaign
            </button>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <CheckCircle2 className="text-green-500" size={18} />
              <h2 className="text-lg font-semibold text-slate-900">
                Campaign Summary
              </h2>
            </div>

            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <span>Resolved videos</span>
                <span className="font-semibold text-slate-900">
                  {resolvedCount}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <span>Selected videos</span>
                <span className="font-semibold text-slate-900">
                  {selectedCount}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <span>Campaign title</span>
                <span className="max-w-[180px] truncate font-semibold text-slate-900">
                  {form.campaignTitle || "—"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <span>Caption tone</span>
                <span className="font-semibold text-slate-900">
                  {form.captionTone}
                </span>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
