import { useEffect, useState } from "react";
import {
  Film,
  Plus,
  Trash2,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Pause,
  Play,
} from "lucide-react";
import CreateCampaignModal from "../../components/instagram/CreateCampaignModal";
import {
  deleteReelCampaign,
  listReelCampaigns,
  pauseReelCampaign,
  resumeReelCampaign,
} from "../../services/reelsApi";
import { Link } from "react-router-dom";

export default function ReelCampaigns() {
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [pausingId, setPausingId] = useState(null);
  const [resumingId, setResumingId] = useState(null);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  async function fetchCampaigns() {
    setLoading(true);
    try {
      const res = await listReelCampaigns();
      setCampaigns(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteCampaign(campaign) {
    if (
      !window.confirm(
        `Delete campaign "${campaign.campaignTitle}" and all its reels? This cannot be undone.`,
      )
    ) {
      return;
    }

    setDeletingId(campaign._id);
    try {
      const res = await deleteReelCampaign(campaign._id);
      if (res?.success === false) {
        throw new Error(res.error || "Failed to delete campaign");
      }
      await fetchCampaigns();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to delete campaign");
    } finally {
      setDeletingId(null);
    }
  }

  async function handlePauseCampaign(e, campaign) {
    e.preventDefault();
    e.stopPropagation();

    setPausingId(campaign._id);
    try {
      const res = await pauseReelCampaign(campaign._id);
      if (res?.success === false) {
        throw new Error(res.error || "Failed to pause campaign");
      }
      await fetchCampaigns();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to pause campaign");
    } finally {
      setPausingId(null);
    }
  }

  async function handleResumeCampaign(e, campaign) {
    e.preventDefault();
    e.stopPropagation();

    setResumingId(campaign._id);
    try {
      const res = await resumeReelCampaign(campaign._id);
      if (res?.success === false) {
        throw new Error(res.error || "Failed to resume campaign");
      }
      await fetchCampaigns();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to resume campaign");
    } finally {
      setResumingId(null);
    }
  }

  const progressPercent =
    campaigns.length > 0
      ? Math.round(
          (campaigns.reduce((sum, c) => sum + c.uploadedReels, 0) /
            campaigns.reduce((sum, c) => sum + c.totalReels, 0)) *
            100,
        )
      : 0;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
            <Film className="text-pink-500" /> Reel Campaigns
          </h1>
          <p className="text-slate-600">
            Automate Pinterest → Instagram reels. Transform selected pins into
            viral shorts.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all font-medium"
        >
          <Plus size={18} /> Create Campaign
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="p-4 bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total Campaigns</p>
              <p className="text-2xl font-bold text-slate-900">
                {campaigns.length}
              </p>
            </div>
            <Film className="text-pink-500 opacity-30" size={32} />
          </div>
        </div>

        <div className="p-4 bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total Reels Created</p>
              <p className="text-2xl font-bold text-slate-900">
                {campaigns.reduce((sum, c) => sum + c.totalReels, 0)}
              </p>
            </div>
            <TrendingUp className="text-blue-500 opacity-30" size={32} />
          </div>
        </div>

        <div className="p-4 bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Upload Progress</p>
              <p className="text-2xl font-bold text-slate-900">
                {progressPercent}%
              </p>
            </div>
            <CheckCircle2 className="text-green-500 opacity-30" size={32} />
          </div>
        </div>
      </div>

      {/* Campaigns Grid */}
      <div>
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-slate-300 border-t-pink-500 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-slate-600">Loading campaigns...</p>
            </div>
          </div>
        )}

        {!loading && campaigns.length === 0 && (
          <div className="p-12 bg-slate-50 rounded-lg text-center border-2 border-dashed border-slate-300">
            <Film size={48} className="mx-auto text-slate-400 mb-3" />
            <p className="text-lg font-semibold text-slate-700 mb-1">
              No campaigns yet
            </p>
            <p className="text-slate-600 mb-4">
              Create your first campaign to start turning long videos into
              engaging reels
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-pink-500 text-white hover:bg-pink-600 transition font-medium"
            >
              <Plus size={16} /> Create Campaign
            </button>
          </div>
        )}

        {!loading && campaigns.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.map((campaign) => {
              const uploadPercent =
                campaign.totalReels > 0
                  ? Math.round(
                      (campaign.uploadedReels / campaign.totalReels) * 100,
                    )
                  : 0;

              return (
                <Link
                  key={campaign._id}
                  to={`/instagram/reels/${campaign._id}`}
                  className="group relative p-4 bg-white rounded-lg shadow-sm border border-slate-200 hover:shadow-lg hover:border-pink-300 transition-all cursor-pointer overflow-hidden"
                >
                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDeleteCampaign(campaign);
                    }}
                    disabled={deletingId === campaign._id}
                    className="absolute right-3 top-3 p-2 rounded-lg bg-red-50 text-red-600 opacity-0 group-hover:opacity-100 transition hover:bg-red-100 disabled:opacity-60"
                    title="Delete campaign"
                  >
                    <Trash2 size={16} />
                  </button>

                  {/* Pause/Resume Button */}
                  {campaign.status === "running" && (
                    <button
                      type="button"
                      onClick={(e) => handlePauseCampaign(e, campaign)}
                      disabled={pausingId === campaign._id}
                      className="absolute right-14 top-3 p-2 rounded-lg bg-orange-50 text-orange-600 opacity-0 group-hover:opacity-100 transition hover:bg-orange-100 disabled:opacity-60"
                      title="Pause campaign"
                    >
                      <Pause size={16} />
                    </button>
                  )}

                  {campaign.status === "paused" && (
                    <button
                      type="button"
                      onClick={(e) => handleResumeCampaign(e, campaign)}
                      disabled={resumingId === campaign._id}
                      className="absolute right-14 top-3 p-2 rounded-lg bg-green-50 text-green-600 opacity-0 group-hover:opacity-100 transition hover:bg-green-100 disabled:opacity-60"
                      title="Resume campaign"
                    >
                      <Play size={16} />
                    </button>
                  )}

                  {/* Campaign Title */}
                  <h3 className="text-lg font-bold text-slate-900 mb-1 pr-10 line-clamp-2">
                    {campaign.campaignTitle}
                  </h3>

                  {/* Source Title */}
                  <p className="text-sm text-slate-600 mb-3 line-clamp-1">
                    {campaign.sourceTitle || campaign.youtubeTitle}
                  </p>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-slate-600">Progress</p>
                      <p className="text-xs font-semibold text-slate-700">
                        {campaign.uploadedReels}/{campaign.totalReels}
                      </p>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-pink-500 to-purple-600 h-2 rounded-full transition-all"
                        style={{ width: `${uploadPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                    <div className="p-2 bg-blue-50 rounded">
                      <p className="text-xs text-slate-600">Total</p>
                      <p className="font-bold text-slate-900">
                        {campaign.totalReels}
                      </p>
                    </div>
                    <div className="p-2 bg-green-50 rounded">
                      <p className="text-xs text-slate-600">Uploaded</p>
                      <p className="font-bold text-green-600">
                        {campaign.uploadedReels}
                      </p>
                    </div>
                    <div className="p-2 bg-red-50 rounded">
                      <p className="text-xs text-slate-600">Failed</p>
                      <p className="font-bold text-red-600">
                        {campaign.failedReels}
                      </p>
                    </div>
                  </div>

                  {/* Date & Status */}
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-200">
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {new Date(campaign.createdAt).toLocaleDateString()}
                    </span>
                    <span
                      className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        campaign.status === "processing"
                          ? "bg-blue-100 text-blue-700"
                          : campaign.status === "running"
                            ? "bg-green-100 text-green-700"
                            : campaign.status === "paused"
                              ? "bg-orange-100 text-orange-700"
                              : campaign.status === "completed"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {campaign.status === "processing" && <Clock size={12} />}
                      {campaign.status === "running" && (
                        <CheckCircle2 size={12} />
                      )}
                      {campaign.status === "paused" && <Pause size={12} />}
                      {campaign.status === "error" && <AlertCircle size={12} />}
                      <span className="capitalize">{campaign.status}</span>
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <CreateCampaignModal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          fetchCampaigns();
        }}
      />
    </div>
  );
}
