import dns from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import net from "node:net";

const DEFAULT_MAX_BYTES = 25 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 3;

function boundedNumber(value, fallback, minimum, maximum) {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? Math.min(maximum, Math.max(minimum, Math.floor(parsed)))
    : fallback;
}

function ipv4Number(address) {
  return address
    .split(".")
    .map(Number)
    .reduce((value, part) => (value * 256 + part) >>> 0, 0);
}

function inIpv4Range(address, network, bits) {
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipv4Number(address) & mask) === (ipv4Number(network) & mask);
}

function isPublicIpv4(address) {
  const blocked = [
    ["0.0.0.0", 8],
    ["10.0.0.0", 8],
    ["100.64.0.0", 10],
    ["127.0.0.0", 8],
    ["169.254.0.0", 16],
    ["172.16.0.0", 12],
    ["192.0.0.0", 24],
    ["192.0.2.0", 24],
    ["192.168.0.0", 16],
    ["198.18.0.0", 15],
    ["198.51.100.0", 24],
    ["203.0.113.0", 24],
    ["224.0.0.0", 4],
    ["240.0.0.0", 4],
  ];
  return !blocked.some(([network, bits]) =>
    inIpv4Range(address, network, bits),
  );
}

function isPublicIpv6(address) {
  const normalized = address.toLowerCase().split("%")[0];
  if (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb") ||
    normalized.startsWith("ff") ||
    normalized.startsWith("2001:db8:")
  ) {
    return false;
  }
  const mapped = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return mapped ? isPublicIpv4(mapped[1]) : true;
}

function isPublicAddress(address) {
  const family = net.isIP(address);
  if (family === 4) return isPublicIpv4(address);
  if (family === 6) return isPublicIpv6(address);
  return false;
}

function allowedHosts() {
  return String(process.env.REMOTE_MEDIA_ALLOWED_HOSTS || "")
    .split(",")
    .map((host) => host.trim().toLowerCase().replace(/^\./, ""))
    .filter(Boolean);
}

function assertAllowedHostname(hostname, allowlist = allowedHosts()) {
  if (
    allowlist.length &&
    !allowlist.some(
      (host) => hostname === host || hostname.endsWith(`.${host}`),
    )
  ) {
    const error = new Error("Remote media host is not allowed");
    error.statusCode = 400;
    error.code = "REMOTE_MEDIA_HOST_DENIED";
    throw error;
  }
}

async function resolvePublicAddress(hostname) {
  const directFamily = net.isIP(hostname);
  if (directFamily) {
    if (!isPublicAddress(hostname)) {
      throw new Error("Remote media URL resolves to a private or reserved address");
    }
    return { address: hostname, family: directFamily };
  }
  const results = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!results.length || results.some((result) => !isPublicAddress(result.address))) {
    throw new Error("Remote media URL resolves to a private or reserved address");
  }
  return results[0];
}

async function validateTarget(value, options = {}) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Remote media URL is invalid");
  }
  const allowHttp =
    options.allowHttp ?? process.env.REMOTE_MEDIA_ALLOW_HTTP === "true";
  if (url.protocol !== "https:" && !(allowHttp && url.protocol === "http:")) {
    throw new Error("Remote media URL must use HTTPS");
  }
  if (url.username || url.password) {
    throw new Error("Remote media URL must not contain credentials");
  }
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const localDevelopmentHost =
    options.allowPrivateLocal === true &&
    (hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1");
  if (url.port && !["80", "443"].includes(url.port) && !localDevelopmentHost) {
    throw new Error("Remote URL uses a blocked port");
  }
  assertAllowedHostname(hostname, options.allowedHosts ?? allowedHosts());
  const resolved = localDevelopmentHost
    ? net.isIP(hostname)
      ? { address: hostname, family: net.isIP(hostname) }
      : { address: "127.0.0.1", family: 4 }
    : await resolvePublicAddress(hostname);
  return { url, hostname, resolved };
}

export async function validateSafeRemoteUrl(value, options = {}) {
  const target = await validateTarget(value, options);
  return target.url.toString();
}

