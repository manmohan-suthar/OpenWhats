import { authFetch } from "./authFetch.js";

const BASE = "/api/reels";

export const listReelCampaigns = () => authFetch(`${BASE}`);
export const createReelCampaign = (data) =>
  authFetch(`${BASE}`, { method: "POST", body: data });
export const getReelCampaign = (id) => authFetch(`${BASE}/${id}`);
export const deleteReelCampaign = (id) =>
  authFetch(`${BASE}/${id}`, { method: "DELETE" });
export const pauseReelCampaign = (id) =>
  authFetch(`${BASE}/${id}/pause`, { method: "POST" });
export const resumeReelCampaign = (id) =>
  authFetch(`${BASE}/${id}/resume`, { method: "POST" });
export const retryReel = (id) =>
  authFetch(`${BASE}/reel/${id}/retry`, { method: "POST" });
export const deleteReel = (id) =>
  authFetch(`${BASE}/reel/${id}`, { method: "DELETE" });
