const apiPermission = (...requiredPermissions) => (req, res, next) => {
  // Dashboard JWT users retain the same access they had before the provider API
  // was introduced. API keys are always scoped explicitly.
  if (req.authMode !== "api-key") return next();

  const granted = new Set(req.apiKey?.permissions || []);
  const allowed =
    granted.has("*") ||
    requiredPermissions.some((permission) => granted.has(permission));

  if (!allowed) {
    return res.status(403).json({
      success: false,
      code: "API_KEY_PERMISSION_DENIED",
      error: `API key requires one of: ${requiredPermissions.join(", ")}`,
    });
  }

  return next();
};

export default apiPermission;

