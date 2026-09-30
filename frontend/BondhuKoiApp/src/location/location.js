import { Platform } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { api } from '../lib/api';

/**
 * How BondhuKoi uses location:
 * 1. The phone asks the OS to watch the edges of your zones (campus and circles), drawn
 *    as circles around each zone. The OS wakes the app only when you cross one.
 * 2. Then (and when you open the app) it takes one reading and sends it to the server,
 *    which answers "on campus? in which circles?" exactly, stores only that answer and
 *    throws the reading away.
 * Nothing tracks you continuously and no history of places is kept.
 */
export const GEOFENCE_TASK = 'bondhukoi-zone-edges';
const SUPPORTED = Platform.OS !== 'web';

export async function permissionStatus() {
  if (!SUPPORTED) return { foreground: false, background: false, canAskAgain: false };
  const fg = await Location.getForegroundPermissionsAsync();
  const bg = fg.granted ? await Location.getBackgroundPermissionsAsync() : { granted: false };
  return { foreground: fg.granted, background: bg.granted, canAskAgain: fg.canAskAgain };
}

export async function askForeground() {
  if (!SUPPORTED) return false;
  const res = await Location.requestForegroundPermissionsAsync();
  return res.granted;
}

/** On Android 11+ this opens Settings, where the person picks "Allow all the time". */
export async function askBackground() {
  if (!SUPPORTED) return false;
  const res = await Location.requestBackgroundPermissionsAsync();
  return res.granted;
}

/** One reading, sent to the server. Returns the server's answer, or null if no reading. */
export async function reportNow() {
  if (!SUPPORTED) return null;
  let pos = null;
  try {
    pos = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
    ]);
  } catch {
    pos = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000, requiredAccuracy: 300 });
  }
  if (!pos) return null;
  return api('/api/presence/check', {
    method: 'POST',
    body: { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: Math.round(pos.coords.accuracy ?? 0) },
  });
}

/** The smallest circle (roughly) around a zone, plus a margin, for OS geofencing. */
export function boundingCircle(points, marginMeters = 60) {
  const lat = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const lng = points.reduce((s, p) => s + p.lng, 0) / points.length;
  const R = 6_371_000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dist = (p) => {
    const dLat = toRad(p.lat - lat);
    const dLng = toRad(p.lng - lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat)) * Math.cos(toRad(p.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };
  const radius = Math.max(...points.map(dist)) + marginMeters;
  return { latitude: lat, longitude: lng, radius: Math.max(100, Math.round(radius)) };
}

/** Registers the current zones with the OS (needs "Allow all the time"). */
export async function syncZones() {
  if (!SUPPORTED) return 0;
  const { background } = await permissionStatus();
  const running = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK);
  if (!background) {
    if (running) await Location.stopGeofencingAsync(GEOFENCE_TASK);
    return 0;
  }
  const { zones } = await api('/api/presence/zones');
  const regions = zones
    .filter((z) => z.boundary?.length >= 3)
    .slice(0, 90) // Android allows 100 per app
    .map((z) => ({ identifier: z.id, notifyOnEnter: true, notifyOnExit: true, ...boundingCircle(z.boundary) }));
  if (!regions.length) {
    if (running) await Location.stopGeofencingAsync(GEOFENCE_TASK);
    return 0;
  }
  await Location.startGeofencingAsync(GEOFENCE_TASK, regions);
  return regions.length;
}

export async function stopZones() {
  if (!SUPPORTED) return;
  if (await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK)) await Location.stopGeofencingAsync(GEOFENCE_TASK);
}

// Runs in the background when the phone crosses a zone edge. Retries a little, then
// gives up quietly: the next crossing or app open will correct things.
if (SUPPORTED) {
  TaskManager.defineTask(GEOFENCE_TASK, async ({ error }) => {
    if (error) return;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await reportNow();
        return;
      } catch (err) {
        if (err?.status === 401 || err?.status === 403) return;
        await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
      }
    }
  });
}
