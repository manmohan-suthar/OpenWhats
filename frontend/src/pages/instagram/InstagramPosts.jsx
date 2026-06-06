import { useEffect, useState, useRef, useCallback } from "react";
import {
  Plus,
  Calendar,
  Heart,
  MessageCircle,
  Share2,
  Image,
  BarChart3,
  Loader2,
  RefreshCw,
  Play,
  X,
} from "lucide-react";
import { authFetch } from "../../services/authFetch";

const PAGE_LIMIT = 12;

export default function InstagramPosts() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [after, setAfter] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [tab, setTab] = useState("all"); // all | post | reel
  const [counts, setCounts] = useState({ total: 0, posts: 0, reels: 0 });
  const [countsLoading, setCountsLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);

  const sentinelRef = useRef(null);

  const buildUrl = (cursor, currentTab) => {
    const parts = [`/api/instagram/media?limit=${PAGE_LIMIT}`];
    if (cursor) parts.push(`after=${encodeURIComponent(cursor)}`);
    if (currentTab && currentTab !== "all")
      parts.push(`type=${encodeURIComponent(currentTab)}`);
    return parts.join("&");
  };

  const loadPage = useCallback(
    async (opts = { append: false }) => {
      try {
        if (opts.append) setLoadingMore(true);
        else setLoading(true);
        setError(null);

        const url = buildUrl(opts.append ? after : null, tab);
        const res = await authFetch(url);

        // accept response shape { data, paging } or raw array
        const data = res?.data ?? res;
        const paging = res?.paging ?? null;

        const newItems = Array.isArray(data) ? data : [];

        setItems((prev) => (opts.append ? [...prev, ...newItems] : newItems));

        // derive next cursor
        const nextAfter = paging?.cursors?.after ?? null;
        setAfter(nextAfter);
        setHasMore(Boolean(paging?.next || nextAfter));
      } catch (err) {
        console.error(err);
        setError(err?.message || "Failed to load posts");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [after, tab],
  );

  // initial load / tab change
  useEffect(() => {
    setAfter(null);
    setHasMore(true);
    loadPage({ append: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // infinite scroll observer
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && hasMore && !loadingMore && !loading) {
          loadPage({ append: true });
        }
      });
    });
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, loading, loadPage]);

  // fetch counts for analytics
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await authFetch(`/api/instagram/media/counts`);
        if (!mounted) return;
        if (res?.success && res.counts) setCounts(res.counts);
        else {
          // fallback to session graph for at least total media
          try {
            const s = await authFetch(`/api/instagram/session`);
            if (!mounted) return;
            const graph = s?.graph || s?.session?.graph || null;
            if (graph?.instagramMediaCount) {
              setCounts((c) => ({ ...c, total: graph.instagramMediaCount }));
            }
          } catch (err) {
            // ignore
          }
        }
      } catch (e) {
        // try session fallback
        try {
          const s = await authFetch(`/api/instagram/session`);
          if (!mounted) return;
          const graph = s?.graph || s?.session?.graph || null;
          if (graph?.instagramMediaCount) {
            setCounts((c) => ({ ...c, total: graph.instagramMediaCount }));
          }
        } catch (err) {
          // ignore
        }
      } finally {
        if (mounted) setCountsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Posts & Content
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Browse your Instagram media, filter by type, and load more as you
            scroll.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="hidden md:inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 bg-white text-sm shadow-sm dark:bg-slate-800 dark:border-slate-700">
            <BarChart3 size={14} /> Insights
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 font-semibold">
            <Plus size={16} /> New Post
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        <TabButton
          active={tab === "all"}
          onClick={() => setTab("all")}
          icon={<BarChart3 size={14} />}
        >
          All
        </TabButton>
        <TabButton
          active={tab === "post"}
          onClick={() => setTab("post")}
          icon={<Image size={14} />}
        >
          Posts
        </TabButton>
        <TabButton
          active={tab === "reel"}
          onClick={() => setTab("reel")}
          icon={<Calendar size={14} />}
        >
          Reels
        </TabButton>
        <div className="ml-4 hidden sm:flex items-center gap-3">
          <div className="text-sm text-slate-500">
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="animate-spin" size={14} /> Loading
              </span>
            ) : (
              `${items.length} items`
            )}
          </div>
        </div>
      </div>

      {/* Preview modal */}
      {previewOpen && previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setPreviewOpen(false)}
          />
          <div className="relative z-10 max-w-3xl w-full mx-4">
            <div className="rounded-xl bg-white dark:bg-slate-900 overflow-hidden">
              <div className="flex items-center justify-end p-2">
                <button
                  onClick={() => setPreviewOpen(false)}
                  className="rounded-full p-1 text-slate-600 hover:bg-slate-100 dark:text-slate-300"
                >
                  <X />
                </button>
              </div>
              <div className="p-4">
                {(previewItem.media_type || "")
                  .toUpperCase()
                  .includes("VIDEO") ? (
                  <video
                    controls
                    autoPlay
                    className="w-full h-auto rounded"
                    src={previewItem.media_url}
                    poster={previewItem.thumbnail_url || undefined}
                  />
                ) : (
                  <img
                    src={previewItem.media_url || previewItem.thumbnail_url}
                    alt={previewItem.caption || "preview"}
                    className="w-full h-auto rounded"
                  />
                )}
                {previewItem.caption ? (
                  <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">
                    {previewItem.caption}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Top counts */}
      <div className="flex gap-3">
        <StatPill
          label="Total"
          value={counts.total}
          icon={<BarChart3 size={16} />}
          loading={countsLoading}
        />
        <StatPill
          label="Posts"
          value={counts.posts}
          icon={<Image size={16} />}
          loading={countsLoading}
        />
        <StatPill
          label="Reels"
          value={counts.reels}
          icon={<Play size={16} />}
          loading={countsLoading}
        />
      </div>

      {/* Grid */}
      <main className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <article
            key={item.id ?? item.media_id}
            className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="relative w-full aspect-square bg-slate-100 dark:bg-slate-800">
              {item.thumbnail_url || item.media_url ? (
                <img
                  src={item.thumbnail_url || item.media_url}
                  alt={item.caption ?? "post"}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-400">
                  No preview
                </div>
              )}
              <div className="absolute left-3 top-3 rounded-full bg-black/45 px-2 py-1 text-xs text-white">
                {(item.media_type || "").toUpperCase()}
              </div>

              {/* preview button */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setPreviewItem(item);
                  setPreviewOpen(true);
                }}
                className="absolute inset-0 m-auto flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:opacity-100"
                aria-label="Preview"
              >
                {(item.media_type || "").toUpperCase().includes("VIDEO") ? (
                  <Play size={20} />
                ) : (
                  <Image size={18} />
                )}
              </button>
            </div>
            <div className="p-3">
              <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">
                {item.caption ?? ""}
              </p>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Heart size={14} /> {item.like_count ?? "—"}
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle size={14} /> {item.comments_count ?? "—"}
                  </div>
                  {typeof item.share_count !== "undefined" ? (
                    <div className="flex items-center gap-1">
                      <Share2 size={14} /> {item.share_count ?? "—"}
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <time>{formatDate(item.timestamp)}</time>
                </div>
              </div>
            </div>
          </article>
        ))}

        {/* loading placeholders */}
        {loading &&
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={`skeleton-${i}`}
              className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 animate-pulse"
            >
              <div className="w-full aspect-square bg-slate-200" />
              <div className="p-3">
                <div className="h-3 w-3/4 bg-slate-200 mb-2" />
                <div className="h-3 w-1/2 bg-slate-200" />
              </div>
            </div>
          ))}
      </main>

      {/* sentinel for infinite scroll */}
      <div ref={sentinelRef} className="h-6" />

      {/* load more fallback / status */}
      <div className="flex items-center justify-center py-6">
        {error && <div className="text-sm text-red-500">{error}</div>}
        {!loading && loadingMore && (
          <div className="inline-flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="animate-spin" size={14} /> Loading more...
          </div>
        )}
        {!loading && !hasMore && (
          <div className="text-sm text-slate-400">No more posts</div>
        )}
        {!loading && hasMore && !loadingMore && (
          <button
            onClick={() => loadPage({ append: true })}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm bg-white dark:bg-slate-800"
          >
            {" "}
            <RefreshCw size={14} /> Load more
          </button>
        )}
      </div>
    </div>
  );
}

function TabButton({ children, active, onClick, icon }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${active ? "bg-slate-900 text-white dark:bg-white/6" : "bg-slate-50 text-slate-600 dark:bg-slate-800"}`}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

function formatDate(value) {
  if (!value) return "—";
  try {
    const d = new Date(value);
    return d.toLocaleDateString();
  } catch (e) {
    return "—";
  }
}

function StatPill({ label, value, icon, loading }) {
  return (
    <div className="flex items-center gap-3 rounded-md bg-white p-3 border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
      <div className="rounded-full bg-slate-100 p-2 dark:bg-slate-800">
        {icon}
      </div>
      <div>
        <div className="text-xs text-slate-400">{label}</div>
        <div className="text-lg font-bold text-slate-900 dark:text-white">
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="animate-spin" size={14} /> Loading
            </span>
          ) : (
            (value ?? "—")
          )}
        </div>
      </div>
    </div>
  );
}
