/**
 * ============================================================================
 * SESSIONS.JSX ENHANCEMENTS - REAL-TIME SYNC
 * ============================================================================
 *
 * Add these hooks and effects to your frontend/src/pages/Sessions.jsx
 *
 */

// ADD THESE IMPORTS at the top of Sessions.jsx
import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { API_ORIGIN } from "../../config/env";

// ============================================================================
// ADD THIS EFFECT TO THE MAIN SESSIONS COMPONENT
// ============================================================================

/**
 * Call this hook inside the Sessions component:
 *
 * Add after the existing loadSessions() useEffect
 */

useEffect(() => {
  if (!isAuthenticated) return;

  // ────────────────────────────────────────────────────────────────────
  // PART 1: SOCKET.IO SETUP & USER REGISTRATION
  // ────────────────────────────────────────────────────────────────────

  let socket = null;
  let pollingInterval = null;

  const setupRealTimeSync = async () => {
    try {
      // Get user ID (you'll need to store this in AuthContext or get from token)
      const userIdFromToken = parseJwt(localStorage.getItem("token"))?.userId;

      if (!userIdFromToken) {
        console.warn("User ID not found, skipping real-time sync");
        return;
      }

      // Connect socket with token auth
      socket = io(API_ORIGIN, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 10,
        query: { token: localStorage.getItem("token") },
      });

      socket.on("connect", () => {
        console.log("✅ Socket connected:", socket.id);

        // Register user for real-time updates
        socket.emit("register:user", { userId: userIdFromToken });
      });

      socket.on("user:registered", (data) => {
        console.log("✅ User registered for real-time updates:", data);
      });

      // ────────────────────────────────────────────────────────────────
      // PART 2: LISTEN FOR SESSION UPDATES
      // ────────────────────────────────────────────────────────────────

      socket.on("session:update", (update) => {
        console.log("📨 Received session:update:", update);

        setSessions((prevSessions) => {
          const sessionIndex = prevSessions.findIndex(
            (s) => s.sessionId === update.sessionId,
          );

          if (sessionIndex >= 0) {
            // Session exists - update it
            const updated = [...prevSessions];
            updated[sessionIndex] = {
              ...updated[sessionIndex],
              status: update.status,
              phoneNumber:
                update.phoneNumber || updated[sessionIndex].phoneNumber,
              lastConnected: update.lastConnected,
            };
            return updated;
          } else {
            // New session - add it
            return [...prevSessions, update];
          }
        });
      });

      // Fallback: QR modal status updates (backward compat)
      socket.on("status", (data) => {
        if (data.sessionId && data.status === "connected") {
          console.log(`✅ Session ${data.sessionId} connected`);
          loadSessions(); // Reload to be safe
        }
      });

      socket.on("disconnect", () => {
        console.warn("🔌 Socket disconnected, starting fallback polling");
        // Fallback polling starts automatically
      });

      socket.on("error", (error) => {
        console.error("Socket error:", error);
      });
    } catch (err) {
      console.error("Real-time sync setup failed:", err);
    }
  };

  // ────────────────────────────────────────────────────────────────────
  // PART 3: POLLING FALLBACK (if socket fails)
  // ────────────────────────────────────────────────────────────────────

  const startPollingFallback = () => {
    if (pollingInterval) clearInterval(pollingInterval);

    pollingInterval = setInterval(async () => {
      try {
        // Only poll if socket is not connected
        if (socket && socket.connected) {
          return; // Socket is live, don't poll
        }

        const data = await api.getSessions();
        if (data.success === false) {
          console.warn("Polling: Failed to load sessions", data.error);
          return;
        }

        const newSessions = Array.isArray(data.data) ? data.data : [];

        setSessions((prev) => {
          // Check if anything changed
          const hasChanges = newSessions.some((newSession) => {
            const oldSession = prev.find(
              (s) => s.sessionId === newSession.sessionId,
            );
            return (
              !oldSession ||
              oldSession.status !== newSession.status ||
              oldSession.lastConnected !== newSession.lastConnected
            );
          });

          if (hasChanges) {
            console.log("🔄 Polling: Session changes detected, updating...");
            return newSessions;
          }
          return prev;
        });
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 15_000); // Poll every 15 seconds
  };

  // ────────────────────────────────────────────────────────────────────
  // PART 4: INITIALIZATION & CLEANUP
  // ────────────────────────────────────────────────────────────────────

  setupRealTimeSync();
  startPollingFallback();

  return () => {
    // Cleanup on unmount
    if (socket) {
      socket.disconnect();
    }
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
  };
}, [isAuthenticated]);

// ============================================================================
// HELPER: JWT Parser
// ============================================================================

/**
 * Add this function before your component definition
 */

function parseJwt(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join(""),
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.error("Failed to parse JWT:", err);
    return null;
  }
}

// ============================================================================
// UPDATE QR MODAL COMPONENT (backward compat)
// ============================================================================

/**
 * In your QrModal component, when it receives a "connected" status,
 * also reload sessions to ensure DB is synced:
 *
 * socket.on("status", (data) => {
 *   if (data.status === "connected") {
 *     setStep("success");
 *     // Trigger parent to reload sessions
 *     onConnect();
 *   }
 * });
 */

// ============================================================================
// EXPECTED SOCKET EVENTS
// ============================================================================

/*
Frontend emits:
- "register:user" {userId} → Register for real-time updates
- "join:session" {sessionId} → Join specific session room (for QR)
- "ping" → Keepalive ping

Frontend receives:
- "session:update" {sessionId, status, phoneNumber, lastConnected, lastUpdated}
  → Session state changed in real-time
  
- "qrcode" {sessionId, qr}
  → New QR code available
  
- "status" {sessionId, status}
  → Status change (backward compat)
  
- "user:registered" {userId, timestamp}
  → Confirmation of registration
  
- "pong" {timestamp}
  → Response to keepalive ping
*/

console.log("✅ Sessions.jsx real-time enhancements - add these hooks");
