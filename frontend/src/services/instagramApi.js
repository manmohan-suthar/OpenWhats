import { authFetch } from "./authFetch.js";

const BASE = "/api/instagram";

// OAuth Flow
export const initiateOAuth = () =>
  authFetch(`${BASE}/oauth/initiate`, { method: "GET" });

// Instagram Session
export const getSessionStatus = () =>
  authFetch(`${BASE}/oauth/status`, { method: "GET" });

export const removeSession = () =>
  authFetch(`${BASE}/remove`, { method: "POST" });

// Media
export const getMedia = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return authFetch(`${BASE}/media${q ? "?" + q : ""}`);
};

export const getMediaCounts = () =>
  authFetch(`${BASE}/media/counts`, { method: "GET" });

export const getComments = (mediaId) =>
  authFetch(`${BASE}/media/${mediaId}/comments`, { method: "GET" });

// Direct Messages
export const getConversations = () =>
  authFetch(`${BASE}/dms`, { method: "GET" });

export const getConversationMessages = (conversationId) =>
  authFetch(`${BASE}/dms/${conversationId}/messages`, { method: "GET" });

export const sendDirectMessage = (data) =>
  authFetch(`${BASE}/dms/send`, { method: "POST", body: data });

export const approveRequest = (conversationId) =>
  authFetch(`${BASE}/dms/${conversationId}/approve`, { method: "POST" });

export const declineRequest = (conversationId) =>
  authFetch(`${BASE}/dms/${conversationId}/decline`, { method: "POST" });

// Notifications
export const getNotifications = () =>
  authFetch(`${BASE}/notifications`, { method: "GET" });
