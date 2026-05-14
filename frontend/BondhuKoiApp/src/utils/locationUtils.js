/**
 * locationUtils.js
 * All location math runs on-device. No raw coordinates ever stored.
 */

/**
 * Point-in-polygon — ray casting algorithm
 * @param {{lat: number, lng: number}} point
 * @param {Array<{lat: number, lng: number}>} polygon
 * @returns {boolean}
 */
export function pointInPolygon(point, polygon) {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  const x = point.lng, y = point.lat;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng, yi = polygon[i].lat;
    const xj = polygon[j].lng, yj = polygon[j].lat;
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Get bounding circle for a polygon (for geofence registration).
 * Returns { latitude, longitude, radius } in meters.
 */
export function getBoundingCircle(polygon) {
  if (!polygon || polygon.length === 0) return null;

  const centerLat = polygon.reduce((s, p) => s + p.lat, 0) / polygon.length;
  const centerLng = polygon.reduce((s, p) => s + p.lng, 0) / polygon.length;

  // Find max distance from centroid to any vertex (in meters)
  let maxDistMeters = 0;
  for (const p of polygon) {
    const d = haversineDistance(centerLat, centerLng, p.lat, p.lng);
    if (d > maxDistMeters) maxDistMeters = d;
  }

  // Add 20% padding so geofence triggers slightly before the exact boundary
  return {
    latitude: centerLat,
    longitude: centerLng,
    radius: Math.ceil(maxDistMeters * 1.2),
  };
}

/**
 * Haversine distance in meters between two lat/lng points.
 */
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Convert a boundary polygon array to coordinates suitable for react-native-maps Polygon.
 * Input:  [{lat, lng}, ...]
 * Output: [{latitude, longitude}, ...]
 */
export function boundaryToMapCoords(boundary) {
  if (!boundary) return [];
  return boundary.map((p) => ({ latitude: p.lat, longitude: p.lng }));
}

/**
 * Convert react-native-maps tap coordinate to boundary point.
 * Input:  {latitude, longitude}
 * Output: {lat, lng}
 */
export function mapCoordToPoint(coord) {
  return { lat: coord.latitude, lng: coord.longitude };
}
