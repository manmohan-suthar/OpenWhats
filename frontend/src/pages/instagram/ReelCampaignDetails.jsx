import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getReelCampaign } from "../../services/reelsApi";
import { retryReel, deleteReel } from "../../services/reelsApi";
import socket from "../../services/socket";
import { resolveApiUrl } from "../../config/env";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Play,
  ArrowLeft,
  Trash2,
  RotateCcw,
} from "lucide-react";

function ReelCard({ reel, onRetry, onDelete }) {
  const [showPreview, setShowPreview] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState("");

  // Update countdown timer
  useEffect(() => {
    if (reel.status !== "pending" || !reel.scheduledFor) {
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const scheduled = new Date(reel.scheduledFor);
      const diff = scheduled - now;

      if (diff <= 0) {
        setTimeRemaining("Now");
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        if (hours > 0) {
          setTimeRemaining(`${hours}h ${minutes}m`);
        } else if (minutes > 0) {
          setTimeRemaining(`${minutes}m ${seconds}s`);
        } else {
          setTimeRemaining(`${seconds}s`);
        }
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [reel.status, reel.scheduledFor]);

  const statusColor = {
    pending: "bg-slate-100 text-slate-700",
    processing: "bg-blue-100 text-blue-700",
    uploading: "bg-purple-100 text-purple-700",
    uploaded: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
  };

  const statusIcon = {
    pending: Clock,
    processing: Clock,
    uploading: Clock,
    uploaded: CheckCircle,
    failed: AlertCircle,
  };

  const StatusIcon = statusIcon[reel.status] || Clock;

  // Parse caption - first check new captionData structure, then fallback to parsing caption string
  let captionData = null;

  // New structure: captionData object
  if (reel.captionData) {
    captionData = reel.captionData;
  }
  // Old structure: caption as JSON string
  else if (reel.caption) {
    try {
      if (typeof reel.caption === "string" && reel.caption.startsWith("{")) {
        captionData = JSON.parse(reel.caption);
      } else {
        captionData = { caption: reel.caption };
      }
    } catch {
      captionData = { caption: reel.caption };
    }
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h3 className="text-base font-bold text-slate-900">
            Part {reel.index}
          </h3>
          <div className="text-xs text-slate-500 mt-1 space-y-0.5">
            <p>{new Date(reel.scheduledFor).toLocaleDateString()}</p>
            {reel.status === "pending" && timeRemaining && (
              <p className="text-orange-600 font-semibold">
                📅 Upload in: {timeRemaining}
              </p>
            )}
            {reel.status === "uploading" && (
              <p className="text-purple-600 font-semibold animate-pulse">
                ⏳ Uploading...
              </p>
            )}
            {reel.instagramPermalink && (
              <a
                href={reel.instagramPermalink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-pink-600 hover:text-pink-700 underline block"
              >
                📸 View on Instagram
              </a>
            )}
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-2 ${statusColor[reel.status]}`}
        >
          <StatusIcon size={12} />
          {reel.status}
        </span>
      </div>

      {/* Video Preview */}
      {(reel.path || reel.videoUrl) && (
        <div className="mb-3 relative">
          <div className="aspect-video bg-slate-900 rounded-lg overflow-hidden relative group">
            <video
              src={
                reel.path
                  ? reel.path
                  : resolveApiUrl(
                      `/api/reels/preview-video?url=${encodeURIComponent(reel.videoUrl)}`,
                    )
              }
              className="w-full h-full object-cover"
              poster={reel.thumbnail}
              controls={false}
              muted
              playsInline
            />
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
              <button
                onClick={() => setShowPreview(true)}
                className="rounded-full bg-white/90 p-2 hover:bg-white"
              >
                <Play size={20} className="text-slate-900 fill-slate-900" />
              </button>
            </div>
          </div>

          {/* Fullscreen Preview Modal */}
          {showPreview && (
            <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-2xl">
                <video
                  src={
                    reel.path
                      ? reel.path
                      : resolveApiUrl(
                          `/api/reels/preview-video?url=${encodeURIComponent(reel.videoUrl)}`,
                        )
                  }
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-auto rounded-lg bg-black"
                />
                <button
                  onClick={() => setShowPreview(false)}
                  className="mt-3 w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Title from Caption */}
      {captionData?.title && (
        <div className="mb-2">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
            Title
          </p>
          <p className="text-sm font-bold text-slate-800 line-clamp-2">
            {captionData.title}
          </p>
        </div>
      )}

      {/* Hook */}
      {captionData?.hook && (
        <div className="mb-2">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
            Hook
          </p>
          <p className="text-xs text-slate-700 line-clamp-2">
            {captionData.hook}
          </p>
        </div>
      )}

      {/* Caption */}
      {captionData?.caption && (
        <div className="mb-2">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
            Caption
          </p>
          <p className="text-xs text-slate-700 line-clamp-3">
            {captionData.caption}
          </p>
        </div>
      )}

      {/* CTA */}
      {captionData?.cta && (
        <div className="mb-2">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
            CTA
          </p>
          <p className="text-xs text-slate-700 font-medium">
            {captionData.cta}
          </p>
        </div>
      )}

      {/* Hashtags */}
      {(captionData?.hashtags || reel.hashtags) &&
        (captionData?.hashtags || reel.hashtags)?.length > 0 && (
          <div className="mb-2">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
              Hashtags
            </p>
            <div className="flex flex-wrap gap-1">
              {(captionData?.hashtags || reel.hashtags).map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 bg-gradient-to-r from-pink-100 to-purple-100 text-purple-700 text-xs rounded-full"
                >
                  {tag.startsWith("#") ? tag : `#${tag}`}
                </span>
              ))}
            </div>
          </div>
        )}

      {/* Error */}
      {reel.error && (
        <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          {reel.error}
        </div>
      )}

      {/* Instagram Link */}
      {reel.instagramPermalink && (
        <div className="mb-3 pb-3 border-t border-slate-200 pt-3">
          <a
            href={reel.instagramPermalink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-pink-600 hover:text-pink-700 font-semibold"
          >
            View on Instagram →
          </a>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-auto pt-3 border-t border-slate-200">
        {reel.status === "failed" && (
          <button
            onClick={() => onRetry(reel._id)}
            className="flex-1 px-2 py-1.5 rounded-lg bg-amber-100 text-amber-700 text-xs font-semibold hover:bg-amber-200 transition flex items-center justify-center gap-1"
          >
            <RotateCcw size={12} /> Retry
          </button>
        )}
        <button
          onClick={() => onDelete(reel._id)}
          className="flex-1 px-2 py-1.5 rounded-lg border border-red-300 text-red-600 text-xs font-semibold hover:bg-red-50 transition flex items-center justify-center gap-1"
        >
          <Trash2 size={12} /> Delete
        </button>
      </div>
    </div>
  );
}

export default function ReelCampaignDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Refresh every 5s

    // Connect socket if not already connected
    if (!socket.socket?.connected) {
      socket.connect();
    }

    // Subscribe to socket events for real-time upload updates
    socket.on("reel:uploading", (event) => {
      if (event.campaignId === id) {
        console.log("🔄 Reel uploading:", event);
        fetchData();
      }
    });

    socket.on("reel:uploaded", (event) => {
      if (event.campaignId === id) {
        console.log("✅ Reel uploaded:", event);
        fetchData();
      }
    });

    socket.on("reel:upload-failed", (event) => {
      if (event.campaignId === id) {
        console.log("❌ Reel upload failed:", event);
        fetchData();
      }
    });

    return () => {
      clearInterval(interval);
      socket.off("reel:uploading");
      socket.off("reel:uploaded");
      socket.off("reel:upload-failed");
    };
  }, [id]);

  async function fetchData() {
    try {
      const res = await getReelCampaign(id);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRetry(reelId) {
    try {
      await retryReel(reelId);
      await fetchData();
    } catch (err) {
      alert("Retry failed: " + err.message);
    }
  }

  async function handleDelete(reelId) {
    if (!window.confirm("Delete this reel?")) return;
    try {
      await deleteReel(reelId);
      await fetchData();
    } catch (err) {
      alert("Delete failed: " + err.message);
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-300 border-t-pink-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-600">Loading campaign...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center">
        <AlertCircle size={48} className="mx-auto text-red-500 mb-3" />
        <p className="text-slate-700 font-semibold mb-3">Campaign not found</p>
        <button
          onClick={() => navigate("/instagram/reels")}
          className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
        >
          Back to Campaigns
        </button>
      </div>
    );
  }

  const { campaign, reels } = data;
  const uploadPercent =
    campaign.totalReels > 0
      ? Math.round((campaign.uploadedReels / campaign.totalReels) * 100)
      : 0;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => navigate("/instagram/reels")}
              className="p-2 rounded-lg hover:bg-slate-100 transition"
            >
              <ArrowLeft size={20} className="text-slate-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                {campaign.campaignTitle}
              </h1>
              <p className="text-slate-600 text-sm mt-1">
                {campaign.sourceTitle || campaign.youtubeTitle}
              </p>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="w-48">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-700 font-semibold">Progress</p>
            <p className="text-sm font-bold text-slate-900">
              {campaign.uploadedReels}/{campaign.totalReels}
            </p>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-pink-500 to-purple-600 h-3 rounded-full transition-all"
              style={{ width: `${uploadPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 bg-white rounded-lg border border-slate-200">
          <p className="text-xs text-slate-600 uppercase font-semibold mb-1">
            Total Reels
          </p>
          <p className="text-2xl font-bold text-slate-900">
            {campaign.totalReels}
          </p>
        </div>
        <div className="p-4 bg-white rounded-lg border border-slate-200">
          <p className="text-xs text-slate-600 uppercase font-semibold mb-1">
            Uploaded
          </p>
          <p className="text-2xl font-bold text-green-600">
            {campaign.uploadedReels}
          </p>
        </div>
        <div className="p-4 bg-white rounded-lg border border-slate-200">
          <p className="text-xs text-slate-600 uppercase font-semibold mb-1">
            Failed
          </p>
          <p className="text-2xl font-bold text-red-600">
            {campaign.failedReels}
          </p>
        </div>
        <div className="p-4 bg-white rounded-lg border border-slate-200">
          <p className="text-xs text-slate-600 uppercase font-semibold mb-1">
            Progress
          </p>
          <p className="text-2xl font-bold text-pink-600">{uploadPercent}%</p>
        </div>
      </div>

      {/* Reels Grid */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">
          Parts ({reels.length})
        </h2>
        {reels.length === 0 ? (
          <div className="p-8 bg-slate-50 rounded-lg text-center border border-dashed border-slate-300">
            <Clock size={32} className="mx-auto text-slate-400 mb-2" />
            <p className="text-slate-600">No reels created yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reels.map((reel) => (
              <ReelCard
                key={reel._id}
                reel={reel}
                onRetry={handleRetry}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
