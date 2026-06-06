const API_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

const getToken = () => localStorage.getItem("token");

const headers = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

async function parseResponse(res) {
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      `Server returned non-JSON response (status ${res.status}). API may be unreachable.`,
    );
  }
  const data = await res.json();
  return data;
}

export const authFetch = async (endpoint, options = {}) => {
  const token = getToken();
  const defaultHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  return response;
};

export const api = {
  async register(email, password, name, extras = {}) {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name, ...extras }),
    });
    return parseResponse(res);
  },

  async login(email, password) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return parseResponse(res);
  },

  async googleLogin(idToken) {
    const res = await fetch(`${API_URL}/auth/google-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    return parseResponse(res);
  },

  async getMe() {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: headers(),
    });
    return parseResponse(res);
  },

  async updatePassword(idToken, newPassword) {
    const res = await fetch(`${API_URL}/auth/update-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, newPassword }),
    });
    return parseResponse(res);
  },

  async createSession(name, options = {}) {
    const { enableChatView = false, chatPasscode = "" } = options;
    const res = await fetch(`${API_URL}/sessions/create`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        name,
        enableChatView,
        chatPasscode,
      }),
    });
    return parseResponse(res);
  },

  async getSessions() {
    const res = await fetch(`${API_URL}/sessions`, {
      headers: headers(),
    });
    return parseResponse(res);
  },

  async getSession(id) {
    const res = await fetch(`${API_URL}/sessions/${id}`, {
      headers: headers(),
    });
    return parseResponse(res);
  },

  async getSessionQR(id) {
    const res = await fetch(`${API_URL}/sessions/${id}/qr`, {
      headers: headers(),
    });
    return parseResponse(res);
  },

  async reconnectSession(id) {
    const res = await fetch(`${API_URL}/sessions/${id}/reconnect`, {
      method: "POST",
      headers: headers(),
    });
    return parseResponse(res);
  },

  async deleteSession(id) {
    const res = await fetch(`${API_URL}/sessions/${id}`, {
      method: "DELETE",
      headers: headers(),
    });
    return parseResponse(res);
  },

  async getSessionMessages(id, limit = 50, offset = 0) {
    const res = await fetch(
      `${API_URL}/sessions/${id}/messages?limit=${limit}&offset=${offset}`,
      {
        headers: headers(),
      },
    );
    return parseResponse(res);
  },

  async sendMessage(
    sessionId,
    phoneNumber,
    message,
    contactName = "",
    mediaData = null,
  ) {
    const payload =
      sessionId && typeof sessionId === "object"
        ? { ...sessionId }
        : {
            sessionId,
            phoneNumber,
            message,
            contactName,
          };

    // Add media if provided
    if (mediaData && !(sessionId && typeof sessionId === "object")) {
      payload.mediaBase64 = mediaData.base64;
      payload.mediaType = mediaData.type;
      payload.mediaName = mediaData.name;
    }

    const res = await fetch(`${API_URL}/messages/send`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(payload),
    });
    return parseResponse(res);
  },

  async getApiHelp() {
    const res = await fetch(`${API_URL}/help`, {
      headers: headers(),
    });
    return parseResponse(res);
  },

  async updateMessageStatus(messageId, status) {
    const res = await fetch(`${API_URL}/messages/status/${messageId}`, {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify({ messageId, status }),
    });
    return parseResponse(res);
  },

  async createCampaign(sessionId, name, message, numbers, delaySeconds = 10) {
    const res = await fetch(`${API_URL}/campaigns/create`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ sessionId, name, message, numbers, delaySeconds }),
    });
    return parseResponse(res);
  },

  async getCampaigns() {
    const res = await fetch(`${API_URL}/campaigns`, {
      headers: headers(),
    });
    return parseResponse(res);
  },

  async getCampaign(id) {
    const res = await fetch(`${API_URL}/campaigns/${id}`, {
      headers: headers(),
    });
    return parseResponse(res);
  },

  async startCampaign(id) {
    const res = await fetch(`${API_URL}/campaigns/${id}/start`, {
      method: "POST",
      headers: headers(),
    });
    return parseResponse(res);
  },

  async cancelCampaign(id) {
    const res = await fetch(`${API_URL}/campaigns/${id}/cancel`, {
      method: "POST",
      headers: headers(),
    });
    return parseResponse(res);
  },

  async getNumberList(id) {
    const res = await fetch(`${API_URL}/number-lists/${id}`, {
      headers: headers(),
    });
    return parseResponse(res);
  },

  async getNumberLists() {
    const res = await fetch(`${API_URL}/number-lists`, { headers: headers() });
    return parseResponse(res);
  },

  async createNumberList(data) {
    const res = await fetch(`${API_URL}/number-lists`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(data),
    });
    return parseResponse(res);
  },

  async updateNumberList(id, data) {
    const res = await fetch(`${API_URL}/number-lists/${id}`, {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify(data),
    });
    return parseResponse(res);
  },

  async deleteNumberList(id) {
    const res = await fetch(`${API_URL}/number-lists/${id}`, {
      method: "DELETE",
      headers: headers(),
    });
    return parseResponse(res);
  },

  async duplicateNumberList(id) {
    const res = await fetch(`${API_URL}/number-lists/${id}/duplicate`, {
      method: "POST",
      headers: headers(),
    });
    return parseResponse(res);
  },

  async mergeNumberLists(data) {
    const res = await fetch(`${API_URL}/number-lists/merge`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(data),
    });
    return parseResponse(res);
  },

  async filterNumberList(id, data) {
    const res = await fetch(`${API_URL}/number-lists/${id}/filter`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(data),
    });
    return parseResponse(res);
  },

  async getMySubscription() {
    const res = await fetch(`${API_URL}/subscriptions/me`, {
      headers: headers(),
    });
    return parseResponse(res);
  },

  async getAvailableSubscriptionPlans() {
    const res = await fetch(`${API_URL}/subscriptions/plans`, {
      headers: headers(),
    });
    return parseResponse(res);
  },

  async switchSubscriptionPlan(planId) {
    const res = await fetch(`${API_URL}/subscriptions/switch`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ planId }),
    });
    return parseResponse(res);
  },

  async getAdminSubscriptionPlans() {
    const res = await fetch(`${API_URL}/subscriptions/admin/plans`, {
      headers: headers(),
    });
    return parseResponse(res);
  },

  async createAdminSubscriptionPlan(payload) {
    const res = await fetch(`${API_URL}/subscriptions/admin/plans`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(payload),
    });
    return parseResponse(res);
  },

  async updateAdminSubscriptionPlan(id, payload) {
    const res = await fetch(`${API_URL}/subscriptions/admin/plans/${id}`, {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify(payload),
    });
    return parseResponse(res);
  },

  async deleteAdminSubscriptionPlan(id) {
    const res = await fetch(`${API_URL}/subscriptions/admin/plans/${id}`, {
      method: "DELETE",
      headers: headers(),
    });
    return parseResponse(res);
  },

  async getAdminSubscriptionSettings() {
    const res = await fetch(`${API_URL}/subscriptions/admin/settings`, {
      headers: headers(),
    });
    return parseResponse(res);
  },

  async updateAdminSubscriptionSettings(payload) {
    const res = await fetch(`${API_URL}/subscriptions/admin/settings`, {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify(payload),
    });
    return parseResponse(res);
  },

  async getAdminUsersSubscriptionUsage() {
    const res = await fetch(`${API_URL}/subscriptions/admin/users-usage`, {
      headers: headers(),
    });
    return parseResponse(res);
  },

  async assignPlanToUser(userId, planId, durationDays) {
    const res = await fetch(`${API_URL}/subscriptions/admin/assign`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ userId, planId, durationDays }),
    });
    return parseResponse(res);
  },

  async getMediaLimits() {
    const res = await fetch(`${API_URL}/settings/media-limits`, {
      headers: headers(),
    });
    return parseResponse(res);
  },

  async getAdminMediaSettings() {
    const res = await fetch(`${API_URL}/admin/media-settings`, {
      headers: headers(),
    });
    return parseResponse(res);
  },

  async updateAdminMediaSettings(payload) {
    const res = await fetch(`${API_URL}/admin/media-settings`, {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify(payload),
    });
    return parseResponse(res);
  },

  async getAdminOpenRouterSettings() {
    const res = await fetch(`${API_URL}/admin/openrouter-settings`, {
      headers: headers(),
    });
    return parseResponse(res);
  },

  async updateAdminOpenRouterSettings(payload) {
    const res = await fetch(`${API_URL}/admin/openrouter-settings`, {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify(payload),
    });
    return parseResponse(res);
  },

  async getAdminMetaSettings() {
    const res = await fetch(`${API_URL}/admin/meta-settings`, {
      headers: headers(),
    });
    return parseResponse(res);
  },

  async updateAdminMetaSettings(payload) {
    const res = await fetch(`${API_URL}/admin/meta-settings`, {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify(payload),
    });
    return parseResponse(res);
  },
};

export default api;