function requestOnce(target, options) {
  const transport = target.url.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    const request = transport.request(
      target.url,
      {
        method: "GET",
        headers: {
          Accept: "image/*,video/*,audio/*,application/pdf,application/octet-stream",
          "User-Agent": "OpenWhats-Remote-Media/1.0",
        },
        lookup: (_hostname, lookupOptions, callback) => {
          if (lookupOptions?.all) {
            callback(null, [target.resolved]);
            return;
          }
          callback(null, target.resolved.address, target.resolved.family);
        },
      },
      (response) => {
        const status = response.statusCode || 0;
        if ([301, 302, 303, 307, 308].includes(status)) {
          response.resume();
          resolve({ redirect: response.headers.location || null });
          return;
        }
        if (status < 200 || status >= 300) {
          response.resume();
          reject(new Error(`Failed to download media from URL (${status})`));
          return;
        }
        const declaredLength = Number(response.headers["content-length"] || 0);
        if (declaredLength > options.maxBytes) {
          response.destroy();
          reject(new Error("Remote media exceeds the configured size limit"));
          return;
        }
        const chunks = [];
        let received = 0;
        response.on("data", (chunk) => {
          received += chunk.length;
          if (received > options.maxBytes) {
            response.destroy(new Error("Remote media exceeds the configured size limit"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () =>
          resolve({
            buffer: Buffer.concat(chunks),
            contentType: String(response.headers["content-type"] || ""),
          }),
        );
        response.on("error", reject);
      },
    );
    request.setTimeout(options.timeoutMs, () =>
      request.destroy(new Error("Remote media download timed out")),
    );
    request.on("error", reject);
    request.end();
  });
}

export async function downloadSafeRemoteMedia(value) {
  const maxBytes = boundedNumber(
    process.env.REMOTE_MEDIA_MAX_BYTES,
    DEFAULT_MAX_BYTES,
    1024,
    100 * 1024 * 1024,
  );
  const timeoutMs = boundedNumber(
    process.env.REMOTE_MEDIA_TIMEOUT_MS,
    DEFAULT_TIMEOUT_MS,
    1000,
    60_000,
  );
  let current = String(value || "").trim();
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const target = await validateTarget(current);
    const response = await requestOnce(target, { maxBytes, timeoutMs });
    if (!response.redirect) {
      return {
        buffer: response.buffer,
        contentType: response.contentType,
        finalUrl: target.url.toString(),
      };
    }
    if (redirects === MAX_REDIRECTS) {
      throw new Error("Remote media has too many redirects");
    }
    current = new URL(response.redirect, target.url).toString();
  }
  throw new Error("Remote media download failed");
}

export async function postSafeJson(value, options) {
  const target = await validateTarget(value, {
    allowHttp: Boolean(options.allowHttp),
    allowPrivateLocal: Boolean(options.allowPrivateLocal),
    allowedHosts: options.allowedHosts || [],
  });
  const timeoutMs = boundedNumber(
    options.timeoutMs,
    DEFAULT_TIMEOUT_MS,
    1000,
    60_000,
  );
  const maxResponseBytes = boundedNumber(
    options.maxResponseBytes,
    64 * 1024,
    1024,
    1024 * 1024,
  );
  const transport = target.url.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    const request = transport.request(
      target.url,
      {
        method: "POST",
        headers: {
          ...(options.headers || {}),
          "content-length": Buffer.byteLength(options.body || ""),
        },
        lookup: (_hostname, lookupOptions, callback) => {
          if (lookupOptions?.all) {
            callback(null, [target.resolved]);
            return;
          }
          callback(null, target.resolved.address, target.resolved.family);
        },
      },
      (response) => {
        const chunks = [];
        let received = 0;
        response.on("data", (chunk) => {
          received += chunk.length;
          if (received > maxResponseBytes) {
            response.destroy(new Error("Webhook response is too large"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          let data = null;
          try {
            data = raw ? JSON.parse(raw) : null;
          } catch {
            data = null;
          }
          resolve({
            ok:
              (response.statusCode || 0) >= 200 &&
              (response.statusCode || 0) < 300,
            status: response.statusCode || 0,
            data,
          });
        });
        response.on("error", reject);
      },
    );
    request.setTimeout(timeoutMs, () =>
      request.destroy(new Error("Webhook request timed out")),
    );
    request.on("error", reject);
    request.end(options.body || "");
  });
}
