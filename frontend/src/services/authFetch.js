import { API_ORIGIN } from "../config/env";

export function authFetch(path, opts = {}) {
  const url = path.startsWith("http") ? path : `${API_ORIGIN}${path}`;
  const hasBody = opts.body != null && typeof opts.body === "object" && !(opts.body instanceof FormData);
  return fetch(url, {
    ...opts,
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      ...opts.headers,
    },
    body: hasBody ? JSON.stringify(opts.body) : opts.body,
  }).then(async (r) => {
    const ct = r.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      throw new Error(`API unreachable (status ${r.status})`);
    }
    return r.json();
  });
}
