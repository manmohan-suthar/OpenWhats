import { authFetch } from "./authFetch.js";

const BASE = "/api/pinterest";

export function searchPinterestVideos(keyword, num = 12) {
  const params = new URLSearchParams({
    keyword: String(keyword || "").trim(),
    num: String(num),
  });

  return authFetch(`${BASE}/search?${params.toString()}`, { method: "GET" });
}

export function resolvePinterestUrls(urls) {
  return authFetch(`${BASE}/resolve`, {
    method: "POST",
    body: { urls },
  });
}
