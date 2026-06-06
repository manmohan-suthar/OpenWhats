import { useState, useEffect } from "react";
import api from "../services/api";
import socketService from "../services/socket";

export default function Dashboard() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sessionName, setSessionName] = useState("");
  const [newSession, setNewSession] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [sessionStatus, setSessionStatus] = useState(null);
  const [showSendMessage, setShowSendMessage] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [messageForm, setMessageForm] = useState({
    phoneNumber: "",
    message: "",
  });
  const [messageStatus, setMessageStatus] = useState("");

  useEffect(() => {
    loadSessions();
    socketService.connect();

    socketService.on("connect", () => {
      console.log("Socket connected to backend");
    });

    return () => {
      socketService.off("connect");
      socketService.disconnect();
    };
  }, []);

  const loadSessions = async () => {
    try {
      const result = await api.getSessions();
      setSessions(Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      console.error("Failed to load sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async () => {
    const name = sessionName.trim();
    if (!name) {
      alert("Please enter a session name");
      return;
    }

    try {
      const result = await api.createSession(name);
      console.log("Create session result:", result);
      if (result.sessionId) {
        setNewSession(result);
        setSessions((prev) => [result, ...prev]);

        socketService.joinSession(result.sessionId);
        console.log("Joined session room:", result.sessionId);

        socketService.off("qrcode");
        socketService.off("status");

        socketService.on("qrcode", (data) => {
          if (data.sessionId !== result.sessionId) return;
          console.log("QR code received:", data);
          setQrCode(data.qr);
        });

        socketService.on("status", (data) => {
          if (data.sessionId !== result.sessionId) return;
          console.log("Status received:", data);
          setSessionStatus(data.status);
          if (data.status === "connected") {
            loadSessions();
            setTimeout(() => {
              setShowCreateModal(false);
              setNewSession(null);
              setQrCode(null);
            }, 2000);
          }
        });
      }
    } catch (err) {
      console.error("Failed to create session:", err);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (!confirm("Delete this session?")) return;

    try {
      await api.deleteSession(sessionId);
      setSessions(sessions.filter((s) => s.sessionId !== sessionId));
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    setMessageStatus("sending");

    try {
      const result = await api.sendMessage(
        selectedSession.sessionId,
        messageForm.phoneNumber,
        messageForm.message,
      );

      if (result.success) {
        setMessageStatus("success");
        setMessageForm({ phoneNumber: "", message: "" });
        setTimeout(() => {
          setShowSendMessage(false);
          setMessageStatus("");
        }, 1500);
      } else {
        setMessageStatus("error");
      }
    } catch (err) {
      setMessageStatus("error");
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      connected: { bg: "#4caf50", text: "#fff" },
      connecting: { bg: "#ff9800", text: "#fff" },
      pending: { bg: "#ff9800", text: "#fff" },
      disconnected: { bg: "#f44336", text: "#fff" },
      qr: { bg: "#2196f3", text: "#fff" },
    };
    const color = colors[status] || { bg: "#999", text: "#fff" };
    return (
      <span
        style={{ ...styles.badge, background: color.bg, color: color.text }}
      >
        {status}
      </span>
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>WhatsApp Sessions</h1>
        <button
          onClick={() => {
            setSessionName("");
            setShowCreateModal(true);
          }}
          style={styles.primaryButton}
        >
          + New Session
        </button>
      </div>

      {loading ? (
        <p style={styles.loading}>Loading...</p>
      ) : sessions.length === 0 ? (
        <div style={styles.empty}>
          <p>No sessions yet. Create one to get started.</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {sessions.map((session) => (
            <div key={session.sessionId} style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <h3 style={styles.cardTitle}>{session.name}</h3>
                  <p style={styles.cardSubtitle}>
                    {session.phoneNumber || "Awaiting connection…"}
                  </p>
                  <p style={styles.cardTime}>
                    Created:{" "}
                    {new Date(session.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}{" "}
                    at{" "}
                    {new Date(session.createdAt).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </p>
                </div>
                {getStatusBadge(session.status)}
              </div>
              <div style={styles.cardActions}>
                {session.status === "connected" && (
                  <>
                    <button
                      onClick={() => {
                        setSelectedSession(session);
                        setShowSendMessage(true);
                      }}
                      style={styles.actionButton}
                    >
                      Send Message
                    </button>
                    <button
                      onClick={() => handleDeleteSession(session.sessionId)}
                      style={styles.deleteButton}
                    >
                      Delete
                    </button>
                  </>
                )}
                {session.status !== "connected" && (
                  <button
                    onClick={() => handleDeleteSession(session.sessionId)}
                    style={styles.deleteButton}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h2 style={styles.modalTitle}>Create Session</h2>

            {!newSession ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCreateSession();
                }}
              >
                <input
                  type="text"
                  placeholder="Session name"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  style={styles.input}
                  required
                />
                <button type="submit" style={styles.primaryButton}>
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
              </form>
            ) : (
              <div style={styles.qrContainer}>
                <p style={styles.text}>Scan QR with WhatsApp</p>
                {qrCode ? (
                  <img src={qrCode} alt="QR Code" style={styles.qr} />
                ) : (
                  <div style={styles.qrLoading}>
                    {sessionStatus === "connecting" || sessionStatus === "qr"
                      ? "Generating QR..."
                      : "Connecting..."}
                  </div>
                )}
                <p style={styles.status}>
                  Status: {sessionStatus || "pending"}{" "}
                  {sessionStatus === "connected" && "✓"}
                </p>
                <button
                  onClick={() => {
                    socketService.off("qrcode");
                    socketService.off("status");
                    setShowCreateModal(false);
                    setNewSession(null);
                    setQrCode(null);
                    setSessionName("");
                  }}
                  style={styles.cancelButton}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showSendMessage && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h2 style={styles.modalTitle}>Send Message</h2>
            <p style={styles.text}>Session: {selectedSession?.name}</p>

            <form onSubmit={handleSendMessage} style={styles.form}>
              <input
                type="text"
                placeholder="Phone number (with country code)"
                value={messageForm.phoneNumber}
                onChange={(e) =>
                  setMessageForm({
                    ...messageForm,
                    phoneNumber: e.target.value,
                  })
                }
                style={styles.input}
                required
              />
              <textarea
                placeholder="Message"
                value={messageForm.message}
                onChange={(e) =>
                  setMessageForm({ ...messageForm, message: e.target.value })
                }
                style={styles.textarea}
                required
              />

              {messageStatus === "success" && (
                <p style={styles.success}>Message sent!</p>
              )}
              {messageStatus === "error" && (
                <p style={styles.error}>Failed to send message</p>
              )}

              <button
                type="submit"
                style={styles.primaryButton}
                disabled={messageStatus === "sending"}
              >
                {messageStatus === "sending" ? "Sending..." : "Send"}
              </button>
              <button
                onClick={() => {
                  setShowSendMessage(false);
                  setMessageStatus("");
                }}
                style={styles.cancelButton}
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "20px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },
  title: {
    fontSize: "24px",
    fontWeight: "600",
  },
  primaryButton: {
    background: "#075e54",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "10px 20px",
    fontSize: "14px",
    cursor: "pointer",
  },
  cancelButton: {
    background: "transparent",
    color: "#666",
    border: "1px solid #ddd",
    borderRadius: "6px",
    padding: "10px 20px",
    fontSize: "14px",
    cursor: "pointer",
    marginLeft: "10px",
  },
  loading: {
    textAlign: "center",
    color: "#666",
    padding: "40px",
  },
  empty: {
    textAlign: "center",
    padding: "40px",
    background: "#fff",
    borderRadius: "8px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: "20px",
  },
  card: {
    background: "#fff",
    borderRadius: "8px",
    padding: "20px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "12px",
    gap: "12px",
  },
  cardTitle: {
    fontSize: "16px",
    fontWeight: "600",
    margin: "0 0 4px 0",
  },
  cardSubtitle: {
    fontSize: "13px",
    color: "#666",
    margin: "0 0 8px 0",
  },
  cardTime: {
    fontSize: "11px",
    color: "#999",
    margin: "0",
  },
  cardText: {
    color: "#666",
    fontSize: "14px",
    marginBottom: "16px",
  },
  cardActions: {
    display: "flex",
    gap: "10px",
  },
  actionButton: {
    background: "#f5f6f8",
    color: "#333",
    border: "none",
    borderRadius: "4px",
    padding: "8px 16px",
    fontSize: "13px",
    cursor: "pointer",
  },
  deleteButton: {
    background: "#f44336",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    padding: "8px 16px",
    fontSize: "13px",
    cursor: "pointer",
  },
  badge: {
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "12px",
    textTransform: "capitalize",
  },
  modal: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    background: "#fff",
    borderRadius: "8px",
    padding: "24px",
    width: "100%",
    maxWidth: "400px",
  },
  modalTitle: {
    fontSize: "20px",
    fontWeight: "600",
    marginBottom: "20px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  input: {
    padding: "12px",
    borderRadius: "6px",
    border: "1px solid #ddd",
    fontSize: "14px",
  },
  textarea: {
    padding: "12px",
    borderRadius: "6px",
    border: "1px solid #ddd",
    fontSize: "14px",
    minHeight: "100px",
    resize: "vertical",
  },
  qrContainer: {
    textAlign: "center",
  },
  qr: {
    width: "200px",
    height: "200px",
    margin: "20px auto",
    display: "block",
  },
  qrLoading: {
    width: "200px",
    height: "200px",
    margin: "20px auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f5f5f5",
    borderRadius: "8px",
  },
  text: {
    color: "#666",
    fontSize: "14px",
  },
  status: {
    marginTop: "12px",
    fontSize: "14px",
  },
  success: {
    color: "#4caf50",
    fontSize: "14px",
    textAlign: "center",
  },
  error: {
    color: "#f44336",
    fontSize: "14px",
    textAlign: "center",
  },
};
