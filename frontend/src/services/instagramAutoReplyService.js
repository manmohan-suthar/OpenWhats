import { authFetch } from "./authFetch";

let _intervalId = null;
let _running = false;
let _agentId = null;
let _lastProcessedAt = null; // epoch ms
let _processedIds = new Set();
let _botUsername = null;
let _startCutoffAt = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPendingComments() {
  try {
    const res = await authFetch(`/api/instagram/ai-agent/pending-comments`);
    if (res?.success) return res.data?.pendingComments || [];
  } catch (err) {
    console.error(
      "[AutoReplyService] failed to fetch pending comments",
      err?.message || err,
    );
  }
  return [];
}

async function _loadAgentInfo(agentId) {
  try {
    const res = await authFetch(`/api/instagram/ai-agent/status`);
    if (res?.success) {
      const agent = res.data?.agent || null;
      const session = res.data?.session || null;
      _botUsername =
        session?.graph?.instagramUsername ||
        agent?.sourceAccount?.graph?.instagramUsername ||
        null;
    }
  } catch (e) {
    console.error(
      "[AutoReplyService] failed to load agent info",
      e?.message || e,
    );
  }
}

function _getItemTimestamp(item) {
  try {
    const c = item?.comment || item;
    let ts =
      c?.createdAt || c?.created_at || c?.created_time || c?.timestamp || c?.ts;
    if (!ts && item?.createdAt) ts = item.createdAt;
    if (!ts) return null;
    // if timestamp is ISO string
    if (typeof ts === "string") {
      const parsed = Date.parse(ts);
      if (!isNaN(parsed)) return parsed;
    }
    // if number, could be seconds or ms
    if (typeof ts === "number") {
      if (ts < 1e12) return ts * 1000; // seconds -> ms
      return ts;
    }
    return null;
  } catch (err) {
    return null;
  }
}

function _isEligibleForAutoReply(item) {
  const itemTs = _getItemTimestamp(item);
  if (!itemTs) return false;

  if (_startCutoffAt && itemTs < _startCutoffAt) return false;
  if (_lastProcessedAt && itemTs <= _lastProcessedAt) return false;

  return true;
}

async function postReplyForItem(item) {
  try {
    const body = {
      commentId: item.comment.id,
      mediaId: item.mediaId,
      mediaCaption: item.mediaCaption,
      mediaType: item.mediaType,
      mediaUrl: item.mediaUrl,
      likeCount: item.likeCount || 0,
      commentsCount: item.commentsCount || 0,
      permalink: item.permalink,
      commentText: item.comment.text,
      username: item.comment.username,
    };

    const res = await authFetch(`/api/instagram/ai-agent/post-reply`, {
      method: "POST",
      body,
    });

    return res;
  } catch (err) {
    console.error("[AutoReplyService] postReply failed", err?.message || err);
    return { success: false, error: err?.message || "post failed" };
  }
}

async function processBatch() {
  const pending = await fetchPendingComments();
  if (!pending || pending.length === 0) return 0;

  let replied = 0;

  for (const item of pending) {
    if (!_running) break;

    if (!_isEligibleForAutoReply(item)) continue;

    const itemTs = _getItemTimestamp(item);
    if (!itemTs) continue; // skip items without reliable timestamp

    const commentId = item?.comment?.id;
    const username = String(item?.comment?.username || "").toLowerCase();

    // skip if we already processed this comment
    if (commentId && _processedIds.has(commentId)) continue;

    // skip comments from our own account to avoid reply-loops
    if (_botUsername && username === String(_botUsername).toLowerCase())
      continue;

    // random delay 5-10s to avoid rate spikes
    const delaySec = Math.floor(Math.random() * 6) + 5;
    await sleep(delaySec * 1000);

    const res = await postReplyForItem(item);
    if (res?.success) {
      replied += 1;
      // advance last processed timestamp to this item
      _lastProcessedAt = Math.max(_lastProcessedAt || 0, itemTs);
      if (commentId) {
        _processedIds.add(commentId);
        try {
          if (_agentId) {
            const key = `instagramAutoReply:processedIds:${_agentId}`;
            localStorage.setItem(
              key,
              JSON.stringify(Array.from(_processedIds)),
            );
          }
        } catch (e) {
          // ignore
        }
      }
      try {
        if (_agentId)
          localStorage.setItem(
            `instagramAutoReply:lastProcessed:${_agentId}`,
            String(_lastProcessedAt),
          );
      } catch (e) {
        // ignore storage errors
      }
    }
  }

  return replied;
}

function start(agentId, startedAt) {
  if (_running) return;
  _running = true;
  _agentId = agentId || null;
  _startCutoffAt = startedAt ? Date.parse(startedAt) : null;
  if (_startCutoffAt && Number.isNaN(_startCutoffAt)) {
    _startCutoffAt = null;
  }
  const baselineProcessedAt = _startCutoffAt || Date.now();

  // load last processed timestamp for this agent if present; otherwise
  // initialize to now so we do NOT reply to older comments on first start
  try {
    const key = _agentId
      ? `instagramAutoReply:lastProcessed:${_agentId}`
      : null;
    const stored = key ? localStorage.getItem(key) : null;
    if (stored) {
      const storedProcessedAt = Number(stored) || baselineProcessedAt;
      _lastProcessedAt = Math.max(storedProcessedAt, baselineProcessedAt);
    } else {
      _lastProcessedAt = baselineProcessedAt;
    }
  } catch (e) {
    _lastProcessedAt = baselineProcessedAt;
  }

  // run immediately, then every 15s
  // Polling removed — webhook architecture will drive processing.
  // Keep service state so UI can reflect running/stopped, but do not
  // start a polling loop here.
}

function stop() {
  _running = false;
  _agentId = null;
  _lastProcessedAt = null;
  _startCutoffAt = null;
  if (_intervalId) {
    clearInterval(_intervalId);
    _intervalId = null;
  }
}

function isRunning() {
  return !!_running;
}

export default {
  start,
  stop,
  isRunning,
};
