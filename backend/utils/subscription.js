export const sendSubscriptionError = (
  res,
  err,
  fallbackMessage = "Operation failed",
) => {
  if (err?.code === "LIMIT_EXCEEDED" || err?.name === "LimitError") {
    return res.status(err.statusCode || 403).json({
      success: false,
      code: "LIMIT_EXCEEDED",
      error: err.message,
      details: err.details || null,
    });
  }

  const statusCode = Number(err?.statusCode || err?.status || 0);
  if (statusCode >= 400 && statusCode < 600) {
    return res.status(statusCode).json({
      success: false,
      code: err.code || undefined,
      error: err?.message || fallbackMessage,
    });
  }

  return res.status(500).json({
    success: false,
    error: err?.message || fallbackMessage,
  });
};
