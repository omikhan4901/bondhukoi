/**
 * geofenceTask.js
 * Background task that fires when user enters/exits a registered geofence region.
 * Runs a location check against the server.
 */
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { locationService } from '../services/api';

export const GEOFENCE_TASK = 'BONDHU_KOI_GEOFENCE';

TaskManager.defineTask(GEOFENCE_TASK, async ({ data: { eventType, region }, error }) => {
  if (error) {
    console.error('[Geofence] Task error:', error);
    return;
  }

  if (
    eventType === Location.GeofencingEventType.Enter ||
    eventType === Location.GeofencingEventType.Exit
  ) {
    try {
      let pos = null;

      // In background, Android often can't get a fresh GPS fix instantly.
      // Try getCurrentPositionAsync first with a short timeout, then fall back
      // to the last known position (which is always cached by the OS).
      try {
        pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000, // don't wait more than 5 s for a new fix
        });
      } catch (gpsErr) {
        console.warn('[Geofence] Fresh fix unavailable, falling back to last known position:', gpsErr.message);
        pos = await Location.getLastKnownPositionAsync({
          requiredAccuracy: 500, // accept anything within 500 m
          maxAge: 5 * 60 * 1000, // no older than 5 minutes
        });
      }

      if (!pos) {
        console.warn('[Geofence] No position available at all — skipping check');
        return;
      }

      const { latitude, longitude } = pos.coords;

      // Server does PIP — coordinates never stored
      let success = false;
      let attempts = 0;
      while (!success && attempts < 3) {
        try {
          await locationService.checkLocation(latitude, longitude);
          success = true;
          console.log(`[Geofence] Checked location on ${eventType === Location.GeofencingEventType.Enter ? 'ENTER' : 'EXIT'} of region ${region.identifier}`);
        } catch (err) {
          attempts++;
          console.warn(`[Geofence] Check attempt ${attempts} failed:`, err.message);
          if (attempts < 3) await new Promise(r => setTimeout(r, 5000 * attempts));
        }
      }
    } catch (err) {
      console.error('[Geofence] Task failed:', err.message);
    }
  }
});

/**
 * Register geofences from boundaries returned by the API.
 * Each polygon becomes a bounding circle for OS-level geofencing.
 */
export async function registerGeofences(boundaries) {
  const { getBoundingCircle } = await import('../utils/locationUtils');

  // Stop any existing geofencing first
  const isRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK);
  if (isRegistered) {
    await Location.stopGeofencingAsync(GEOFENCE_TASK);
  }

  const regions = [];

  if (boundaries.universityBoundary?.boundary) {
    const circle = getBoundingCircle(boundaries.universityBoundary.boundary);
    if (circle) {
      regions.push({
        identifier: `university_${boundaries.universityBoundary.name}`,
        ...circle,
      });
    }
  }

  for (const cb of (boundaries.circleBoundaries || [])) {
    if (cb.boundary) {
      const circle = getBoundingCircle(cb.boundary);
      if (circle) {
        regions.push({
          identifier: `circle_${cb.circleId}`,
          ...circle,
        });
      }
    }
  }

  if (regions.length > 0) {
    await Location.startGeofencingAsync(GEOFENCE_TASK, regions);
    console.log(`[Geofence] Registered ${regions.length} region(s)`);
  }
}
