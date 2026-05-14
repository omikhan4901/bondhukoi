import { getUserById, updateUser, searchUsers, getCirclesForUser, getFriends, createActivityLog } from '../db/database.js';
import { validate, schemas } from '../utils/validation.js';

export default async function userRoutes(fastify) {
  // Get current user profile
  fastify.get('/me', async (request, reply) => {
    try {
      await request.jwtVerify();
      const user = await getUserById(request.user.userId);

      if (!user) {
        return reply.status(404).send({
          error: 'User not found',
        });
      }

      // Get user's circles
      const userCircles = await getCirclesForUser(user.id);

      // Get user's friends
      const friends = await getFriends(user.id);

      reply.send({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          university: user.university,
          facebook: user.facebook,
          instagram: user.instagram,
          friend_code: user.friend_code,
          isSharingEnabled: user.is_sharing_enabled,
          autoDeleteHistory: user.auto_delete_history,
          allowEveningPings: user.allow_evening_pings || false,
          avatarUrl: user.avatar_url || null,
          role: user.role || 'user',
          createdAt: user.created_at,
        },
        circleCount: userCircles.length,
        friendCount: friends.total || friends.length || 0,
      });
    } catch (err) {
      fastify.log.error(err);
      reply.status(401).send({
        error: 'Unauthorized',
      });
    }
  });

  // Update user profile
  fastify.patch('/me', async (request, reply) => {
    try {
      await request.jwtVerify();
      const user = await getUserById(request.user.userId);

      if (!user) {
        return reply.status(404).send({
          error: 'User not found',
        });
      }

      const { error, value } = validate(request.body, schemas.updateProfile);
      if (error) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: error.details,
        });
      }

      // Update user
      const updateData = { ...user };
      if (value.name) updateData.name = value.name;
      if (value.facebook !== undefined) updateData.facebook = value.facebook;
      if (value.instagram !== undefined) updateData.instagram = value.instagram;

      const updatedUser = await updateUser(user.id, updateData);

      reply.send({
        message: 'Profile updated successfully',
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          university: updatedUser.university,
          facebook: updatedUser.facebook,
          instagram: updatedUser.instagram,
          friend_code: updatedUser.friend_code,
          isSharingEnabled: updatedUser.is_sharing_enabled,
          autoDeleteHistory: updatedUser.auto_delete_history,
          avatarUrl: updatedUser.avatar_url || null,
          createdAt: updatedUser.created_at,
        },
      });
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).send({
        error: 'Failed to update profile',
        message: err.message,
      });
    }
  });

  // Toggle sharing
  fastify.patch('/me/sharing', async (request, reply) => {
    try {
      await request.jwtVerify();
      const user = await getUserById(request.user.userId);

      if (!user) {
        return reply.status(404).send({
          error: 'User not found',
        });
      }

      const isSharingEnabled = request.body.enabled ?? !user.is_sharing_enabled;
      const updatedUser = await updateUser(user.id, {
        is_sharing_enabled: isSharingEnabled,
      });

      reply.send({
        message: isSharingEnabled ? 'Sharing enabled' : 'Sharing disabled',
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          university: updatedUser.university,
          facebook: updatedUser.facebook,
          instagram: updatedUser.instagram,
          friend_code: updatedUser.friend_code,
          isSharingEnabled: updatedUser.is_sharing_enabled,
          autoDeleteHistory: updatedUser.auto_delete_history,
          avatarUrl: updatedUser.avatar_url || null,
          createdAt: updatedUser.created_at,
        },
      });
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).send({ error: 'Failed to update sharing status' });
    }
  });

  // Update privacy preferences (ghost mode, auto-delete history)
  fastify.patch('/me/preferences', async (request, reply) => {
    try {
      await request.jwtVerify();
      const user = await getUserById(request.user.userId);

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      const updateData = {};
      if (request.body.autoDeleteHistory !== undefined) updateData.auto_delete_history = request.body.autoDeleteHistory;
      if (request.body.allowEveningPings !== undefined) updateData.allow_evening_pings = request.body.allowEveningPings;
      if (request.body.trackUniversity !== undefined) updateData.track_university = request.body.trackUniversity;

      const updatedUser = await updateUser(user.id, updateData);

      reply.send({
        message: 'Preferences updated successfully',
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          university: updatedUser.university,
          facebook: updatedUser.facebook,
          instagram: updatedUser.instagram,
          friend_code: updatedUser.friend_code,
          isSharingEnabled: updatedUser.is_sharing_enabled,
          autoDeleteHistory: updatedUser.auto_delete_history,
          allowEveningPings: updatedUser.allow_evening_pings || false,
          avatarUrl: updatedUser.avatar_url || null,
          createdAt: updatedUser.created_at,
        },
      });
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).send({ error: 'Failed to update preferences', message: err.message });
    }
  });

  // Delete current user account permanently
  fastify.delete('/me', async (request, reply) => {
    try {
      await request.jwtVerify();
      const { supabase } = await import('../db/database.js');
      const userId = request.user.userId;

      // Delete user (cascade will handle related data via FK constraints)
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      reply.send({ message: 'Account deleted successfully' });
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).send({ error: 'Failed to delete account', message: err.message });
    }
  });

  // Upload profile avatar
  fastify.post('/me/avatar', async (request, reply) => {
    try {
      await request.jwtVerify();
      const userId = request.user.userId;
      const { imageBase64, mimeType = 'image/jpeg' } = request.body;

      if (!imageBase64) {
        return reply.status(400).send({ error: 'imageBase64 is required' });
      }

      const { supabase, updateUser } = await import('../db/database.js');

      // Convert base64 to buffer and upload to Supabase storage
      const imageBuffer = Buffer.from(imageBase64, 'base64');
      const extension = mimeType === 'image/png' ? 'png' : 'jpg';
      const filePath = `${userId}/avatar.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, imageBuffer, {
          contentType: mimeType,
          upsert: true, // overwrite existing
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const avatarUrl = urlData.publicUrl;

      // Save URL to user record
      const updatedUser = await updateUser(userId, { avatar_url: avatarUrl });

      reply.send({
        message: 'Avatar uploaded successfully',
        avatarUrl,
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          university: updatedUser.university,
          facebook: updatedUser.facebook,
          instagram: updatedUser.instagram,
          friend_code: updatedUser.friend_code,
          isSharingEnabled: updatedUser.is_sharing_enabled,
          autoDeleteHistory: updatedUser.auto_delete_history,
          avatarUrl: updatedUser.avatar_url || null,
          createdAt: updatedUser.created_at,
        },
      });
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).send({ error: 'Failed to upload avatar', message: err.message });
    }
  });

  // Get user by ID
  fastify.get('/:userId', async (request, reply) => {
    try {
      const user = await getUserById(request.params.userId);

      if (!user) {
        return reply.status(404).send({
          error: 'User not found',
        });
      }

      reply.send({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          university: user.university,
          facebook: user.facebook,
          instagram: user.instagram,
          avatarUrl: user.avatar_url || null,
        },
      });
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).send({
        error: 'Failed to fetch user',
      });
    }
  });

  // Search users
  fastify.get('/search/:query', async (request, reply) => {
    try {
      const query = request.params.query.toLowerCase();
      const results = await searchUsers(query);
      
      const filteredResults = results
        .map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          university: u.university,
          avatarUrl: u.avatar_url || null,
        }))
        .slice(0, 20);

      reply.send({
        results: filteredResults,
      });
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).send({
        error: 'Search failed',
        message: err.message,
      });
    }
  });

  // Get notifications feed (unified: friend requests, watch requests, watch alerts, circle invites)
  // Supports cursor-based pagination via lastTimestamp
  fastify.get('/notifications/feed', async (request, reply) => {
    try {
      await request.jwtVerify();
      const userId = request.user.userId;
      const { limit = 20, lastTimestamp = null } = request.query;
      
      // Import database functions
      const {
        supabase,
        getPendingFriendRequests,
        getPendingWatchRequests,
        getWatchedTransitions,
        getCircleInvitations,
      } = await import('../db/database.js');

      const notifications = [];

      // 1. Friend & Watch Requests (Only show on first page/no cursor)
      if (!lastTimestamp) {
        try {
          const [friendRequests, watchRequests] = await Promise.all([
            getPendingFriendRequests(userId),
            getPendingWatchRequests(userId)
          ]);
          
          const circleInvitations = await getCircleInvitations(userId);

          for (const inv of circleInvitations || []) {
            notifications.push({
              id: `circle_invite_${inv.id}`,
              type: 'circle_invite',
              title: `Invitation to ${inv.name}`,
              subtitle: 'Join this circle to share location status',
              icon: 'Users',
              time: inv.created_at || new Date().toISOString(),
              relatedId: inv.id,
              relatedCircleId: inv.id,
              relatedCircleName: inv.name,
              action: 'accept_circle_invite',
            });
          }

          for (const req of friendRequests || []) {
            const { data: requester } = await supabase.from('users').select('id, name, avatar_url').eq('id', req.from_user_id).single();
            if (requester) {
              notifications.push({
                id: `friend_${req.id}`,
                type: 'friend_request',
                title: `${requester.name} sent a friend request`,
                subtitle: 'Tap to accept or decline',
                icon: 'UserPlus',
                time: req.created_at,
                relatedId: req.id,
                relatedUserId: requester.id,
                relatedUserName: requester.name,
                relatedUserAvatar: requester.avatar_url,
                action: 'accept_friend',
              });
            }
          }

          for (const req of watchRequests || []) {
            const { data: requester } = await supabase.from('users').select('id, name, avatar_url').eq('id', req.watcher_id).single();
            if (requester) {
              notifications.push({
                id: `watch_${req.id}`,
                type: 'watch_request',
                title: `${requester.name} wants to watch you`,
                subtitle: `They'll be alerted when you enter/leave zones.`,
                icon: 'Bell',
                time: req.created_at,
                relatedId: req.id,
                relatedUserId: requester.id,
                relatedUserName: requester.name,
                relatedUserAvatar: requester.avatar_url,
                action: 'accept_watch',
              });
            }
          }
        } catch (err) {
          fastify.log.warn('Failed to load pending requests:', err.message);
        }
      }

      // 2. Watch Alerts (Paginated stream from transitions)
      const { data: transitions, total, hasMore } = await getWatchedTransitions(userId, { 
        limit: parseInt(limit), 
        lastTimestamp 
      });

      for (const trans of transitions || []) {
        const isEnter = trans.transition_type === 'ENTER';
        notifications.push({
          id: `alert_${trans.id}`,
          type: 'watch_alert',
          title: isEnter ? `${trans.user.name} entered ${trans.circle.name}` : `${trans.user.name} left ${trans.circle.name}`,
          subtitle: isEnter ? `Arrived at the sanctuary.` : `No longer in the vault.`,
          icon: isEnter ? 'MapPin' : 'LogOut',
          time: trans.timestamp,
          relatedId: trans.id,
          relatedUserId: trans.user.id,
          relatedUserName: trans.user.name,
          relatedUserAvatar: trans.user.avatar_url,
          relatedCircleId: trans.circle.id,
          action: 'dismiss',
        });
      }

      // Sort unified list (requests at top, then alerts by time)
      notifications.sort((a, b) => new Date(b.time) - new Date(a.time));

      const lastAlert = transitions && transitions.length > 0 ? transitions[transitions.length - 1] : null;

      reply.send({
        notifications: notifications.map(n => ({
          ...n,
          time: typeof n.time === 'string' ? n.time : n.time.toISOString(),
        })),
        total,
        hasMore,
        lastTimestamp: lastAlert ? lastAlert.timestamp : null,
      });
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).send({
        error: 'Failed to fetch notifications',
        message: err.message,
      });
    }
  });
}
