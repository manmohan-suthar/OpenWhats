/**
 * ============================================
 * PERFORMANCE & BEST PRACTICES GUIDE
 * ============================================
 */

/**
 * 1. MESSAGE TYPE SELECTION
 * ============================================
 *
 * PREFER FOR SPEED:
 * ✅ Quick Reply    (simplest, fastest)
 * ✅ CTA URL        (direct link, no processing)
 * ✅ CTA Call       (simple phone number)
 * ✅ List           (simple rows)
 *
 * USE CAREFULLY:
 * ⚠️ Native Flow    (more data, complex)
 * ⚠️ Carousel       (multiple cards, rendering)
 * ⚠️ WebView        (external load)
 * ⚠️ Payment        (with redirects)
 *
 * AVOID (UNSUPPORTED):
 * ❌ Product        (requires Cloud API)
 * ❌ Multi Product  (requires Cloud API)
 */

/**
 * 2. PAYLOAD OPTIMIZATION
 * ============================================
 *
 * DO:
 * ✅ Keep button text short (under 20 chars)
 * ✅ Limit body to 1024 characters
 * ✅ Use max 10 buttons per message
 * ✅ Compress images/media separately
 * ✅ Use pagination for large lists (limit sections)
 *
 * DON'T:
 * ❌ Send large objects in data
 * ❌ Use long button labels
 * ❌ Send more than 10 buttons
 * ❌ Include unnecessary metadata
 * ❌ Send unvalidated input
 */

/**
 * 3. ERROR HANDLING
 * ============================================
 */

// GOOD: Catch and retry
async function sendWithRetry(config, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await sendInteractiveMessage(config);
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);
      if (i < maxRetries - 1) {
        // Exponential backoff
        await new Promise((r) => setTimeout(r, Math.pow(2, i) * 1000));
      }
    }
  }
  throw new Error("Max retries exceeded");
}

// GOOD: Validate before sending
async function validateAndSend(config) {
  try {
    // Validate payload
    if (!config.sessionId || !config.to || !config.type) {
      throw new Error("Missing required fields");
    }

    // Send
    return await sendInteractiveMessage(config);
  } catch (error) {
    console.error("Error:", error.message);
    // Return user-friendly error
    return {
      success: false,
      error: "Failed to send message. Please try again.",
    };
  }
}

/**
 * 4. CONCURRENCY MANAGEMENT
 * ============================================
 */

// DON'T: Send too many at once
async function sendManyMessagesBAD(sessions, messages) {
  // This could overload the system
  return Promise.all(messages.map((msg) => sendInteractiveMessage(msg)));
}

// DO: Use queuing/batching
async function sendManyMessagesGOOD(messages, concurrency = 5) {
  const queue = [];
  const results = [];

  for (const msg of messages) {
    queue.push(
      sendInteractiveMessage(msg)
        .then((result) => results.push(result))
        .catch((error) => results.push({ success: false, error })),
    );

    if (queue.length >= concurrency) {
      await Promise.race(queue);
      queue.splice(
        queue.findIndex((p) => p.settled || false),
        1,
      );
    }
  }

  await Promise.all(queue);
  return results;
}

/**
 * 5. CACHING STRATEGIES
 * ============================================
 */

// Cache supported types
const typeCache = {
  data: null,
  timestamp: null,
  ttl: 3600000, // 1 hour

  async get() {
    const now = Date.now();
    if (this.data && now - this.timestamp < this.ttl) {
      return this.data;
    }

    const response = await fetch("/api/messages/interactive/types");
    this.data = await response.json();
    this.timestamp = now;
    return this.data;
  },
};

// Usage:
// const types = await typeCache.get();

/**
 * 6. LOGGING & MONITORING
 * ============================================
 */

