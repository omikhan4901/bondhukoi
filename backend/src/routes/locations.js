import {
  supabase,
  upsertCircleBoundary,
  updateUserInsideStatus,
  checkInsideCirclesSpatial,
  checkInsideUniversitySpatial,
  getLatestTransition,
  createStatusTransition,
  pruneOldTransitions,
  getCircleBoundariesBatch,
  getCircleBoundary,
  getUniversityBoundary,
  getAllUniversityBoundaries,
  upsertUniversityBoundary,
  getCircleRole,
  getCirclesForUser,
} from '../db/database.js';

/**
 * Point-in-polygon — ray casting algorithm
 * polygon: [{lat, lng}, ...]
 * point: {lat, lng}
 */
function pointInPolygon(point, polygon) {
  let inside = false;
  const x = point.lng, y = point.lat;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng, yi = polygon[i].lat;
    const xj = polygon[j].lng, yj = polygon[j].lat;
    const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export default async function locationRoutes(fastify) {

  /**
   * POST /api/locations/check
   * Receive coordinates, run PIP server-side, update is_inside, discard coords.
   * Rate limited: 30 per hour per user.
   */
  fastify.post('/check', {
    config: { rateLimit: { max: 30, timeWindow: '1 hour' } },
  }, async (request, reply) => {
    // Background pruning (chance based to avoid overhead on every request)
    if (Math.random() < 0.05) pruneOldTransitions(30).catch(() => {});

    try {
      await request.jwtVerify();
      const { lat, lng } = request.body;

      if (lat === undefined || lng === undefined) {
        return reply.status(400).send({ error: 'lat and lng are required' });
      }

      const point = { lat: Number(lat), lng: Number(lng) };
      const userId = request.user.userId;

      // 1. Get user profile (for university name and privacy settings)
      const { data: userData } = await supabase
        .from('users')
        .select('university, is_sharing_enabled, track_university, allow_evening_pings')
        .eq('id', userId)
        .single();

      // --- PRIVACY GATE 0: 6PM-6AM Sleep Window ---
      const now = new Date();
      const hour = now.getHours();
      const isSleepWindow = hour >= 18 || hour < 6; // 6 PM (18) to 6 AM (6)

      if (isSleepWindow && userData?.allow_evening_pings !== true) {
        return reply.send({
          isInside: false,
          isInUniversity: false,
          insideCircleIds: [],
          insideCircles: [],
          status: 'sleep_window_active'
        });
      }

      // --- PRIVACY GATE 1: Pause All Sharing ---
      if (userData?.is_sharing_enabled === false) {
        return reply.send({
          isInside: false,
          isInUniversity: false,
          insideCircleIds: [],
          insideCircles: [],
          status: 'sharing_paused'
        });
      }

      // 2. Spatial University Check (Respect track_university)
      let isInUniversity = false;
      if (userData?.university && userData?.track_university !== false) {
        isInUniversity = await checkInsideUniversitySpatial(userData.university, point.lat, point.lng);
      }

      // 3. Spatial Circles Check (Unified query)
      const insideCirclesRaw = await checkInsideCirclesSpatial(userId, point.lat, point.lng);
      
      // 4. Transition Logic & Per-Circle Privacy
      const userCircles = await getCirclesForUser(userId) || [];
      const finalInsideCircles = [];
      const publicInsideCircleIds = [];

      // Fetch circle memberships to check detection_enabled
      const { data: memberships } = await supabase
        .from('circle_members')
        .select('circle_id, detection_enabled')
        .eq('user_id', userId);

      for (const circle of userCircles) {
        const member = memberships?.find(m => m.circle_id === circle.id);
        const detectionEnabled = member?.detection_enabled !== false;

        const isCurrentlyInside = insideCirclesRaw.some(c => c.id === circle.id);
        
        // If detection is disabled for this circle, skip it entirely
        if (!detectionEnabled) continue;

        if (isCurrentlyInside) {
          finalInsideCircles.push(circle);
          publicInsideCircleIds.push(circle.id);
        }

        // --- Transition Logging ---
        const lastEvent = await getLatestTransition(userId, circle.id);
        const wasInside = lastEvent?.transition_type === 'ENTER';

        if (isCurrentlyInside && !wasInside) {
          await createStatusTransition(userId, circle.id, 'ENTER');
        } else if (!isCurrentlyInside && wasInside) {
          await createStatusTransition(userId, circle.id, 'EXIT');
        }
      }

      const isPubliclyInside = isInUniversity || publicInsideCircleIds.length > 0;

      // 5. Update overall status
      await updateUserInsideStatus(userId, isPubliclyInside);

      reply.send({
        isInside: isPubliclyInside,
        isInUniversity,
        insideCircleIds: publicInsideCircleIds,
        insideCircles: finalInsideCircles,
      });
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).send({ error: 'Location check failed', message: err.message });
    }
  });

  /**
   * GET /api/locations/boundaries
   * Returns university polygon + all circle polygons for the user.
   * Used by client to register geofences.
   */
  fastify.get('/boundaries', async (request, reply) => {
    try {
      await request.jwtVerify();
      const userId = request.user.userId;

      const { data: userData } = await supabase
        .from('users')
        .select('university')
        .eq('id', userId)
        .single();

      let universityBoundary = null;
      if (userData?.university) {
        const ub = await getUniversityBoundary(userData.university);
        if (ub) universityBoundary = { name: ub.university_name, boundary: ub.boundary };
      }

      const userCircles = await getCirclesForUser(userId) || [];
      const circleIds = userCircles.map(c => c.id);
      
      const batchBoundaries = await getCircleBoundariesBatch(circleIds);
      
      const circleBoundaries = batchBoundaries.map(cb => {
        const circle = userCircles.find(c => c.id === cb.circle_id);
        const geojson = JSON.parse(cb.geojson);
        return {
          circleId: cb.circle_id,
          name: circle?.name || 'Unknown',
          boundary: geojson.coordinates[0].map(([lng, lat]) => ({ lat, lng }))
        };
      });

      reply.send({ universityBoundary, circleBoundaries });
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).send({ error: 'Failed to fetch boundaries' });
    }
  });

  /**
   * GET /api/locations/admin/universities
   * List all university boundaries. Admin only.
   */
  fastify.get('/admin/universities', async (request, reply) => {
    try {
      await request.jwtVerify();
      const { data: admin } = await supabase
        .from('users').select('role').eq('id', request.user.userId).single();
      if (admin?.role !== 'admin') return reply.status(403).send({ error: 'Admin only' });

      const boundaries = await getAllUniversityBoundaries();
      reply.send({ universities: boundaries });
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).send({ error: 'Failed to fetch universities' });
    }
  });

  /**
   * PUT /api/locations/admin/universities/:name/boundary
   * Save/update university polygon. Admin only. Rate-limited 3/day.
   */
  fastify.put('/admin/universities/:name/boundary', {
    config: { rateLimit: { max: 50, timeWindow: '1 hour' } },
  }, async (request, reply) => {
    try {
      await request.jwtVerify();
      const { data: admin } = await supabase
        .from('users').select('role').eq('id', request.user.userId).single();
      if (admin?.role !== 'admin') return reply.status(403).send({ error: 'Admin only' });

      const { boundary, snapshotBase64 } = request.body;
      if (!boundary || !Array.isArray(boundary) || boundary.length < 3) {
        return reply.status(400).send({ error: 'boundary must be an array of at least 3 {lat,lng} points' });
      }

      let snapshotUrl = null;
      if (snapshotBase64) {
        const universityName = decodeURIComponent(request.params.name);
        const fileName = `university_${universityName.replace(/\s+/g, '_').toLowerCase()}.jpg`;
        
        // Upload to university-snapshots bucket
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('map-snapshots') // Reuse map-snapshots but with unique prefix
          .upload(fileName, Buffer.from(snapshotBase64, 'base64'), {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (uploadError) {
          fastify.log.error('Snapshot upload failed:', uploadError);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('map-snapshots')
            .getPublicUrl(fileName);
          snapshotUrl = publicUrl;
        }
      }

      const result = await upsertUniversityBoundary(
        decodeURIComponent(request.params.name),
        boundary,
        request.user.userId,
        snapshotUrl
      );

      reply.send({ boundary: result });
    } catch (err) {
      fastify.log.error('Failed to save boundary:', err);
      reply.status(500).send({ 
        error: 'Failed to save boundary',
        message: err.message,
        details: err.details || err.hint || null
      });
    }
  });

  /**
   * GET /api/locations/circles/:circleId/boundary
   * Get a circle's polygon.
   */
  fastify.get('/circles/:circleId/boundary', async (request, reply) => {
    try {
      await request.jwtVerify();
      const boundary = await getCircleBoundary(request.params.circleId);
      reply.send({ boundary: boundary?.boundary || null });
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).send({ error: 'Failed to fetch circle boundary' });
    }
  });

  /**
   * PUT /api/locations/circles/:circleId/boundary
   * Save circle polygon. Circle admin only. Rate-limited 50/hr.
   */
  fastify.put('/circles/:circleId/boundary', {
    config: { rateLimit: { max: 50, timeWindow: '1 hour' } },
  }, async (request, reply) => {
    try {
      await request.jwtVerify();
      const { circleId } = request.params;
      const { boundary, snapshotBase64 } = request.body;

      if (!boundary || !Array.isArray(boundary) || boundary.length < 3) {
        return reply.status(400).send({ error: 'boundary must be an array of at least 3 {lat,lng} points' });
      }

      // Verify user is circle admin
      const role = await getCircleRole(circleId, request.user.userId);
      if (role !== 'admin') {
        return reply.status(403).send({ error: 'Circle admin only' });
      }

      // Upload snapshot server-side so we bypass Supabase Storage RLS
      // (frontend uses the anon key which has no write access)
      let snapshotUrl = null;
      if (snapshotBase64) {
        const fileName = `${circleId}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('map-snapshots')
          .upload(fileName, Buffer.from(snapshotBase64, 'base64'), {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (uploadError) {
          fastify.log.error('Circle snapshot upload failed:', uploadError);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('map-snapshots')
            .getPublicUrl(fileName);
          snapshotUrl = publicUrl;
        }
      }

      const result = await upsertCircleBoundary(circleId, boundary, snapshotUrl);
      reply.send({ boundary: result, snapshotUrl });
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).send({ 
        error: 'Failed to save circle boundary', 
        message: err.message,
        details: err.details || null 
      });
    }
  });

  /**
   * DELETE /api/locations/circles/:circleId/boundary
   * Remove circle boundary + snapshot.
   */
  fastify.delete('/circles/:circleId/boundary', async (request, reply) => {
    try {
      await request.jwtVerify();
      const { circleId } = request.params;

      const role = await getCircleRole(circleId, request.user.userId);
      if (role !== 'admin') {
        return reply.status(403).send({ error: 'Circle admin only' });
      }

      await supabase.from('circle_boundaries').delete().eq('circle_id', circleId);
      await supabase.from('circles').update({ snapshot_url: null }).eq('id', circleId);
      // Delete snapshot from storage
      await supabase.storage.from('map-snapshots').remove([`${circleId}.jpg`]);

      reply.send({ success: true });
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).send({ error: 'Failed to delete boundary' });
    }
  });
}
