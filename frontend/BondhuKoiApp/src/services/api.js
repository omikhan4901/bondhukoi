import AsyncStorage from "@react-native-async-storage/async-storage";
import { decode } from "base64-arraybuffer";
// Configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

/**
 * Make an API request with automatic token handling
 * @param {string} endpoint - API endpoint (e.g., '/api/auth/login')
 * @param {string} method - HTTP method (GET, POST, PATCH, DELETE)
 * @param {object} body - Request body for POST/PATCH requests
 * @returns {Promise} - Parsed response
 */
export const apiCall = async (endpoint, method = "GET", body = null, retryCount = 0) => {
  try {
    // Get token from storage
    const token = await AsyncStorage.getItem("authToken");

    if (__DEV__) console.log(`[API] ${method} ${endpoint} - Token: ${token ? 'YES' : 'NO'}`);
    if (__DEV__ && body) {
      console.log(`[API] Request body:`, body);
    }

    // Build headers - only set Content-Type if there's a body
    const headers = {};

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Build request config
    const config = {
      method,
      headers,
    };

    if (body) {
      headers["Content-Type"] = "application/json";
      config.body = JSON.stringify(body);
    }

    if (__DEV__) console.log(`[API] Final headers:`, headers);

    // Make request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...config,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (__DEV__) console.log(`[API] Response status: ${response.status}`);

    const data = await response.json();

    if (__DEV__) console.log(`[API] Response data:`, data);

    // Handle errors
    if (!response.ok) {
      // If we get a 401 and we have a refresh token (and haven't retried too many times)
      if (response.status === 401 && endpoint !== "/api/auth/login" && endpoint !== "/api/auth/refresh" && retryCount < 2) {
        try {
          if (__DEV__) console.log(`[API] Attempting token refresh (Retry ${retryCount + 1})`);
          const newToken = await authService.refreshAccessToken();
          if (newToken) {
            // Retry the original request with new token and incremented retry count
            return apiCall(endpoint, method, body, retryCount + 1);
          }
        } catch (refreshErr) {
          console.error("[API] Automatic refresh failed:", refreshErr);
          // Fall through to normal error handling
        }
      }

      const error = new Error(data.message || data.error || "API Error");
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    console.error(`API Error [${method} ${endpoint}]:`, error);
    if (error.name === "AbortError") {
      throw new Error("Request timeout - took too long to respond");
    }
    throw error;
  }
};

/**
 * Authentication Service
 */
export const authService = {
  /**
   * Sign up a new user
   */
  signup: async (
    name,
    email,
    password,
    university,
    facebook = null,
    instagram = null,
  ) => {
    const data = await apiCall("/api/auth/signup", "POST", {
      name,
      email,
      password,
      university,
      facebook,
      instagram,
    });

    if (data.token) {
      await AsyncStorage.setItem("authToken", data.token);
    }
    if (data.refreshToken) {
      await AsyncStorage.setItem("refreshToken", data.refreshToken);
    }

    return data;
  },

  /**
   * Log in with email and password
   */
  login: async (email, password) => {
    const data = await apiCall("/api/auth/login", "POST", {
      email,
      password,
    });
    
    if (data.token) {
      await AsyncStorage.setItem("authToken", data.token);
    }
    if (data.refreshToken) {
      await AsyncStorage.setItem("refreshToken", data.refreshToken);
    }
    
    return data;
  },

  /**
   * Refresh the access token
   */
  refreshAccessToken: async () => {
    try {
      const refreshToken = await AsyncStorage.getItem("refreshToken");
      if (!refreshToken) throw new Error("No refresh token available");

      const data = await apiCall("/api/auth/refresh", "POST", { refreshToken });
      
      if (data.token) {
        await AsyncStorage.setItem("authToken", data.token);
      }
      if (data.refreshToken) {
        await AsyncStorage.setItem("refreshToken", data.refreshToken);
      }
      
      return data.token;
    } catch (err) {
      // If refresh fails, clear everything and force logout
      await AsyncStorage.multiRemove(["authToken", "refreshToken"]);
      throw err;
    }
  },

  /**
   * Verify current token validity
   */
  verify: async () => {
    return apiCall("/api/auth/verify", "GET");
  },



  /**
   * Log out the current user (clears refresh token on backend)
   */
  logout: async (refreshToken = null) => {
    try {
      if (refreshToken) {
        // Notify backend to clear refresh token
        await apiCall("/api/auth/logout", "POST", { refreshToken });
      }
    } catch (err) {
      // Even if logout fails, we still clear local tokens
      console.error("[API] Logout API call failed:", err);
    }
    // Always clear local tokens
    await AsyncStorage.multiRemove(["authToken", "refreshToken"]);
  },
};

/**
 * User Service
 */
export const userService = {
  /**
   * Get current logged-in user
   */
  getCurrentUser: async () => {
    return apiCall("/api/users/me", "GET");
  },

  /**
   * Update user profile
   */
  updateProfile: async (name = null, facebook = null, instagram = null) => {
    return apiCall("/api/users/me", "PATCH", {
      name,
      facebook,
      instagram,
    });
  },

  /**
   * Toggle location sharing
   */
  toggleSharing: async (isEnabled) => {
    return apiCall("/api/users/me/sharing", "PATCH", {
      enabled: isEnabled,
    });
  },

  /**
   * Search for users
   */
  searchUsers: async (query) => {
    return apiCall(`/api/users/search/${encodeURIComponent(query)}`, "GET");
  },

  /**
   * Get user by ID
   */
  getUserById: async (userId) => {
    return apiCall(`/api/users/${userId}`, "GET");
  },

  /**
   * Update privacy preferences (ghostMode, autoDeleteHistory, trackUniversity)
   */
  updatePreferences: async (autoDeleteHistory, allowEveningPings, trackUniversity) => {
    return apiCall("/api/users/me/preferences", "PATCH", {
      autoDeleteHistory,
      allowEveningPings,
      trackUniversity,
    });
  },

  /**
   * Delete current user account permanently
   */
  deleteAccount: async () => {
    const res = await apiCall("/api/users/me", "DELETE");
    await AsyncStorage.multiRemove(["authToken", "refreshToken"]);
    return res;
  },

  /**
   * Upload profile avatar (base64 encoded image)
   * @param {string} imageBase64 - base64 encoded image
   * @param {string} mimeType - e.g. 'image/jpeg' or 'image/png'
   */
  uploadAvatar: async (imageBase64, mimeType = "image/jpeg") => {
    return apiCall("/api/users/me/avatar", "POST", { imageBase64, mimeType });
  },
};

/**
 * Circle Service
 */
export const circleService = {
  /**
   * Create a new circle
   */
  createCircle: async (
    name,
    description = "",
    type = "university",
    locationId = null,
    isOpen = false,
    inviteeIds = [],
    boundary = null,
    snapshotBase64 = null,
  ) => {
    return apiCall("/api/circles", "POST", {
      name,
      description,
      type,
      locationId,
      isOpen,
      inviteeIds,
      boundary,
      snapshotBase64,
    });
  },

  /**
   * Get university circles for the user's campus
   */
  getUniversityCircles: async () => {
    return apiCall("/api/circles/university", "GET");
  },

  /**
   * Get all circles for current user
   */
  getCircles: async () => {
    return apiCall("/api/circles", "GET");
  },

  /**
   * Get circle details by ID
   */
  getCircleById: async (circleId) => {
    return apiCall(`/api/circles/${circleId}`, "GET");
  },

  /**
   * Update circle
   */
  updateCircle: async (
    circleId,
    name = null,
    description = null,
    isOpen = null,
  ) => {
    return apiCall(`/api/circles/${circleId}`, "PATCH", {
      name,
      description,
      isOpen,
    });
  },

  /**
   * Delete circle
   */
  deleteCircle: async (circleId) => {
    return apiCall(`/api/circles/${circleId}`, "DELETE");
  },

  /**
   * Add member to circle
   */
  addMember: async (circleId, userId) => {
    return apiCall(`/api/circles/${circleId}/members`, "POST", {
      userId,
    });
  },

  /**
   * Remove member from circle
   */
  removeMember: async (circleId, userId) => {
    return apiCall(`/api/circles/${circleId}/members/${userId}`, "DELETE");
  },

  /**
   * Get circle members
   */
  getCircleMembers: async (circleId) => {
    return apiCall(`/api/circles/${circleId}/members`, "GET");
  },

  /**
   * Update messenger link for a circle
   */
  updateMessengerLink: async (circleId, messengerLink) => {
    return apiCall(`/api/circles/${circleId}`, "PATCH", { messengerLink });
  },

  /**
   * Update location label for a circle
   */
  updateLocationLabel: async (circleId, locationLabel) => {
    return apiCall(`/api/circles/${circleId}`, "PATCH", { locationLabel });
  },

  /**
   * Update open invite setting for a circle
   */
  updateOpenInvite: async (circleId, isOpen) => {
    return apiCall(`/api/circles/${circleId}`, "PATCH", { isOpen });
  },

  /**
   * Update a member's role in a circle
   */
  updateMemberRole: async (circleId, userId, role) => {
    return apiCall(`/api/circles/${circleId}/members/${userId}/role`, "PATCH", {
      role,
    });
  },

  /**
   * Update current user's privacy settings for a circle (ghosting, detection)
   */
  updateMemberPrivacy: async (circleId, { isGhosted, detectionEnabled }) => {
    const body = {};
    if (isGhosted !== undefined) body.isGhosted = isGhosted;
    if (detectionEnabled !== undefined) body.detectionEnabled = detectionEnabled;
    return apiCall(`/api/circles/${circleId}/members/me/privacy`, "PATCH", body);
  },

  /**
   * Get pending invitations
   */
  getInvitations: async () => {
    return apiCall("/api/circles/invitations", "GET");
  },


  /**
   * Accept an invitation
   */
  acceptInvitation: async (circleId) => {
    return apiCall(`/api/circles/${circleId}/accept`, "POST");
  },

  /**
   * Reject an invitation
   */
  rejectInvitation: async (circleId) => {
    return apiCall(`/api/circles/${circleId}/reject`, "POST");
  },
};

/**
 * Friend Service
 */
export const friendService = {
  /**
   * Send friend request by email or friend code
   */
  sendRequest: async (emailOrCode) => {
    // Determine if input is email or friend code
    const isEmail = emailOrCode.includes("@");

    return apiCall(
      "/api/friends/requests",
      "POST",
      isEmail ? { friendEmail: emailOrCode } : { friendCode: emailOrCode },
    );
  },

  /**
   * Get pending friend requests
   */
  getPendingRequests: async () => {
    return apiCall("/api/friends/requests/pending", "GET");
  },

  /**
   * Accept friend request
   */
  acceptRequest: async (requestId) => {
    return apiCall(`/api/friends/requests/${requestId}/accept`, "PATCH", {});
  },

  /**
   * Reject friend request
   */
  rejectRequest: async (requestId) => {
    return apiCall(`/api/friends/requests/${requestId}`, "DELETE");
  },

  /**
   * Get friends list with optional pagination
   */
  getFriendsList: async (limit = 50, offset = 0) => {
    return apiCall(`/api/friends/list?limit=${limit}&offset=${offset}`, "GET");
  },

  /**
   * Unfriend a friend
   */
  unfriend: async (friendId) => {
    return apiCall(`/api/friends/${friendId}`, "DELETE");
  },

  /**
   * Send watch request (priority alerts)
   */
  sendWatchRequest: async (friendEmail, scope = "campus") => {
    return apiCall("/api/friends/watch", "POST", {
      friendEmail,
      scope,
    });
  },

  /**
   * Accept watch request
   */
  acceptWatchRequest: async (watchId) => {
    return apiCall(`/api/friends/watch/${watchId}/accept`, "PATCH", {});
  },

  /**
   * Remove watch
   */
  removeWatch: async (watchId) => {
    return apiCall(`/api/friends/watch/${watchId}`, "DELETE");
  },

  /**
   * Get watched friends list
   */
  getWatchedFriends: async () => {
    return apiCall("/api/friends/watch/list", "GET");
  },
};

/**
 * Notification Service
 */
export const notificationService = {
  /**
   * Get notifications feed with cursor-based pagination
   */
  getNotifications: async (limit = 20, lastTimestamp = null) => {
    let url = `/api/users/notifications/feed?limit=${limit}`;
    if (lastTimestamp) url += `&lastTimestamp=${encodeURIComponent(lastTimestamp)}`;
    return apiCall(url, "GET");
  },
};

/**
 * Location Service — boundary checks, geofence data, admin
 */
export const locationService = {
  /** Send coordinates for server-side PIP check (coords never stored) */
  checkLocation: async (lat, lng) =>
    apiCall("/api/locations/check", "POST", { lat, lng }),

  /** Get all boundaries for geofence registration */
  getBoundaries: async () => apiCall("/api/locations/boundaries", "GET"),

  /** Get a circle's boundary polygon */
  getCircleBoundary: async (circleId) =>
    apiCall(`/api/locations/circles/${circleId}/boundary`, "GET"),

  /** Save circle boundary + snapshot (base64 sent to backend for server-side upload) */
  saveCircleBoundary: async (circleId, boundary, snapshotBase64 = null) =>
    apiCall(`/api/locations/circles/${circleId}/boundary`, "PUT", {
      boundary,
      snapshotBase64,
    }),

  /** Delete circle boundary */
  deleteCircleBoundary: async (circleId) =>
    apiCall(`/api/locations/circles/${circleId}/boundary`, "DELETE"),

  /** Admin: list all university boundaries */
  getAdminUniversities: async () =>
    apiCall("/api/locations/admin/universities", "GET"),

  /** Admin: save university boundary */
  saveUniversityBoundary: async (name, boundary, snapshotBase64 = null) =>
    apiCall(
      `/api/locations/admin/universities/${encodeURIComponent(name)}/boundary`,
      "PUT",
      { boundary, snapshotBase64 },
    ),

  /** Upload polygon snapshot image (base64) to Supabase map-snapshots bucket */
  uploadSnapshot: async (circleId, base64, mimeType = "image/jpeg") => {
    const { supabase } = await import("../supabaseClient.js");
    const fileName = `${circleId}.jpg`;
    // Delete old snapshot first
    await supabase.storage.from("map-snapshots").remove([fileName]);

    // ✅ Replace the entire hand-rolled decoder with this one line

    const arrayBuffer = decode(base64);

    const { error } = await supabase.storage
      .from("map-snapshots")
      .upload(fileName, arrayBuffer, { contentType: mimeType, upsert: true });

    if (error) throw error;

    const { data } = supabase.storage
      .from("map-snapshots")
      .getPublicUrl(fileName);
    console.log(data.publicUrl);
    return `${data.publicUrl}?t=${Date.now()}`;
  },
};
