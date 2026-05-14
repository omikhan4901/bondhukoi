import { 
  createCircle, 
  getCircleById, 
  getCirclesForUser, 
  updateCircle, 
  deleteCircle,
  addCircleMember,
  getCircleMembers,
  getCircleMember,
  removeCircleMember,
  updateCircleMemberRole,
  createActivityLog,
  getCircleRole,
  getCircleMembersSample,
  getCircleMembersSamplesBatch,
  getCircleMemberCountsBatch,
  updateCircleMemberPrivacy,
  acceptCircleInvitation,
  getCircleInvitations,
  getUserById,
  upsertCircleBoundary,
  uploadCircleSnapshot,
  getUniversityCirclesForCampus,
} from '../db/database.js';
import { supabase } from '../db/database.js';
import { validate, schemas } from '../utils/validation.js';

export default async function circleRoutes(fastify) {
  // Create circle
  fastify.post('/', async (request, reply) => {
    try {
      await request.jwtVerify();
      const userId = request.user.userId;
      const user = await getUserById(userId);

      const { error, value } = validate(request.body, schemas.createCircle);
      if (error) {
        return reply.status(400).send({ error: 'Validation failed', details: error.details });
      }

      const { inviteeIds, type, name, description, locationId, isOpen, boundary, snapshotBase64 } = value;

      // 1. Enforce min 2 invitees (excluding creator)
      if (!inviteeIds || !Array.isArray(inviteeIds) || inviteeIds.length < 2) {
        return reply.status(400).send({ error: 'At least 2 people must be invited to create a circle' });
      }

      // 2. Enforce University Group restriction
      if (type === 'university') {
        if (!user.university) {
          return reply.status(403).send({ error: 'You must belong to a university to create a university group' });
        }
        // In a real app we'd verify the name or locationId against their uni
      }

      const circle = await createCircle({
        name,
        description: description || '',
        type,
        locationId: locationId || null,
        isOpen: isOpen || false,
        adminId: userId,
      });

      // 3. Add creator as active admin
      await addCircleMember(circle.id, userId, 'admin', 'active');
      
      // 4. Add invitees as pending members
      const invitePromises = inviteeIds.map(id => addCircleMember(circle.id, id, 'member', 'pending'));
      await Promise.all(invitePromises);

      await createActivityLog(userId, circle.id, 'circle_created', { name: circle.name });

      // 5. Handle custom boundary if provided
      if (boundary && Array.isArray(boundary) && boundary.length >= 3) {
        let snapshotUrl = null;
        if (snapshotBase64) {
          try {
            snapshotUrl = await uploadCircleSnapshot(circle.id, snapshotBase64);
          } catch (snapshotErr) {
            fastify.log.error(`Failed to upload snapshot for circle ${circle.id}:`, snapshotErr);
          }
        }
        try {
          await upsertCircleBoundary(circle.id, boundary, snapshotUrl);
        } catch (boundaryErr) {
          fastify.log.error(`Failed to save boundary for circle ${circle.id}:`, boundaryErr);
        }
      }

      reply.status(201).send({
        message: 'Circle created successfully',
        circle: {
          id: circle.id,
          name: circle.name,
          type: circle.type,
          memberCount: 1 + inviteeIds.length,
          createdAt: circle.created_at,
        },
      });
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).send({
        error: 'Failed to create circle',
        message: err.message,
      });
    }
  });

  fastify.get('/university', async (request, reply) => {
    try {
      await request.jwtVerify();
      const userId = request.user.userId;
      const user = await getUserById(userId);
      if (!user.university) {
        return reply.send({ circles: [] });
      }
      const circles = await getUniversityCirclesForCampus(userId, user.university);
      reply.send({ circles });
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).send({ error: 'Failed to fetch university circles' });
    }
  });

  // Get all user's circles
  fastify.get('/', async (request, reply) => {
    try {
      await request.jwtVerify();
      const userId = request.user.userId;

      const userCircles = await getCirclesForUser(userId);
      const circleIds = userCircles.map(c => c.id);

      // Fetch all required data in parallel — NO N+1!
      const [samplesMap, countsMap] = await Promise.all([
        getCircleMembersSamplesBatch(circleIds, 5),
        getCircleMemberCountsBatch(circleIds)
      ]);
      
      const circlesWithDetails = userCircles.map(circle => {
        const membersSample = samplesMap[circle.id] || [];
        const memberCount = countsMap[circle.id] || 0;

        return {
          id: circle.id,
          name: circle.name,
          type: circle.type,
          description: circle.description,
          memberCount,
          members: membersSample,
          role: circle.userRole || 'member',
          isOpen: circle.is_open,
          messengerLink: circle.messenger_link || null,
          locationLabel: circle.location_label || null,
          snapshotUrl: circle.snapshot_url || null,
          snapshotUpdatedAt: circle.snapshot_updated_at || null,
          hasMessengerLink: !!circle.messenger_link,
          detectionEnabled: circle.detectionEnabled !== false,
          createdAt: circle.created_at,
        };
      });

      reply.send({
        circles: circlesWithDetails,
        count: circlesWithDetails.length,
      });
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).send({
        error: 'Failed to fetch circles',
      });
    }
  });

  // Get circle by ID
  fastify.get('/:circleId', async (request, reply) => {
    try {
      await request.jwtVerify();
      const circle = await getCircleById(request.params.circleId);

      if (!circle) {
        return reply.status(404).send({ error: 'Circle not found' });
      }

      // Targeted role check
      const role = await getCircleRole(circle.id, request.user.userId);
      if (!role) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      const members = await getCircleMembers(circle.id);

      reply.send({
        circle: {
          id: circle.id,
          name: circle.name,
          description: circle.description,
          type: circle.type,
          memberCount: members.length,
          isOpen: circle.is_open,
          messengerLink: circle.messenger_link || null,
          locationLabel: circle.location_label || null,
          snapshotUrl: circle.snapshot_url || null,
          snapshotUpdatedAt: circle.snapshot_updated_at || null,
          hasMessengerLink: !!circle.messenger_link,
          createdAt: circle.created_at,
        },
        role,
        members: members.map(m => ({
          id: m.id,
          userId: m.user_id,
          name: m.name || 'Unknown',
          email: m.email || '',
          university: m.university || '',
          avatarUrl: m.avatar_url,
          role: m.role,
          status: m.status || 'active',
          joinedAt: m.joined_at,
        })),
      });
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).send({ error: 'Failed to fetch circle' });
    }
  });

  // Update circle (admin only) — supports name, description, isOpen, messengerLink, locationLabel
  fastify.patch('/:circleId', async (request, reply) => {
    try {
      await request.jwtVerify();
      const circle = await getCircleById(request.params.circleId);

      if (!circle) {
        return reply.status(404).send({ error: 'Circle not found' });
      }

      const members = await getCircleMembers(circle.id);
      const userMember = members.find(m => m.user_id === request.user.userId);

      if (!userMember || userMember.role !== 'admin') {
        return reply.status(403).send({ error: 'Only admins can update circle' });
      }

      const body = request.body || {};
      const updateData = {
        name: body.name !== undefined ? body.name : circle.name,
        description: body.description !== undefined ? body.description : circle.description,
        is_open: body.isOpen !== undefined ? body.isOpen : circle.is_open,
        messenger_link: body.messengerLink !== undefined ? body.messengerLink : circle.messenger_link,
        location_label: body.locationLabel !== undefined ? body.locationLabel : circle.location_label,
      };

      const updatedCircle = await updateCircle(circle.id, updateData);
      await createActivityLog(request.user.userId, circle.id, 'circle_updated');

      reply.send({
        message: 'Circle updated successfully',
        circle: {
          id: updatedCircle.id,
          name: updatedCircle.name,
          description: updatedCircle.description,
          isOpen: updatedCircle.is_open,
          messengerLink: updatedCircle.messenger_link || null,
          locationLabel: updatedCircle.location_label || null,
          hasMessengerLink: !!updatedCircle.messenger_link,
        },
      });
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).send({ error: 'Failed to update circle', message: err.message });
    }
  });

  // Delete circle (admin only)
  fastify.delete('/:circleId', async (request, reply) => {
    try {
      await request.jwtVerify();
      const circle = await getCircleById(request.params.circleId);

      if (!circle) {
        return reply.status(404).send({ error: 'Circle not found' });
      }

      const members = await getCircleMembers(circle.id);
      const userMember = members.find(m => m.user_id === request.user.userId);

      if (!userMember || userMember.role !== 'admin') {
        return reply.status(403).send({ error: 'Only admins can delete circle' });
      }

      await deleteCircle(circle.id);

      reply.send({ message: 'Circle deleted successfully' });
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).send({ error: 'Failed to delete circle', message: err.message });
    }
  });

  // Add member to circle
  fastify.post('/:circleId/members', async (request, reply) => {
    try {
      await request.jwtVerify();
      const circle = await getCircleById(request.params.circleId);

      if (!circle) {
        return reply.status(404).send({ error: 'Circle not found' });
      }

      const members = await getCircleMembers(circle.id);
      const requesterMember = members.find(m => m.user_id === request.user.userId);

      // Admins can always add; open invite allows any member to add
      const canAdd =
        requesterMember?.role === 'admin' ||
        (circle.is_open && requesterMember);

      if (!canAdd) {
        return reply.status(403).send({ error: 'Only admins can add members to this circle' });
      }

      const { userId } = request.body;
      if (!userId) {
        return reply.status(400).send({ error: 'userId is required' });
      }

      if (members.some(m => m.user_id === userId)) {
        return reply.status(409).send({ error: 'User is already a member' });
      }

      await addCircleMember(circle.id, userId, 'member');
      await createActivityLog(userId, circle.id, 'member_added');

      reply.status(201).send({ message: 'Member added successfully' });
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).send({ error: 'Failed to add member', message: err.message });
    }
  });

  // Remove member from circle
  fastify.delete('/:circleId/members/:userId', async (request, reply) => {
    try {
      await request.jwtVerify();
      const circle = await getCircleById(request.params.circleId);

      if (!circle) {
        return reply.status(404).send({ error: 'Circle not found' });
      }

      const members = await getCircleMembers(circle.id);
      const requesterMember = members.find(m => m.user_id === request.user.userId);
      const targetMember = members.find(m => m.user_id === request.params.userId);
      const isSelf = request.user.userId === request.params.userId;

      if (!targetMember) {
        return reply.status(404).send({ error: 'Member not found' });
      }

      // Kicking logic
      if (!isSelf) {
        if (!requesterMember || requesterMember.role !== 'admin') {
          return reply.status(403).send({ error: 'Only admins can remove members' });
        }
        // Core Rule: Admins cannot kick other admins
        if (targetMember.role === 'admin') {
          return reply.status(403).send({ error: 'Admins cannot kick other admins' });
        }
      }

      await removeCircleMember(circle.id, request.params.userId);
      await createActivityLog(request.user.userId, circle.id, 'member_removed', {
        removedUserId: request.params.userId,
      });

      reply.send({ message: 'Member removed successfully' });
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).send({ error: 'Failed to remove member', message: err.message });
    }
  });

  // Update member role (admin only)
  fastify.patch('/:circleId/members/:userId/role', async (request, reply) => {
    try {
      await request.jwtVerify();
      const circle = await getCircleById(request.params.circleId);

      if (!circle) {
        return reply.status(404).send({ error: 'Circle not found' });
      }

      const members = await getCircleMembers(circle.id);
      const requesterMember = members.find(m => m.user_id === request.user.userId);

      if (!requesterMember || requesterMember.role !== 'admin') {
        return reply.status(403).send({ error: 'Only admins can change member roles' });
      }

      const { role } = request.body;
      if (!role || !['member', 'admin'].includes(role)) {
        return reply.status(400).send({ error: 'role must be "member" or "admin"' });
      }

      const memberExists = members.some(m => m.user_id === request.params.userId);
      if (!memberExists) {
        return reply.status(404).send({ error: 'Member not found' });
      }

      await updateCircleMemberRole(circle.id, request.params.userId, role);
      await createActivityLog(request.user.userId, circle.id, 'member_role_changed', {
        targetUserId: request.params.userId,
        newRole: role,
      });

      reply.send({ message: 'Member role updated successfully', role });
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).send({ error: 'Failed to update member role', message: err.message });
    }
  });

  // Get members of a circle
  fastify.get('/:circleId/members', async (request, reply) => {
    try {
      await request.jwtVerify();
      const circle = await getCircleById(request.params.circleId);

      if (!circle) {
        return reply.status(404).send({ error: 'Circle not found' });
      }

      const members = await getCircleMembers(circle.id);
      const userMember = members.find(m => m.user_id === request.user.userId);

      if (!userMember) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      reply.send({
        members: members.map(m => ({
          id: m.id,
          userId: m.user_id,
          name: m.name || 'Unknown',
          email: m.email || '',
          university: m.university || '',
          role: m.role,
          status: m.status || 'active',
          joinedAt: m.joined_at,
        })),
        count: members.length,
      });
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).send({ error: 'Failed to fetch circle members', message: err.message });
    }
  });

  // Update current user's privacy settings for a circle
  fastify.patch('/:circleId/members/me/privacy', async (request, reply) => {
    try {
      await request.jwtVerify();
      const { circleId } = request.params;
      const userId = request.user.userId;

      const { detectionEnabled } = request.body;
      const updates = {};
      
      if (detectionEnabled !== undefined) updates.detection_enabled = detectionEnabled;

      if (Object.keys(updates).length === 0) {
        return reply.status(400).send({ error: 'No valid privacy settings provided' });
      }

      const updated = await updateCircleMemberPrivacy(circleId, userId, updates);
      reply.send({ 
        message: 'Privacy settings updated successfully', 
        settings: {
          detectionEnabled: updated.detection_enabled
        }
      });
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).send({ error: 'Failed to update privacy settings', message: err.message });
    }
  });

  // Invitations
  fastify.get('/invitations', async (request, reply) => {
    try {
      await request.jwtVerify();
      const invitations = await getCircleInvitations(request.user.userId);
      reply.send({ invitations });
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).send({ error: 'Failed to fetch invitations' });
    }
  });

  fastify.post('/:circleId/accept', async (request, reply) => {
    try {
      await request.jwtVerify();
      await acceptCircleInvitation(request.params.circleId, request.user.userId);
      await createActivityLog(request.user.userId, request.params.circleId, 'member_joined');
      reply.send({ message: 'Invitation accepted' });
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).send({ error: 'Failed to accept invitation' });
    }
  });

  fastify.post('/:circleId/reject', async (request, reply) => {
    try {
      await request.jwtVerify();
      await rejectCircleInvitation(request.params.circleId, request.user.userId);
      reply.send({ message: 'Invitation rejected' });
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).send({ error: 'Failed to reject invitation' });
    }
  });
}
