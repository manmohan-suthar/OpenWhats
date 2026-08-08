import { getUserFromToken } from "../utils/auth.js";
import { findApiKeyPrincipal } from "../controllers/apiKeyController.js";
import PartnerTenantService from "../services/PartnerTenantService.js";

async function attachActivePartnerTenant(req) {
  if (
    !req.user?.managedByPartner &&
    req.user?.authProvider !== "partner"
  ) {
    return;
  }
  const tenant = await PartnerTenantService.requireActiveForUser(req.user?._id);
  if (tenant) req.partnerTenant = tenant;
}

const authMiddleware = async (req, res, next) => {
  try {
    // ── Check x-api-key header first ─────────────────────────────────────────
    const apiKeyHeader = (req.headers["x-api-key"] || "").trim();
    if (apiKeyHeader) {
      const principal = await findApiKeyPrincipal(apiKeyHeader);
      if (!principal) {
        return res.status(401).json({
          error: "API key not found or revoked",
          hint: "Generate a new key at /dashboard/api-keys",
        });
      }
      req.user = principal.user;
      req.apiKey = principal.apiKey;
      req.authMode = "api-key";
      await attachActivePartnerTenant(req);
      return next();
    }

    // ── Fall back to Authorization Bearer (JWT or API key) ───────────────────
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ")
      ? header.slice(7).trim()
      : header.trim();

    if (!token) {
      return res.status(401).json({
        error: "No authentication provided",
        hint: "Sign in to the app or send an Authorization: Bearer <token> header",
      });
    }

    // ── API key via Bearer ────────────────────────────────────────────────────
    if (token.startsWith("wac_live_") || token.startsWith("wac_test_")) {
      const principal = await findApiKeyPrincipal(token);
      if (!principal) {
        return res.status(401).json({
          error: "API key not found or revoked",
          hint: "Generate a new key at /dashboard/api-keys",
        });
      }
      req.user = principal.user;
      req.apiKey = principal.apiKey;
      req.authMode = "api-key";
      await attachActivePartnerTenant(req);
      return next();
    }

    // ── JWT path ──────────────────────────────────────────────────────────────
    const user = await getUserFromToken(token);
    if (!user) {
      return res.status(401).json({
        error: "JWT invalid or expired — please re-login",
        hint: "Refresh your login session and retry the request",
      });
    }

    req.user = user;
    req.authMode = "jwt";
    await attachActivePartnerTenant(req);
    next();
  } catch (err) {
    console.error("🔐 [AUTH] 💥", err.message);
    const status = Number(err.statusCode || 401);
    return res.status(status).json({
      error: err.message || "Authentication failed",
      code: err.code || (status === 401 ? "AUTHENTICATION_FAILED" : "PARTNER_ACCESS_DENIED"),
      ...(err.details ? { details: err.details } : {}),
    });
  }
};

export default authMiddleware;
