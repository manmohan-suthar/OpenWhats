/**
 * WhatsApp Message Builder API Service
 * Handles all interactive message operations
 */

import { authFetch } from "./authFetch";

const API_BASE = "/api";

/**
 * Send interactive message to WhatsApp
 */
export async function sendInteractiveMessage(payload) {
  return authFetch(`${API_BASE}/messages/interactive`, {
    method: "POST",
    body: payload,
  });
}

/**
 * Send CTA message using curl-compatible format
 * Endpoint: POST /api/messages/send
 */
export async function sendCTAMessage(payload) {
  return authFetch(`${API_BASE}/messages/send`, {
    method: "POST",
    body: payload,
  });
}

/**
 * Get user's WhatsApp sessions
 */
export async function getWhatsAppSessions() {
  return authFetch(`${API_BASE}/sessions`);
}

/**
 * Get WhatsApp contacts/number lists
 */
export async function getNumberLists() {
  return authFetch(`${API_BASE}/number-lists`);
}

/**
 * Save message template
 */
export async function saveMessageTemplate(template) {
  return authFetch(`${API_BASE}/messages/templates`, {
    method: "POST",
    body: template,
  });
}

/**
 * Get saved message templates
 */
export async function getMessageTemplates() {
  return authFetch(`${API_BASE}/messages/templates`);
}

/**
 * Delete message template
 */
export async function deleteMessageTemplate(templateId) {
  return authFetch(`${API_BASE}/messages/templates/${templateId}`, {
    method: "DELETE",
  });
}

/**
 * Send message to multiple contacts
 */
export async function sendBulkMessage(payload) {
  return authFetch(`${API_BASE}/messages/bulk`, {
    method: "POST",
    body: payload,
  });
}
