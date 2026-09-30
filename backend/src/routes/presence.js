import { limit } from '../lib/limits.js';
import { body } from '../lib/schemas.js';
import { checkPresence } from '../lib/presence.js';
import { geojsonToPoints } from '../lib/geo.js';

export default async function presenceRoutes(app) {
  const { db, settings } = app.ctx;
  const ctx = app.ctx;
  app.addHook('onRequest', ctx.auth.requireUser);

  /**
   * The phone sends a reading when it crosses a zone edge (or when the app opens). The
   * server answers "on campus? in which circles?", stores only that, and drops the
   * coordinates. Nothing about this request is logged.
   */
  app.post(
    '/check',
    {
      logLevel: 'warn',
      config: limit('presence', settings),
      schema: {
        body: body(
          {
            lat: { type: 'number', minimum: -90, maximum: 90 },
            lng: { type: 'number', minimum: -180, maximum: 180 },
            accuracy: { type: 'number', minimum: 0, maximum: 100000 },
          },
          ['lat', 'lng'],
        ),
      },
    },
    async (req) => {
      const result = await checkPresence(ctx, req.user.id, req.body);
      return result;
    },
  );

  /**
   * The zones this phone should watch for: your campus (if you share it) and the circles
   * you're in with detection on. The phone registers these with the OS geofencing.
   */
  app.get('/zones', { config: limit('read', settings) }, async (req) => {
    const me = req.user.id;
    const profile = await db.one('select share_campus, sharing_enabled, university_id from profiles where id = $1', [me]);
    if (!profile.sharing_enabled) return { zones: [] };
    const campus = profile.share_campus
      ? await db.one(
          `select id, name, ST_AsGeoJSON(boundary) as geojson from universities where id = $1 and boundary is not null`,
          [profile.university_id],
        )
      : null;
    const circles = await db.many(
      `select c.id, c.name, ST_AsGeoJSON(b.boundary) as geojson
         from circle_members m join circles c on c.id = m.circle_id join circle_boundaries b on b.circle_id = c.id
        where m.user_id = $1 and m.status = 'active' and m.detection_enabled`,
      [me],
    );
    const zones = [];
    if (campus) zones.push({ id: `campus:${campus.id}`, kind: 'campus', name: campus.name, boundary: geojsonToPoints(campus.geojson) });
    for (const c of circles) zones.push({ id: `circle:${c.id}`, kind: 'circle', name: c.name, boundary: geojsonToPoints(c.geojson) });
    return { zones };
  });

}
