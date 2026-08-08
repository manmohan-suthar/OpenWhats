export const API_PERMISSIONS = Object.freeze([
  "manage_sessions",
  "read_chats",
  "send_messages",
  "send_interactive_messages",
  "read_groups",
  "manage_number_lists",
  "manage_flows",
  "manage_ai_agents",
  "read_analytics",
  "manage_webhooks",
  "manage_subscriptions",
]);

export const PARTNER_MANAGED_API_PERMISSIONS = Object.freeze([
  "manage_sessions",
  "read_chats",
  "send_messages",
  "send_interactive_messages",
  "read_groups",
  "manage_number_lists",
  "read_analytics",
  "manage_webhooks",
]);

export const isValidApiPermission = (permission) =>
  permission === "*" || API_PERMISSIONS.includes(permission);
