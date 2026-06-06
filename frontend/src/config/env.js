const FALLBACK_API_URL = "http://localhost:3000";

export const API_ORIGIN = (
  import.meta.env.VITE_API_URL || FALLBACK_API_URL
).replace(/\/$/, "");

export function resolveApiUrl(path = "") {
  if (!path) return API_ORIGIN;
  if (
    path.startsWith("data:") ||
    path.startsWith("http://") ||
    path.startsWith("https://")
  ) {
    return path;
  }
  if (path.startsWith("/")) {
    return `${API_ORIGIN}${path}`;
  }
  return `${API_ORIGIN}/${path}`;
}
