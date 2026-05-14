import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import { generateFriendCode } from "../utils/auth.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Initialize Supabase client - switch based on NODE_ENV
const isTestEnv = process.env.NODE_ENV === "test";
const supabaseUrl = isTestEnv
  ? process.env.TEST_SUPABASE_URL
  : process.env.SUPABASE_URL;
const supabaseKey = isTestEnv
  ? process.env.TEST_SUPABASE_SERVICE_ROLE_KEY
  : process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    `Missing SUPABASE credentials for ${isTestEnv ? "TEST" : "PRODUCTION"} environment in .env`,
  );
}

console.log(
  `🔗 Connected to ${isTestEnv ? "TEST" : "PRODUCTION"} Supabase database`,
);

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Utility functions for database operations
 */

export const getUUID = () => uuidv4();

/**
 * USER OPERATIONS
 */

export const createUser = async ({
  name,
  email,
  passwordHash,
  university,
  facebook = null,
  instagram = null,
  isSharingEnabled = true,
  autoDeleteHistory = true,
  trackUniversity = true,
  avatarUrl = null,
}) => {
  const friendCode = generateFriendCode();

  const { data, error } = await supabase
    .from("users")
    .insert([
      {
        name,
        email,
        password_hash: passwordHash,
        university,
        facebook,
        instagram,
        is_sharing_enabled: isSharingEnabled,
        auto_delete_history: autoDeleteHistory,
        track_university: trackUniversity,
        friend_code: friendCode,
        avatar_url: avatarUrl,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getUserByEmail = async (email) => {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  if (error && error.code === "PGRST116") return null; // Not found
  if (error) throw error;
  return data;
};

export const getUserByFriendCode = async (friendCode) => {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("friend_code", friendCode.toUpperCase())
    .single();

  if (error && error.code === "PGRST116") return null; // Not found
  if (error) throw error;
  return data;
};

export const getUserById = async (userId) => {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error && error.code === "PGRST116") return null;
  if (error) throw error;
  return data;
};

export const updateUser = async (userId, updates) => {
  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const searchUsers = async (query) => {
  const { data, error } = await supabase
    .from("users")
    .select("id, name, email, university, avatar_url, friend_code")
    .or(`name.ilike.%${query}%,email.ilike.%${query}%,friend_code.ilike.%${query}%`)
    .limit(10);

  if (error) throw error;
  return data || [];
};

/**
 * CIRCLE OPERATIONS
 */

export const createCircle = async ({
  name,
  description = "",
  type = "university",
  locationId = null,
  isOpen = false,
  adminId,
}) => {
  const payload = {
    name,
    description,
    type,
    admin_id: adminId,
    is_open: isOpen,
  };

  try {
    const { data, error } = await supabase
      .from("circles")
      .insert([{ ...payload, location_id: locationId }])
      .select()
      .single();

    if (error) {
      // If error is about the location_id column missing, retry without it
      if (error.message.includes("location_id") || error.code === "PGRST204") {
        console.warn("[DB] 'location_id' column missing in circles, falling back...");
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("circles")
          .insert([payload])
          .select()
          .single();
        if (fallbackError) throw fallbackError;
        return fallbackData;
      }
      throw error;
    }
    return data;
  } catch (err) {
    throw err;
  }
};

export const getCircleById = async (circleId) => {
  const { data, error } = await supabase
    .from("circles")
    .select("*")
    .eq("id", circleId)
    .single();

  if (error && error.code === "PGRST116") return null;
  if (error) throw error;
  return data;
};

export const getUniversityCirclesForCampus = async (userId, university) => {
  if (!university) return [];
  
  // 1. Find all circles of type 'university' for this specific campus
  const { data, error } = await supabase
    .from("circle_members")
    .select(`role, joined_at, circle:circles(*)`)
    .eq("user_id", userId)
    .eq("circle.type", "university")
    .eq("circle.name", university); // or we might want to check a 'university_name' field if we add it

  if (error) throw error;
  
  // Actually, a university group might have a different name than the university itself.
  // We need a way to link circles to a university.
  // Let's assume for now we filter by type 'university' and the user's university.
  
  // Re-fetch more accurately:
  const { data: memberData, error: memberError } = await supabase
    .from("circle_members")
    .select(`role, status, circle:circles!inner(*)`)
    .eq("user_id", userId)
    .eq("status", "accepted")
    .eq("circle.type", "university");

  if (memberError) throw memberError;

  return (memberData || []).map(item => ({
    ...item.circle,
    userRole: item.role
  }));
};

export const getCirclesForUser = async (userId) => {
  let query = supabase
    .from("circle_members")
    .select(`role, detection_enabled, status, circle:circles(*)`)
    .eq("user_id", userId);

  // Try to filter out pending invitations if the status column exists
  try {
    const { data, error } = await query;
    if (error) {
      if (error.message.includes("status")) {
        // Fallback: fetch without status
        const { data: fbData, error: fbError } = await supabase
          .from("circle_members")
          .select(`role, detection_enabled, circle:circles(*)`)
          .eq("user_id", userId);
        if (fbError) throw fbError;
        return (fbData || []).map(item => ({
          ...item.circle,
          userRole: item.role,
          detectionEnabled: item.detection_enabled
        }));
      }
      throw error;
    }

    // Filter results to excluded pending if we have the status column
    return (data || [])
      .filter(item => item.status !== 'pending')
      .map((item) => ({
        ...item.circle,
        userRole: item.role,
        detectionEnabled: item.detection_enabled,
      }));
  } catch (err) {
    if (err.message.includes("status")) {
      const { data: fallbackData, error: fbError } = await supabase
        .from("circle_members")
        .select(`role, detection_enabled, circle:circles(*)`)
        .eq("user_id", userId);
      if (fbError) throw fbError;
      return (fallbackData || []).map(item => ({
        ...item.circle,
        userRole: item.role,
        detectionEnabled: item.detection_enabled
      }));
    }
    throw err;
  }
};

export const updateCircle = async (circleId, updates) => {
  const { data, error } = await supabase
    .from("circles")
    .update(updates)
    .eq("id", circleId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteCircle = async (circleId) => {
  // 1. Delete snapshot from Storage if it exists
  const fileName = `${circleId}.jpg`;
  try {
    await supabase.storage.from("map-snapshots").remove([fileName]);
  } catch (storageErr) {
    console.warn(`[DB] Failed to remove snapshot for circle ${circleId}:`, storageErr);
    // Continue anyway, DB delete is primary
  }

  // 2. Delete circle from DB (cascades to members, boundaries, transitions)
  const { error } = await supabase.from("circles").delete().eq("id", circleId);

  if (error) throw error;
};

/**
 * CIRCLE MEMBERS OPERATIONS
 */

export const addCircleMember = async (circleId, userId, role = "member", status = "pending") => {
  const payload = {
    circle_id: circleId,
    user_id: userId,
    role,
  };

  try {
    const { data, error } = await supabase
      .from("circle_members")
      .insert([{ ...payload, status }])
      .select()
      .single();

    if (error) {
      // If error is about the status column missing, retry without it
      if (error.message.includes("status") || error.code === "PGRST204") {
        console.warn("[DB] 'status' column missing in circle_members, falling back...");
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("circle_members")
          .insert([payload])
          .select()
          .single();
        if (fallbackError) throw fallbackError;
        return fallbackData;
      }
      throw error;
    }
    return data;
  } catch (err) {
    if (err.message.includes("status")) {
      const { data, error: fallbackError } = await supabase
        .from("circle_members")
        .insert([payload])
        .select()
        .single();
      if (fallbackError) throw fallbackError;
      return data;
    }
    throw err;
  }
};

export const acceptCircleInvitation = async (circleId, userId) => {
  try {
    const { data, error } = await supabase
      .from("circle_members")
      .update({ status: 'active' })
      .eq("circle_id", circleId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      if (error.message.includes("status")) {
        // If column missing, they are already "active" implicitly
        return { message: 'Already active (fallback)' };
      }
      throw error;
    }
    return data;
  } catch (err) {
    if (err.message.includes("status")) return { message: 'Already active (fallback)' };
    throw err;
  }
};

export const rejectCircleInvitation = async (circleId, userId) => {
  const { error } = await supabase
    .from("circle_members")
    .delete()
    .eq("circle_id", circleId)
    .eq("user_id", userId);

  if (error) throw error;
  return { success: true };
};

export const getCircleInvitations = async (userId) => {
  try {
    const { data, error } = await supabase
      .from("circle_members")
      .select("circle:circles(*), role, joined_at, status")
      .eq("user_id", userId)
      .eq("status", "pending");

    if (error) {
      if (error.message.includes("status")) {
        return []; // If column missing, no invitations possible yet
      }
      throw error;
    }
    return (data || []).map(item => ({
      ...item.circle,
      userRole: item.role,
      joinedAt: item.joined_at
    }));
  } catch (err) {
    if (err.message.includes("status")) return [];
    throw err;
  }
};

export const getCircleMembers = async (circleId) => {
  const { data: members, error } = await supabase
    .from("circle_members")
    .select("*")
    .eq("circle_id", circleId);

  if (error) throw error;
  if (!members || members.length === 0) return [];

  // Join user names
  const userIds = members.map((m) => m.user_id);
  const { data: users, error: userError } = await supabase
    .from("users")
    .select("id, name, email, university, avatar_url")
    .in("id", userIds);

  if (userError) throw userError;

  const userMap = {};
  (users || []).forEach((u) => {
    userMap[u.id] = u;
  });

  return members.map((m) => ({
    ...m,
    name: userMap[m.user_id]?.name || "Unknown",
    email: userMap[m.user_id]?.email || "",
    university: userMap[m.user_id]?.university || "",
  }));
};

export const getCircleMembersSample = async (circleId, limit = 5) => {
  const { data: members, error } = await supabase
    .from("circle_members")
    .select("user_id")
    .eq("circle_id", circleId)
    .limit(limit);

  if (error) throw error;
  if (!members || members.length === 0) return [];

  const userIds = members.map((m) => m.user_id);
  const { data: users, error: userError } = await supabase
    .from("users")
    .select("id, name, avatar_url")
    .in("id", userIds);

  if (userError) throw userError;
  return users || [];
};

export const getCircleMemberCountsBatch = async (circleIds) => {
  if (!circleIds || circleIds.length === 0) return {};

  const { data, error } = await supabase.rpc("get_circles_member_counts", {
    p_circle_ids: circleIds,
  });

  if (error) throw error;

  const countsMap = {};
  (data || []).forEach((row) => {
    countsMap[row.circle_id] = parseInt(row.member_count, 10);
  });
  return countsMap;
};

export const getCircleMembersSamplesBatch = async (circleIds, limit = 5) => {
  if (!circleIds || circleIds.length === 0) return {};

  // For each circle, we need to fetch up to 'limit' members.
  // We can't do this easily in a single Supabase query with specific limits per circle without RPC.
  // However, we can fetch ALL members for these circles and then slice in JS, or more efficiently,
  // fetch with a single query and group.

  const { data: members, error } = await supabase
    .from("circle_members")
    .select("circle_id, user_id, joined_at")
    .in("circle_id", circleIds)
    .order("joined_at", { ascending: true });

  if (error) throw error;
  if (!members || members.length === 0) return {};

  // Group by circle and limit to 'limit' per circle
  const samplesByCircle = {};
  const allUserIds = new Set();

  members.forEach((m) => {
    if (!samplesByCircle[m.circle_id]) samplesByCircle[m.circle_id] = [];
    if (samplesByCircle[m.circle_id].length < limit) {
      samplesByCircle[m.circle_id].push(m.user_id);
      allUserIds.add(m.user_id);
    }
  });

  // Fetch all unique users in one shot
  const { data: users, error: userError } = await supabase
    .from("users")
    .select("id, name, avatar_url")
    .in("id", Array.from(allUserIds));

  if (userError) throw userError;

  const userMap = {};
  users.forEach((u) => (userMap[u.id] = u));

  // Re-map back to circles
  const result = {};
  for (const circleId of circleIds) {
    const userIds = samplesByCircle[circleId] || [];
    result[circleId] = userIds.map((uid) => userMap[uid]).filter(Boolean);
  }

  return result;
};

export const getCircleMember = async (circleId, userId) => {
  const { data, error } = await supabase
    .from("circle_members")
    .select("*")
    .eq("circle_id", circleId)
    .eq("user_id", userId)
    .single();

  if (error && error.code === "PGRST116") return null;
  if (error) throw error;
  return data;
};

export const removeCircleMember = async (circleId, userId) => {
  const { error } = await supabase
    .from("circle_members")
    .delete()
    .eq("circle_id", circleId)
    .eq("user_id", userId);

  if (error) throw error;
};

export const updateCircleMemberRole = async (circleId, userId, role) => {
  const { data, error } = await supabase
    .from("circle_members")
    .update({ role })
    .eq("circle_id", circleId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * FRIEND REQUEST OPERATIONS
 */

export const createFriendRequest = async (fromUserId, toUserId) => {
  const { data, error } = await supabase
    .from("friend_requests")
    .insert([
      {
        from_user_id: fromUserId,
        to_user_id: toUserId,
        status: "pending",
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getFriendRequest = async (fromUserId, toUserId) => {
  const { data, error } = await supabase
    .from("friend_requests")
    .select("*")
    .or(
      `and(from_user_id.eq.${fromUserId},to_user_id.eq.${toUserId}),and(from_user_id.eq.${toUserId},to_user_id.eq.${fromUserId})`,
    )
    .single();

  if (error && error.code === "PGRST116") return null;
  if (error) throw error;
  return data;
};

export const getPendingFriendRequests = async (userId) => {
  const { data, error } = await supabase
    .from("friend_requests")
    .select("*")
    .eq("to_user_id", userId)
    .eq("status", "pending");

  if (error) throw error;
  return data || [];
};

export const updateFriendRequest = async (requestId, status) => {
  const { data, error } = await supabase
    .from("friend_requests")
    .update({ status })
    .eq("id", requestId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteFriendRequest = async (requestId) => {
  const { error } = await supabase
    .from("friend_requests")
    .delete()
    .eq("id", requestId);

  if (error) throw error;
};

export const getFriends = async (userId, { limit = 50, offset = 0 } = {}) => {
  // Get friend relationships where status is accepted (both directions)
  const {
    data: friendships,
    error,
    count,
  } = await supabase
    .from("friend_requests")
    .select("from_user_id, to_user_id", { count: "exact" })
    .eq("status", "accepted")
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
    .range(offset, offset + limit);

  if (error) throw error;
  if (!friendships || friendships.length === 0)
    return { data: [], total: 0, hasMore: false };

  // Extract friend IDs
  const friendIds = friendships.map((f) =>
    f.from_user_id === userId ? f.to_user_id : f.from_user_id,
  );

  // Get friend details
  const { data: friends, error: friendError } = await supabase
    .from("users")
    .select("id, name, email, university, facebook, instagram, avatar_url")
    .in("id", friendIds);

  if (friendError) throw friendError;

  return {
    data: friends || [],
    total: count || 0,
    hasMore: count > offset + limit,
  };
};

export const deleteFriendship = async (userId, friendId) => {
  // Delete the friendship record (works in both directions)
  // Case 1: userId is the requester
  let { error } = await supabase
    .from("friend_requests")
    .delete()
    .eq("from_user_id", userId)
    .eq("to_user_id", friendId)
    .eq("status", "accepted");

  if (error && error.code !== "PGRST116") throw error;

  // Case 2: userId is the recipient
  const { error: error2 } = await supabase
    .from("friend_requests")
    .delete()
    .eq("from_user_id", friendId)
    .eq("to_user_id", userId)
    .eq("status", "accepted");

  if (error2 && error2.code !== "PGRST116") throw error2;

  return { success: true };
};

/**
 * WATCH REQUEST OPERATIONS (Priority Alerts)
 */

export const createWatchRequest = async (
  watcherId,
  watchedUserId,
  scope = "campus",
) => {
  // Check if watch request already exists
  const { data: existingWatch, error: checkError } = await supabase
    .from("watch_requests")
    .select("*")
    .eq("watcher_id", watcherId)
    .eq("watched_user_id", watchedUserId)
    .single();

  if (existingWatch) {
    const error = new Error("Watch request already exists");
    error.code = "DUPLICATE_WATCH";
    throw error;
  }

  const { data, error } = await supabase
    .from("watch_requests")
    .insert([
      {
        watcher_id: watcherId,
        watched_user_id: watchedUserId,
        scope,
        status: "pending",
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getPendingWatchRequests = async (userId) => {
  const { data, error } = await supabase
    .from("watch_requests")
    .select("*")
    .eq("watched_user_id", userId)
    .eq("status", "pending");

  if (error) throw error;
  return data || [];
};

export const updateWatchRequest = async (requestId, status) => {
  const { data, error } = await supabase
    .from("watch_requests")
    .update({ status })
    .eq("id", requestId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteWatchRequest = async (requestId) => {
  const { error } = await supabase
    .from("watch_requests")
    .delete()
    .eq("id", requestId);

  if (error) throw error;
};

export const getWatchedFriends = async (userId) => {
  const { data, error } = await supabase
    .from("watch_requests")
    .select("id, watched_user_id, watcher_id, status, scope")
    .eq("watcher_id", userId)
    .eq("status", "accepted");

  if (error) throw error;

  if (!data || data.length === 0) return [];

  const watchedUserIds = data.map((w) => w.watched_user_id);
  const { data: users, error: userError } = await supabase
    .from("users")
    .select("id, name, email, university")
    .in("id", watchedUserIds);

  if (userError) throw userError;

  // Merge watch request data with user data
  const userMap = {};
  (users || []).forEach((u) => {
    userMap[u.id] = u;
  });

  return (data || []).map((watch) => ({
    ...userMap[watch.watched_user_id],
    watchId: watch.id,
    watchScope: watch.scope,
    status: watch.status,
  }));
};

/**
 * LOCATION OPERATIONS
 */

export const createLocation = async ({
  userId,
  latitude,
  longitude,
  accuracy = 10,
  isInside = false,
  circleId = null,
}) => {
  const { data, error } = await supabase
    .from("locations")
    .insert([
      {
        user_id: userId,
        latitude,
        longitude,
        accuracy,
        is_inside: isInside,
        circle_id: circleId,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getRecentLocations = async (userId, limit = 10) => {
  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .eq("user_id", userId)
    .order("timestamp", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
};

export const getCircleLocations = async (circleId) => {
  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .eq("circle_id", circleId)
    .order("timestamp", { ascending: false });

  if (error) throw error;
  return data || [];
};

export const getFriendLocation = async (friendId) => {
  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .eq("user_id", friendId)
    .order("timestamp", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code === "PGRST116") return null;
  if (error) throw error;
  return data;
};

/**
 * ACTIVITY LOG OPERATIONS
 */

export const createActivityLog = async (
  userId,
  circleId,
  action,
  metadata = {},
) => {
  const { data, error } = await supabase
    .from("activity_logs")
    .insert([
      {
        user_id: userId,
        circle_id: circleId,
        action,
        metadata,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getCircleActivityLog = async (circleId, limit = 50) => {
  const { data, error } = await supabase
    .from("activity_logs")
    .select("*")
    .eq("circle_id", circleId)
    .order("timestamp", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
};

export const getCircleStats = async (circleId) => {
  // Get member count
  const { data: members, error: memberError } = await supabase
    .from("circle_members")
    .select("id")
    .eq("circle_id", circleId);

  if (memberError) throw memberError;

  // Get current inside count
  const { data: insideMembers, error: insideError } = await supabase
    .from("locations")
    .select("user_id")
    .eq("circle_id", circleId)
    .eq("is_inside", true);

  if (insideError) throw insideError;

  return {
    totalMembers: members?.length || 0,
    membersInside: insideMembers?.length || 0,
    membersOutside: (members?.length || 0) - (insideMembers?.length || 0),
  };
};

/**
 * CIRCLE LIFECYCLE OPERATIONS
 */

export const pruneSmallCircles = async () => {
  // Find circles with < 3 active members
  // SQL check: DELETE FROM circles WHERE id IN (SELECT circle_id FROM circle_members WHERE status='active' GROUP BY circle_id HAVING COUNT(*) < 3)
  // But wait, the admin is an active member. So total < 3 means admin + 1 or less active members.
  
  // Using RPC is safer for this complex query
  const { data, error } = await supabase.rpc('prune_small_circles');
  
  if (error) throw error;
  return data; // Returns list of deleted circle IDs
};

/**
 * BOUNDARY OPERATIONS
 */

export const getUniversityBoundary = async (universityName) => {
  const { data, error } = await supabase.rpc("get_university_boundary_geojson", {
    p_university_name: universityName,
  });

  if (error) throw error;
  if (!data || data.length === 0) return null;

  const result = data[0];
  const geojson = JSON.parse(result.geojson);
  // Convert [[lng, lat]] to [{lat, lng}]
  const boundary = geojson.coordinates[0].map(([lng, lat]) => ({ lat, lng }));

  return {
    ...result,
    boundary,
  };
};

export const getAllUniversityBoundaries = async () => {
  const { data, error } = await supabase.rpc("get_all_university_boundaries_geojson");

  if (error) throw error;
  if (!data) return [];

  return data.map((result) => {
    const geojson = JSON.parse(result.geojson);
    const boundary = geojson.coordinates[0].map(([lng, lat]) => ({ lat, lng }));
    return {
      ...result,
      boundary,
    };
  });
};

export const upsertUniversityBoundary = async (
  universityName,
  boundary,
  adminId,
  snapshotUrl = null,
) => {
  const coords = boundary.map((p) => `${p.lng} ${p.lat}`).join(", ");
  const wkt = `POLYGON((${coords}, ${boundary[0].lng} ${boundary[0].lat}))`;

  const { data, error } = await supabase
    .from("university_boundaries")
    .upsert(
      {
        university_name: universityName,
        boundary: wkt,
        snapshot_url: snapshotUrl,
        created_by: adminId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "university_name" },
    )
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const getCircleBoundary = async (circleId) => {
  const { data, error } = await supabase.rpc("get_circle_boundary", {
    p_circle_id: circleId,
  });

  if (error) throw error;
  if (!data || data.length === 0) return null;

  const geojson = JSON.parse(data[0].geojson);
  const boundary = geojson.coordinates[0].map(([lng, lat]) => ({ lat, lng }));
  return { circle_id: circleId, boundary };
};

export const upsertCircleBoundary = async (
  circleId,
  boundary,
  snapshotUrl = null,
) => {
  const coords = boundary.map((p) => `${p.lng} ${p.lat}`).join(", ");
  const wkt = `POLYGON((${coords}, ${boundary[0].lng} ${boundary[0].lat}))`;

  // Update boundary
  const { data, error } = await supabase
    .from("circle_boundaries")
    .upsert(
      {
        circle_id: circleId,
        boundary: wkt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "circle_id" },
    )
    .select("circle_id, updated_at")
    .single();

  if (error) throw error;

  // Also update circle snapshot and/or timestamp if provided
  // This serves as a cache buster for the map images
  const updatePayload = {
    snapshot_updated_at: new Date().toISOString(),
  };
  if (snapshotUrl) {
    updatePayload.snapshot_url = snapshotUrl;
  }

  const { error: updateError } = await supabase
    .from("circles")
    .update(updatePayload)
    .eq("id", circleId);

  if (updateError) {
    console.error("Failed to update circle metadata:", updateError);
    // We don't necessarily want to fail the whole boundary save if just the metadata fails,
    // but the user says it's not saving, so let's throw it to be sure.
    throw new Error(`Circle metadata update failed: ${updateError.message}`);
  }

  return data;
};

export const uploadCircleSnapshot = async (circleId, base64, mimeType = "image/jpeg") => {
  const fileName = `${circleId}.jpg`;
  
  // 1. Convert base64 to Buffer (Node.js)
  const buffer = Buffer.from(base64, 'base64');

  // 2. Delete old snapshot if it exists
  await supabase.storage.from("map-snapshots").remove([fileName]);

  // 3. Upload new snapshot
  const { data, error } = await supabase.storage
    .from("map-snapshots")
    .upload(fileName, buffer, {
      contentType: mimeType,
      upsert: true
    });

  if (error) throw error;

  // 4. Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from("map-snapshots")
    .getPublicUrl(fileName);

  return publicUrl;
};
export const updateUserInsideStatus = async (userId, isInside) => {
  const { error } = await supabase
    .from("users")
    .update({ is_inside: isInside, last_check_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw error;
};

export const getUserCircleCount = async (userId) => {
  const { count, error } = await supabase
    .from("circle_members")
    .select("circle_id", { count: "exact" })
    .eq("user_id", userId)
    .eq("role", "admin");
  if (error) throw error;
  return count || 0;
};

export const updateCircleSnapshotUrl = async (circleId, snapshotUrl) => {
  const { error } = await supabase
    .from("circles")
    .update({ snapshot_url: snapshotUrl })
    .eq("id", circleId);
  if (error) throw error;
};

/**
 * PHASE 1 IMPROVEMENTS: Spatial & Transitions
 */

export const checkInsideCirclesSpatial = async (userId, lat, lng) => {
  const { data, error } = await supabase.rpc("check_user_inside_circles", {
    p_user_id: userId,
    p_lat: lat,
    p_lng: lng,
  });

  if (error) throw error;
  return data || []; // returns [{id, name}, ...]
};

export const createStatusTransition = async (
  userId,
  circleId,
  transitionType,
) => {
  const { data, error } = await supabase
    .from("status_transitions")
    .insert([
      {
        user_id: userId,
        circle_id: circleId,
        transition_type: transitionType,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getLatestTransition = async (userId, circleId) => {
  const { data, error } = await supabase
    .from("status_transitions")
    .select("*")
    .eq("user_id", userId)
    .eq("circle_id", circleId)
    .order("timestamp", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code === "PGRST116") return null;
  if (error) throw error;
  return data;
};

export const checkInsideUniversitySpatial = async (
  universityName,
  lat,
  lng,
) => {
  const { data, error } = await supabase.rpc("check_user_inside_university", {
    p_university_name: universityName,
    p_lat: lat,
    p_lng: lng,
  });

  if (error) throw error;
  return !!data;
};

export const getWatchedTransitions = async (
  watcherId,
  { limit = 20, lastTimestamp = null } = {},
) => {
  // 1. Get all users being watched by this watcher
  const { data: watches, error: watchError } = await supabase
    .from("watch_requests")
    .select("watched_user_id")
    .eq("watcher_id", watcherId)
    .eq("status", "accepted");

  if (watchError) throw watchError;
  if (!watches || watches.length === 0)
    return { data: [], total: 0, hasMore: false };

  const watchedUserIds = watches.map((w) => w.watched_user_id);

  // 2. Build query for transitions
  let query = supabase
    .from("status_transitions")
    .select(
      `
      *,
      user:users(id, name, avatar_url),
      circle:circles(id, name)
    `,
      { count: "exact" },
    )
    .in("user_id", watchedUserIds)
    .order("timestamp", { ascending: false })
    .limit(limit + 1); // Fetch one extra to check hasMore

  if (lastTimestamp) {
    query = query.lt("timestamp", lastTimestamp);
  }

  const { data: transitions, error: transError, count } = await query;

  if (transError) throw transError;

  const hasMore = (transitions || []).length > limit;
  const data = hasMore ? transitions.slice(0, limit) : transitions || [];

  return {
    data,
    total: count || 0,
    hasMore,
  };
};

/**
 * PHASE 5 IMPROVEMENTS: Refresh Tokens
 */

export const createRefreshTokenRecord = async (userId, token, expiresAt) => {
  const { data, error } = await supabase
    .from("refresh_tokens")
    .insert([
      {
        user_id: userId,
        token,
        expires_at: expiresAt,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getRefreshTokenRecord = async (token) => {
  const { data, error } = await supabase
    .from("refresh_tokens")
    .select("*")
    .eq("token", token)
    .single();

  if (error && error.code === "PGRST116") return null;
  if (error) throw error;
  return data;
};

export const deleteRefreshToken = async (token) => {
  const { error } = await supabase
    .from("refresh_tokens")
    .delete()
    .eq("token", token);
  if (error) throw error;
};

export const pruneOldTransitions = async () => {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  try {
    // 1. Get all users who want 24h auto-delete
    const { data: usersToPrune } = await supabase
      .from("users")
      .select("id")
      .eq("auto_delete_history", true);

    if (usersToPrune && usersToPrune.length > 0) {
      const userIds = usersToPrune.map(u => u.id);
      // 2. Prune their transitions (ENTER/EXIT events) older than 24h
      const { error: prune24Error } = await supabase
        .from("status_transitions")
        .delete()
        .in("user_id", userIds)
        .lt("timestamp", oneDayAgo.toISOString());
      
      if (prune24Error) console.error("[DB] 24h pruning failed:", prune24Error.message);
    }

    // 3. Global prune of everything older than 30 days (safety net)
    const { error: globalPruneError } = await supabase
      .from("status_transitions")
      .delete()
      .lt("timestamp", thirtyDaysAgo.toISOString());
    
    if (globalPruneError) console.error("[DB] Global pruning failed:", globalPruneError.message);
  } catch (err) {
    console.error("[DB] Pruning error:", err.message);
  }
};

/**
 * PHASE 6 PERFORMANCE: Batch Retrieval & Targeted Checks
 */
export const getCircleBoundariesBatch = async (circleIds) => {
  if (!circleIds || circleIds.length === 0) return [];
  const { data, error } = await supabase.rpc("get_circle_boundaries_batch", {
    p_circle_ids: circleIds,
  });

  if (error) throw error;
  return data || [];
};

export const getCircleRole = async (circleId, userId) => {
  const { data, error } = await supabase
    .from("circle_members")
    .select("role")
    .eq("circle_id", circleId)
    .eq("user_id", userId)
    .single();

  if (error && error.code === "PGRST116") return null;
  if (error) throw error;
  return data?.role || null;
};

export const updateCircleMemberPrivacy = async (circleId, userId, updates) => {
  const { data, error } = await supabase
    .from("circle_members")
    .update(updates)
    .eq("circle_id", circleId)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const getCircleMemberDetails = async (circleId, userId) => {
  const { data, error } = await supabase
    .from("circle_members")
    .select("*")
    .eq("circle_id", circleId)
    .eq("user_id", userId)
    .single();
  if (error && error.code === "PGRST116") return null;
  if (error) throw error;
  return data;
};
