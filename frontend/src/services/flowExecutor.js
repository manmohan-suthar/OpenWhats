// Flow Executor Service
import { authFetch } from "./api.js";

export class FlowExecutor {
  constructor(flow, sessionId) {
    this.flow = flow;
    this.sessionId = sessionId;
    this.isRunning = false;
  }

  // Find node by type
  findNodeByType(type) {
    return this.flow.nodes.find((node) => node.type === type);
  }

  // Get next node
  getNextNode(currentNodeId) {
    const edge = this.flow.edges.find((e) => e.source === currentNodeId);
    if (!edge) return null;
    return this.flow.nodes.find((n) => n.id === edge.target);
  }

  // Check if trigger matches
  checkTrigger(triggerNode, messageContent) {
    const { triggerType, keyword } = triggerNode.data;

    if (triggerType === "message_received") {
      return true; // All messages trigger this
    }

    if (triggerType === "keyword_match") {
      if (!keyword) return false;
      return messageContent.toLowerCase().includes(keyword.toLowerCase());
    }

    return false;
  }

  // Execute send message node
  async executeSendMessage(messageNode, phoneNumber) {
    const { message, delayType, fixedDelay } = messageNode.data;

    if (!message) {
      console.warn("No message content");
      return;
    }

    // Calculate delay
    let delayMs = 0;
    if (delayType === "random") {
      delayMs = Math.random() * 3000 + 3000; // 3-6 seconds
    } else if (delayType === "fixed") {
      delayMs = (fixedDelay || 5) * 1000;
    }

    // Wait for delay
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    // Send message
    try {
      const response = await authFetch("/api/messages/send", {
        method: "POST",
        body: JSON.stringify({
          sessionId: this.sessionId,
          phoneNumber,
          message,
        }),
      });

      if (response.ok) {
        console.log("Message sent successfully");
        return true;
      } else {
        console.error("Failed to send message");
        return false;
      }
    } catch (error) {
      console.error("Error sending message:", error);
      return false;
    }
  }

  // Execute flow
  async executeFlow(phoneNumber, messageContent) {
    if (this.isRunning) {
      console.log("Flow already running");
      return;
    }

    this.isRunning = true;

    try {
      // Find trigger node
      const triggerNode = this.findNodeByType("trigger");
      if (!triggerNode) {
        console.warn("No trigger node found");
        return;
      }

      // Check if trigger matches
      if (!this.checkTrigger(triggerNode, messageContent)) {
        console.log("Trigger condition not met");
        return;
      }

      console.log("Trigger activated, executing flow...");

      // Get next node
      let currentNode = this.getNextNode(triggerNode.id);

      // Execute nodes in sequence
      while (currentNode) {
        console.log("Executing node:", currentNode.type);

        if (currentNode.type === "message") {
          await this.executeSendMessage(currentNode, phoneNumber);
        }

        // Move to next node
        currentNode = this.getNextNode(currentNode.id);
      }

      console.log("Flow execution completed");
    } catch (error) {
      console.error("Error executing flow:", error);
    } finally {
      this.isRunning = false;
    }
  }
}

// Global flow executor instance
let flowExecutor = null;

export const setFlowExecutor = (executor) => {
  flowExecutor = executor;
};

export const getFlowExecutor = () => flowExecutor;
