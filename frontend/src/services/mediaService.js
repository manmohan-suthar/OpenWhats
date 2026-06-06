// API Service for Media Gallery - Frontend
import { API_ORIGIN } from "../config/env";

const API_BASE = `${API_ORIGIN}/api/media`;

// Get auth token from localStorage
const getAuthHeader = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

const handleResponse = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  if (!response.ok) {
    if (!isJson) throw new Error(`API request failed (status ${response.status}). Server may be unreachable.`);
    const error = await response.json();
    throw new Error(error.error || "API request failed");
  }
  if (!isJson) throw new Error(`Server returned non-JSON response (status ${response.status}). API may be unreachable.`);
  return response.json();
};

export const mediaService = {
  // Collection operations
  createCollection: async (name, colorId) => {
    const response = await fetch(API_BASE, {
      method: "POST",
      headers: getAuthHeader(),
      body: JSON.stringify({ name, colorId }),
    });
    return handleResponse(response);
  },

  getCollections: async () => {
    const response = await fetch(API_BASE, {
      method: "GET",
      headers: getAuthHeader(),
    });
    return handleResponse(response);
  },

  getCollection: async (id) => {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: "GET",
      headers: getAuthHeader(),
    });
    return handleResponse(response);
  },

  updateCollection: async (id, name, colorId) => {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: "PUT",
      headers: getAuthHeader(),
      body: JSON.stringify({ name, colorId }),
    });
    return handleResponse(response);
  },

  renameCollection: async (id, name) => {
    const response = await fetch(`${API_BASE}/${id}/rename`, {
      method: "PUT",
      headers: getAuthHeader(),
      body: JSON.stringify({ name }),
    });
    return handleResponse(response);
  },

  deleteCollection: async (id) => {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: "DELETE",
      headers: getAuthHeader(),
    });
    return handleResponse(response);
  },

  // Subcollection operations
  addSubcollection: async (collectionId, name) => {
    const response = await fetch(`${API_BASE}/${collectionId}/subcollections`, {
      method: "POST",
      headers: getAuthHeader(),
      body: JSON.stringify({ name }),
    });
    return handleResponse(response);
  },

  renameSubcollection: async (collectionId, subcollectionId, name) => {
    const response = await fetch(
      `${API_BASE}/${collectionId}/subcollections/${subcollectionId}/rename`,
      {
        method: "PUT",
        headers: getAuthHeader(),
        body: JSON.stringify({ name }),
      },
    );
    return handleResponse(response);
  },

  deleteSubcollection: async (collectionId, subcollectionId) => {
    const response = await fetch(
      `${API_BASE}/${collectionId}/subcollections/${subcollectionId}`,
      {
        method: "DELETE",
        headers: getAuthHeader(),
      },
    );
    return handleResponse(response);
  },

  // Media upload routes
  uploadToCollection: async (collectionId, file) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE}/${collectionId}/media`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: formData,
    });
    return handleResponse(response);
  },

  uploadToSubcollection: async (collectionId, subcollectionId, file) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(
      `${API_BASE}/${collectionId}/subcollections/${subcollectionId}/media`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      },
    );
    return handleResponse(response);
  },

  deleteMediaFromCollection: async (collectionId, mediaId) => {
    const response = await fetch(
      `${API_BASE}/${collectionId}/media/${mediaId}`,
      {
        method: "DELETE",
        headers: getAuthHeader(),
      },
    );
    return handleResponse(response);
  },

  deleteMediaFromSubcollection: async (
    collectionId,
    subcollectionId,
    mediaId,
  ) => {
    const response = await fetch(
      `${API_BASE}/${collectionId}/subcollections/${subcollectionId}/media/${mediaId}`,
      {
        method: "DELETE",
        headers: getAuthHeader(),
      },
    );
    return handleResponse(response);
  },

  deleteMultipleMedia: async (collectionId, subcollectionId, mediaIds) => {
    const response = await fetch(`${API_BASE}/bulk/delete`, {
      method: "POST",
      headers: getAuthHeader(),
      body: JSON.stringify({
        id: collectionId,
        scId: subcollectionId,
        mediaIds,
      }),
    });
    return handleResponse(response);
  },
};
