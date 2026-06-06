import { useState, useEffect, useCallback } from "react";
import {
  Star,
  Send,
  Loader2,
  Filter,
  Search,
  MessageCircle,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import { authFetch } from "../../services/authFetch";

function RatingBadge({ rating }) {
  const colors = {
    1: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    2: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    3: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    4: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    5: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  };

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${colors[rating] || colors[3]}`}
    >
      <Star size={12} fill="currentColor" />
      <span>{rating}</span>
    </div>
  );
}

function SentimentBadge({ sentiment }) {
  const styles = {
    positive:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    negative: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    neutral:
      "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
  };

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${styles[sentiment] || styles.neutral}`}
    >
      <span className="capitalize">{sentiment}</span>
    </div>
  );
}

export default function GoogleReviewsList() {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: "new",
    rating: "",
    search: "",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
  });
  const [expandedReview, setExpandedReview] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  const fetchReviews = useCallback(async () => {
    if (!sessionId) return;

    setLoading(true);
    try {
      let url = `/api/google-review/${sessionId}/reviews?page=${pagination.page}&limit=${pagination.limit}`;
      if (filters.status) url += `&status=${filters.status}`;
      if (filters.rating) url += `&rating=${filters.rating}`;

      const res = await authFetch(url);
      if (!res.ok) throw new Error("Failed to fetch reviews");

      const json = await res.json();
      setReviews(json.reviews || []);
      setPagination(json.pagination);
      setError(null);
    } catch (err) {
      console.error("Error fetching reviews:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sessionId, pagination.page, pagination.limit, filters]);

  const handleReply = async (reviewId) => {
    if (!replyText.trim()) return;

    setReplying(true);
    try {
      const res = await authFetch(`/api/google-review/${reviewId}/reply`, {
        method: "POST",
        body: JSON.stringify({ replyText }),
      });

      if (!res.ok) throw new Error("Failed to send reply");

      await fetchReviews();
      setReplyText("");
      setExpandedReview(null);
    } catch (err) {
      console.error("Error sending reply:", err);
      setError(err.message);
    } finally {
      setReplying(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
      <PageHeader
        title="Customer Reviews"
        subtitle="Manage and respond to customer reviews"
        icon={MessageCircle}
        accent="#4285F4"
        tint="rgba(66,133,244,0.08)"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Filters */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              <Filter size={16} className="inline mr-2" />
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, status: e.target.value }));
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            >
              <option value="">All</option>
              <option value="new">New</option>
              <option value="replied">Replied</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              <Star size={16} className="inline mr-2" />
              Rating
            </label>
            <select
              value={filters.rating}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, rating: e.target.value }));
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            >
              <option value="">All ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              <Search size={16} className="inline mr-2" />
              Search
            </label>
            <input
              type="text"
              placeholder="Search reviews..."
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400"
            />
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 mb-8">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-blue-500" size={32} />
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <MessageCircle
              size={48}
              className="mx-auto text-slate-300 dark:text-slate-600 mb-4"
            />
            <p className="text-slate-600 dark:text-slate-400">
              No reviews found. Try adjusting your filters.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4 mb-8">
              {reviews.map((review) => (
                <div
                  key={review._id}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4 flex-1">
                        {review.authorPhoto && (
                          <img
                            src={review.authorPhoto}
                            alt={review.authorName}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-white truncate">
                            {review.authorName}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(review.reviewDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <RatingBadge rating={review.rating} />
                        <SentimentBadge sentiment={review.sentiment} />
                      </div>
                    </div>

                    <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">
                      {review.reviewText}
                    </p>

                    {review.isReplied && (
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 mb-4">
                        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
                          ✓ Your reply (
                          {new Date(review.replyDate).toLocaleDateString()})
                        </p>
                        <p className="text-sm text-blue-900 dark:text-blue-100">
                          {review.replyText}
                        </p>
                      </div>
                    )}

                    {!review.isReplied && (
                      <>
                        {expandedReview === review._id ? (
                          <div className="space-y-3">
                            <textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Write your reply..."
                              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                              rows="3"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleReply(review._id)}
                                disabled={replying}
                                className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg transition-shadow disabled:opacity-50"
                              >
                                {replying && (
                                  <Loader2 className="animate-spin" size={16} />
                                )}
                                Send Reply
                              </button>
                              <button
                                onClick={() => {
                                  setExpandedReview(null);
                                  setReplyText("");
                                }}
                                className="flex-1 py-2 px-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-semibold hover:bg-slate-200 dark:hover:bg-slate-600"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setExpandedReview(review._id);
                              setReplyText("");
                            }}
                            className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                          >
                            <Send size={16} />
                            Reply
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Page {pagination.page} of {pagination.pages} (
                  {pagination.total} total)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        page: Math.max(1, prev.page - 1),
                      }))
                    }
                    disabled={pagination.page === 1}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-semibold disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        page: Math.min(prev.pages, prev.page + 1),
                      }))
                    }
                    disabled={pagination.page === pagination.pages}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