// Good: Structured logging
async function sendWithLogging(config) {
  const startTime = Date.now();

  try {
    console.log("[INFO] Sending message", {
      type: config.type,
      sessionId: config.sessionId,
      to: config.to,
    });

    const result = await sendInteractiveMessage(config);

    const duration = Date.now() - startTime;
    console.log("[SUCCESS] Message sent", {
      type: config.type,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("[ERROR] Failed to send message", {
      type: config.type,
      error: error.message,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });

    throw error;
  }
}

/**
 * 7. INPUT VALIDATION
 * ============================================
 */

// Good: Comprehensive validation
function validateBeforeSend(config) {
  const errors = [];

  // Required fields
  if (!config.sessionId) errors.push("sessionId required");
  if (!config.to) errors.push("to required");
  if (!config.type) errors.push("type required");
  if (!config.data) errors.push("data required");

  // Type validation
  const validTypes = [
    "quick_reply",
    "cta_url",
    "cta_call",
    "list",
    "native_flow",
    "carousel",
    "webview",
    "payment",
  ];
  if (config.type && !validTypes.includes(config.type)) {
    errors.push(`Invalid type: ${config.type}`);
  }

  // Phone validation
  if (config.to && !/^\d{10,}|^\+/.test(config.to)) {
    errors.push("Invalid phone number");
  }

  if (errors.length > 0) {
    throw new Error(errors.join(", "));
  }

  return true;
}

/**
 * 8. MEMORY MANAGEMENT
 * ============================================
 */

// DO: Clean up after sending
async function sendAndCleanup(config) {
  let result;

  try {
    result = await sendInteractiveMessage(config);
  } finally {
    // Clean up large objects
    config.data = null;
    config = null;
  }

  return result;
}

// DON'T: Keep references to large objects
async function sendAndKeepBAD(config) {
  const result = await sendInteractiveMessage(config);
  globalStore.lastConfig = config; // DON'T DO THIS

  return result;
}

/**
 * 9. TIMEOUT HANDLING
 * ============================================
 */

async function sendWithTimeout(config, timeoutMs = 5000) {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Request timeout")), timeoutMs),
  );

  try {
    return await Promise.race([sendInteractiveMessage(config), timeoutPromise]);
  } catch (error) {
    if (error.message === "Request timeout") {
      console.error("Message send timed out after", timeoutMs, "ms");
    }
    throw error;
  }
}

/**
 * 10. BATCH OPERATIONS
 * ============================================
 */

// Process messages in batches
async function sendBatch(messages, batchSize = 10) {
  const results = [];

  for (let i = 0; i < messages.length; i += batchSize) {
    const batch = messages.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map((msg) => sendInteractiveMessage(msg)),
    );

    results.push(...batchResults);

    // Wait between batches to avoid overload
    if (i + batchSize < messages.length) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  return results;
}

/**
 * 11. SESSION MANAGEMENT
 * ============================================
 */

// Verify session before sending
async function sendWithSessionCheck(config) {
  // Call the types endpoint first to verify session
  try {
    const types = await fetch("/api/messages/interactive/types").then((r) =>
      r.json(),
    );

    if (!types.success) {
      throw new Error("Session validation failed");
    }

    return await sendInteractiveMessage(config);
  } catch (error) {
    console.error("Session not ready:", error);
    throw error;
  }
}

/**
 * 12. FALLBACK STRATEGIES
 * ============================================
 */

// Fallback to simpler message type if complex fails
async function sendWithFallback(complexConfig, simpleConfig) {
  try {
    return await sendInteractiveMessage(complexConfig);
  } catch (error) {
    console.warn(
      "Complex message failed, trying simple version:",
      error.message,
    );

    try {
      return await sendInteractiveMessage(simpleConfig);
    } catch (fallbackError) {
      console.error("Fallback also failed:", fallbackError);
      throw fallbackError;
    }
  }
}

/**
 * PERFORMANCE TIPS SUMMARY
 * ============================================
 *
 * 1. Use quick_reply for best performance
 * 2. Keep payloads small
 * 3. Implement retry logic with exponential backoff
 * 4. Use batch operations for multiple messages
 * 5. Cache supported types
 * 6. Implement proper error handling
 * 7. Monitor with structured logging
 * 8. Validate input before sending
 * 9. Use timeouts to prevent hanging
 * 10. Clean up memory after operations
 * 11. Limit concurrent requests
 * 12. Use fallback strategies
 */

export {
  sendWithRetry,
  validateAndSend,
  sendManyMessagesGOOD,
  typeCache,
  sendWithLogging,
  validateBeforeSend,
  sendAndCleanup,
  sendWithTimeout,
  sendBatch,
  sendWithSessionCheck,
  sendWithFallback,
};
