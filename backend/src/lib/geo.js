import { badRequest } from './errors.js';

export const MAX_POLYGON_POINTS = 100;
// Largest zone side, in metres. A campus fits easily; a whole city does not.
const MAX_SPAN_METERS = 5_000;
const MIN_SPAN_METERS = 10;

/** JSON schema for a polygon given as [{ lat, lng }, …]. */
export const polygonSchema = {
  type: 'array',
  minItems: 3,
  maxItems: MAX_POLYGON_POINTS,
  items: {
    type: 'object',
    additionalProperties: false,
    required: ['lat', 'lng'],
    properties: {
      lat: { type: 'number', minimum: -90, maximum: 90 },
      lng: { type: 'number', minimum: -180, maximum: 180 },
    },
  },
};

function metersBetween(a, b) {
  const R = 6_371_000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Checks a polygon's size and returns it as WKT (closed ring, lng lat order).
 * Self-crossing shapes are caught by PostGIS (`ST_IsValid`) when saved.
 */
export function polygonToWkt(points) {
  const unique = points.filter((p, i) => i === 0 || p.lat !== points[i - 1].lat || p.lng !== points[i - 1].lng);
  const ring = unique[0].lat === unique.at(-1).lat && unique[0].lng === unique.at(-1).lng ? unique.slice(0, -1) : unique;
  if (ring.length < 3) throw badRequest('A zone needs at least 3 different points.', 'invalid_zone');

  const lats = ring.map((p) => p.lat);
  const lngs = ring.map((p) => p.lng);
  const south = Math.min(...lats);
  const north = Math.max(...lats);
  const west = Math.min(...lngs);
  const east = Math.max(...lngs);
  const height = metersBetween({ lat: south, lng: west }, { lat: north, lng: west });
  const width = metersBetween({ lat: south, lng: west }, { lat: south, lng: east });
  if (Math.max(height, width) > MAX_SPAN_METERS) {
    throw badRequest('That zone is too big. Keep it under 5 km across.', 'zone_too_big');
  }
  if (Math.max(height, width) < MIN_SPAN_METERS) {
    throw badRequest('That zone is too small to detect reliably.', 'zone_too_small');
  }

  const coords = [...ring, ring[0]].map((p) => `${p.lng} ${p.lat}`).join(', ');
  return `POLYGON((${coords}))`;
}

/** GeoJSON Polygon text → [{ lat, lng }, …] without the closing point. */
export function geojsonToPoints(geojson) {
  if (!geojson) return null;
  const shape = typeof geojson === 'string' ? JSON.parse(geojson) : geojson;
  const ring = shape.coordinates[0].map(([lng, lat]) => ({ lat, lng }));
  return ring.slice(0, -1);
}
