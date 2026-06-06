import { authFetch } from "./authFetch.js";

const BASE = "/api/meta";

// ─── Auth ──────────────────────────────────────────────────────────────────
// Exchange OAuth code returned from Facebook redirect
export const exchangeFacebookCode = (code, redirectUri) =>
  authFetch(`${BASE}/auth/exchange-code`, {
    method: "POST",
    body: { code, redirectUri },
  });

export const saveFacebookToken = (accessToken) =>
  authFetch(`${BASE}/auth/facebook`, { method: "POST", body: { accessToken } });

export const getMetaStatus = () => authFetch(`${BASE}/auth/status`);

export const getMetaOAuthConfig = () => authFetch(`${BASE}/auth/config`);

export const disconnectFacebook = () =>
  authFetch(`${BASE}/auth/disconnect`, { method: "DELETE" });

// ─── Businesses / WABA ─────────────────────────────────────────────────────
export const getBusinesses = () => authFetch(`${BASE}/business`);

export const syncBusinesses = () =>
  authFetch(`${BASE}/business/sync`, { method: "POST" });

export const connectBusiness = (data) =>
  authFetch(`${BASE}/business`, { method: "POST", body: data });

export const disconnectBusiness = (wabaId) =>
  authFetch(`${BASE}/business/${wabaId}`, { method: "DELETE" });

// ─── Phone Numbers ─────────────────────────────────────────────────────────
export const getNumbers = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return authFetch(`${BASE}/numbers${q ? "?" + q : ""}`);
};

export const syncNumbers = (wabaDbId) =>
  authFetch(`${BASE}/numbers/sync/${wabaDbId}`, { method: "POST" });

export const submitDisplayName = (id, data) =>
  authFetch(`${BASE}/numbers/${id}/display-name`, {
    method: "POST",
    body: data,
  });

// ─── Templates ─────────────────────────────────────────────────────────────
export const getTemplates = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return authFetch(`${BASE}/templates${q ? "?" + q : ""}`);
};

export const createTemplate = (data) =>
  authFetch(`${BASE}/templates`, { method: "POST", body: data });

export const deleteTemplate = (id) =>
  authFetch(`${BASE}/templates/${id}`, { method: "DELETE" });

export const syncTemplate = (id) =>
  authFetch(`${BASE}/templates/${id}/sync`, { method: "POST" });

export const syncAllTemplates = (wabaId) =>
  authFetch(`${BASE}/templates/sync-all`, { method: "POST", body: { wabaId } });

// ─── Messaging ─────────────────────────────────────────────────────────────
export const sendMessage = (data) =>
  authFetch(`${BASE}/messages/send`, { method: "POST", body: data });

export const getMessages = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return authFetch(`${BASE}/messages${q ? "?" + q : ""}`);
};

// ─── Campaigns ─────────────────────────────────────────────────────────────
export const getCampaigns = () => authFetch(`${BASE}/campaigns`);

export const createCampaign = (data) =>
  authFetch(`${BASE}/campaigns`, { method: "POST", body: data });

export const startCampaign = (id) =>
  authFetch(`${BASE}/campaigns/${id}/start`, { method: "POST" });

// ─── Admin ─────────────────────────────────────────────────────────────────
export const adminGetUsers = () => authFetch(`${BASE}/admin/users`);
export const adminGetBusinesses = () => authFetch(`${BASE}/admin/businesses`);
export const adminGetMessages = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return authFetch(`${BASE}/admin/messages${q ? "?" + q : ""}`);
};
export const adminGetTemplates = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return authFetch(`${BASE}/admin/templates${q ? "?" + q : ""}`);
};
export const adminModerateTemplate = (id, data) =>
  authFetch(`${BASE}/admin/templates/${id}/moderate`, {
    method: "PUT",
    body: data,
  });
export const adminGetAnalytics = () => authFetch(`${BASE}/admin/analytics`);
export const adminGetSettings = () => authFetch(`${BASE}/admin/settings`);
export const adminUpdateSettings = (data) =>
  authFetch(`${BASE}/admin/settings`, { method: "PUT", body: data });
export const adminSetBusinessStatus = (wabaId, status) =>
  authFetch(`${BASE}/admin/businesses/${wabaId}/status`, {
    method: "PUT",
    body: { status },
  });
