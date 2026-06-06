import { io } from "socket.io-client";
import { API_ORIGIN } from "../config/env";

const SOCKET_URL = API_ORIGIN;

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect() {
    if (this.socket?.connected) return;

    this.socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
    });

    // Re-attach any listeners registered before socket was created
    this.listeners.forEach((callback, event) => {
      this.socket.on(event, callback);
    });

    this.socket.on("connect", () => {
      console.log("Socket connected");
    });

    this.socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    this.socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinSession(sessionId) {
    if (this.socket?.connected) {
      this.socket.emit("join:session", { sessionId });
      console.log("Emitted join:session for:", sessionId);
    } else {
      console.log("Socket not connected, waiting...");
      this.socket?.once("connect", () => {
        this.socket.emit("join:session", { sessionId });
        console.log("Emitted join:session after connect for:", sessionId);
      });
    }
  }

  on(event, callback) {
    this.listeners.set(event, callback);
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event) {
    if (this.socket) {
      this.socket.off(event, this.listeners.get(event));
    }
    this.listeners.delete(event);
  }
}

export default new SocketService();
