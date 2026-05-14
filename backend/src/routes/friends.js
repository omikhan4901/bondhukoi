import { 
  getUserByEmail,
  getUserByFriendCode,
  createFriendRequest, 
  getPendingFriendRequests, 
  updateFriendRequest, 
  deleteFriendRequest,
  getFriends,
  deleteFriendship,
  getWatchedFriends,
  createWatchRequest,
  getPendingWatchRequests,
  updateWatchRequest,
  deleteWatchRequest
} from '../db/database.js';

export default async function friendRoutes(fastify) {
  // Send friend request
  fastify.post('/requests', async (request, reply) => {
    try {
      await request.jwtVerify();
      const { friendEmail, friendCode } = request.body;

      if (!friendEmail && !friendCode) {
        return reply.status(400).send({
          error: 'friendEmail or friendCode is required',
        });
      }

      let friendUser;
      if (friendCode) {
        friendUser = await getUserByFriendCode(friendCode);
      } else {
        friendUser = await getUserByEmail(friendEmail);
      }

      if (!friendUser) {
        return reply.status(404).send({
          error: 'User not found',
        });
      }

      // Prevent adding yourself
      if (friendUser.id === request.user.userId) {
        return reply.status(400).send({
          error: 'Cannot add yourself as a friend',
        });
      }

      const friendRequest = await createFriendRequest(request.user.userId, friendUser.id);

      reply.status(201).send({
        message: 'Friend request sent',
        request: friendRequest,
      });
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).send({
        error: 'Failed to send friend request',
        message: err.message,
      });
    }
  });

  // Get pending friend requests
  fastify.get('/requests/pending', async (request, reply) => {
    try {
      await request.jwtVerify();

      const pendingRequests = await getPendingFriendRequests(request.user.userId);

      reply.send({
        requests: pendingRequests,
        count: pendingRequests.length,
      });
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).send({
        error: 'Failed to fetch friend requests',
      });
    }
  });

  // Accept friend request
  fastify.patch('/requests/:requestId/accept', async (request, reply) => {
    try {
      await request.jwtVerify();
      
      const friendRequest = await updateFriendRequest(request.params.requestId, 'accepted');

      if (!friendRequest) {
        return reply.status(404).send({
          error: 'Friend request not found',
        });
      }

      reply.send({
        message: 'Friend request accepted',
      });
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).send({
        error: 'Failed to accept friend request',
      });
    }
  });

  // Reject friend request
  fastify.delete('/requests/:requestId', async (request, reply) => {
    try {
      await request.jwtVerify();

      await deleteFriendRequest(request.params.requestId);

      reply.send({
        message: 'Friend request rejected',
      });
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).send({
        error: 'Failed to reject friend request',
      });
    }
  });

  // Get friends list with pagination
  fastify.get('/list', async (request, reply) => {
    try {
      await request.jwtVerify();
      const { limit = 50, offset = 0 } = request.query;

      const { data: friends, total, hasMore } = await getFriends(request.user.userId, { 
        limit: parseInt(limit), 
        offset: parseInt(offset) 
      });

      const mappedFriends = friends.map(f => ({
        id: f.id,
        name: f.name,
        email: f.email,
        university: f.university,
        facebook: f.facebook || null,
        instagram: f.instagram || null,
        avatarUrl: f.avatar_url || null,
      }));

      reply.send({
        friends: mappedFriends,
        total,
        hasMore,
        count: mappedFriends.length,
      });
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).send({
        error: 'Failed to fetch friends',
      });
    }
  });

  // Unfriend a friend
  fastify.delete('/:friendId', async (request, reply) => {
    try {
      await request.jwtVerify();

      const { friendId } = request.params;

      if (!friendId) {
        return reply.status(400).send({
          error: 'friendId is required',
        });
      }

      await deleteFriendship(request.user.userId, friendId);

      reply.send({
        message: 'Friend removed',
      });
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).send({
        error: 'Failed to remove friend',
        message: err.message,
      });
    }
  });

  // Set up watch request (priority alerts)
  fastify.post('/watch', async (request, reply) => {
    try {
      await request.jwtVerify();
      const { friendEmail, scope } = request.body;

      if (!friendEmail || !scope) {
        return reply.status(400).send({
          error: 'friendEmail and scope are required',
        });
      }

      const friendUser = await getUserByEmail(friendEmail);
      if (!friendUser) {
        return reply.status(404).send({
          error: 'User not found',
        });
      }

      const watchRequest = await createWatchRequest(request.user.userId, friendUser.id, scope);

      reply.status(201).send({
        message: 'Watch request sent',
        watch: watchRequest,
      });
    } catch (err) {
      if (err.code === 'DUPLICATE_WATCH') {
        return reply.status(409).send({
          error: 'Already watching this friend',
          message: 'You are already watching this friend. Remove the existing watch before setting up a new one.',
        });
      }
      fastify.log.error(err);
      reply.status(500).send({
        error: 'Failed to send watch request',
        message: err.message,
      });
    }
  });

  // Accept watch request
  fastify.patch('/watch/:watchId/accept', async (request, reply) => {
    try {
      await request.jwtVerify();
      const watch = await updateWatchRequest(request.params.watchId, 'accepted');

      if (!watch) {
        return reply.status(404).send({
          error: 'Watch request not found',
        });
      }

      reply.send({
        message: 'Watch request accepted',
      });
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).send({
        error: 'Failed to accept watch request',
      });
    }
  });

  // Remove watch
  fastify.delete('/watch/:watchId', async (request, reply) => {
    try {
      await request.jwtVerify();
      
      await deleteWatchRequest(request.params.watchId);

      reply.send({
        message: 'Watch removed',
      });
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).send({
        error: 'Failed to remove watch',
      });
    }
  });

  // Get watch list
  fastify.get('/watch/list', async (request, reply) => {
    try {
      await request.jwtVerify();

      const watches = await getWatchedFriends(request.user.userId);

      reply.send({
        watches: watches || [],
        count: (watches || []).length,
      });
    } catch (err) {
      reply.status(401).send({
        error: 'Unauthorized',
      });
    }
  });
}
