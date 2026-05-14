import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { useAuth } from '../hooks/useAuth';
import { userService, locationService } from '../services/api';

const LocationStatusContext = createContext();

// 10 minutes in milliseconds
const STALE_THRESHOLD_MS = 10 * 60 * 1000;

// Permission status enum
const PERMISSION_STATUS = {
  UNKNOWN: 'unknown',      // Not checked yet
  GRANTED: 'granted',      // Both FG and BG granted
  DENIED: 'denied',        // User denied, need to re-prompt
  PARTIALLY_GRANTED: 'partial', // FG granted but BG denied
};

export const LocationStatusProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [status, setStatus] = useState({
    isInside: user?.is_inside || false,
    isInUniversity: false,
    insideCircleIds: [],
    lastUpdated: new Date(),
    lastCheckAt: user?.last_check_at ? new Date(user.last_check_at) : null,
  });
  const [loading, setLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState(PERMISSION_STATUS.UNKNOWN);
  const [permissionError, setPermissionError] = useState(null);

  /**
   * Check if location data is stale (older than 10 minutes)
   */
  const isStale = useCallback(() => {
    if (!status.lastCheckAt) return true;
    const now = new Date();
    const timeSinceLastCheck = now - status.lastCheckAt;
    return timeSinceLastCheck > STALE_THRESHOLD_MS;
  }, [status.lastCheckAt]);

  /**
   * Check if location pings are allowed at current time
   * No pings between 6pm (18:00) and 6am unless user has enabled allowEveningPings
   */
  const isPingAllowedByTime = useCallback(() => {
    const now = new Date();
    const hour = now.getHours();
    const isRestrictedTime = hour >= 18 || hour < 6;
    
    // If it's not restricted time, always allow
    if (!isRestrictedTime) return true;
    
    // If it's restricted time, check user's evening pings setting
    return user?.allowEveningPings === true;
  }, [user?.allowEveningPings]);

  /**
   * Check and verify location permissions (foreground + background)
   * Returns { hasPermission, backgroundGranted }
   * Throws error if permissions denied/revoked
   */
  const verifyLocationPermissions = useCallback(async () => {
    try {
      const fgStatus = await Location.getForegroundPermissionsAsync();
      const bgStatus = await Location.getBackgroundPermissionsAsync();
      
      const fgGranted = fgStatus.status === 'granted';
      const bgGranted = bgStatus.status === 'granted';
      
      if (fgGranted) {
        setPermissionStatus(PERMISSION_STATUS.GRANTED);
        setPermissionError(null);
        return { hasPermission: true, backgroundGranted: bgGranted };
      }
      
      setPermissionStatus(PERMISSION_STATUS.DENIED);
      setPermissionError('Location permission required');
      const err = new Error('LOCATION_PERMISSION_DENIED');
      err.code = 'PERMISSION_DENIED';
      throw err;
    } catch (err) {
      if (err.code !== 'PERMISSION_DENIED') {
        console.error('[LocationStatusContext] Permission check error:', err);
        setPermissionError(err.message);
      }
      throw err;
    }
  }, []);

  /**
   * Re-request location permissions (shown as alert)
   */
  const requestLocationPermissions = useCallback(async () => {
    try {
      const fgStatus = await Location.requestForegroundPermissionsAsync();
      if (fgStatus.status === 'granted') {
        const bgStatus = await Location.requestBackgroundPermissionsAsync();
        if (bgStatus.status === 'granted') {
          setPermissionStatus(PERMISSION_STATUS.GRANTED);
          setPermissionError(null);
          return true;
        } else {
          // Still set to GRANTED because we accept FG-only now
          setPermissionStatus(PERMISSION_STATUS.GRANTED);
          return true;
        }
      } else {
        setPermissionStatus(PERMISSION_STATUS.DENIED);
        setPermissionError('Location permission required');
        return false;
      }
    } catch (err) {
      console.error('[LocationStatusContext] Permission request error:', err);
      setPermissionStatus(PERMISSION_STATUS.DENIED);
      return false;
    }
  }, []);

  // Use refs to break circular dependency between checkLocation and refreshStatus
  const checkLocationRef = useRef();
  const refreshStatusRef = useRef();

  /**
   * Get current location and ping server with coordinates
   * @param {boolean} skipRefresh - Prevents recursion from refreshStatus
   * @param {boolean} isBackgroundExplicit - If true, skip if bgGranted is false
   */
  const checkLocation = useCallback(async (skipRefresh = false, isBackgroundExplicit = false) => {
    if (!isAuthenticated) return;
    
    // Master Killswitch: Skip if sharing is explicitly disabled
    if (user?.isSharingEnabled === false) {
      console.log('[LocationStatusContext] Ping skipped - Master Sharing Killswitch is ACTIVE');
      return;
    }

    // Check if pings are allowed by time
    if (!isPingAllowedByTime()) {
      console.log('[LocationStatusContext] Ping skipped - restricted hours (6pm-6am) and allowEveningPings is disabled');
      return;
    }

    try {
      // Verify permissions before attempting to get location
      const { backgroundGranted } = await verifyLocationPermissions();
      
      // Optimization: If this is a background-triggered check but we only have foreground perms, skip.
      if (isBackgroundExplicit && !backgroundGranted) {
        console.log('[LocationStatusContext] Background ping suppressed - Foreground-only permission is active.');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      if (currentLocation) {
        await locationService.checkLocation(
          currentLocation.coords.latitude,
          currentLocation.coords.longitude
        );
        
        // Only re-sync from server if NOT called from refreshStatus (prevents recursion)
        if (!skipRefresh && refreshStatusRef.current) {
          await refreshStatusRef.current();
        }
      }
    } catch (err) {
      // Differentiate permission errors from other errors
      if (err.code === 'PERMISSION_DENIED') {
        console.error('[LocationStatusContext] Location permission denied/revoked');
        // Error will trigger alert in home screen via permissionStatus state
      } else {
        console.warn('[LocationStatusContext] checkLocation failed:', err.message);
      }
    }
  }, [isAuthenticated, isPingAllowedByTime, verifyLocationPermissions]);

  const refreshStatus = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      
      // Fetch fresh data from server using getMe()
      const data = await userService.getCurrentUser();
      
      setStatus(prev => {
        const lastCheckAt = data.last_check_at ? new Date(data.last_check_at) : prev.lastCheckAt;
        
        return {
          isInside: data.is_sharing_enabled ? data.is_inside : false,
          isInUniversity: data.is_inside_university || false,
          insideCircleIds: data.inside_circle_ids || [],
          lastUpdated: new Date(),
          lastCheckAt,
        };
      });
      
      // We'll calculate timeSinceLastCheck locally to avoid depending on status
      const dataLastCheckAt = data.last_check_at ? new Date(data.last_check_at) : null;
      const now = new Date();
      const timeSinceLastCheck = dataLastCheckAt ? (now - dataLastCheckAt) : STALE_THRESHOLD_MS;
      
      if (timeSinceLastCheck > STALE_THRESHOLD_MS && checkLocationRef.current) {
        checkLocationRef.current(true, true).catch(err => 
          console.warn('[LocationStatusContext] Background checkLocation failed:', err.message)
        );
      }
    } catch (err) {
      console.warn('[LocationStatusContext] refreshStatus failed:', err.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Keep refs in sync
  useEffect(() => {
    checkLocationRef.current = checkLocation;
    refreshStatusRef.current = refreshStatus;
  }, [checkLocation, refreshStatus]);

  // Initial load
  useEffect(() => {
    if (isAuthenticated) {
      refreshStatus();
    }
  }, [isAuthenticated, refreshStatus]);

  // Re-sync when user object changes (e.g. from sharing toggle)
  useEffect(() => {
    if (user) {
      setStatus(prev => ({
        ...prev,
        isInside: user.is_sharing_enabled ? user.is_inside : false,
        lastCheckAt: user.last_check_at ? new Date(user.last_check_at) : prev.lastCheckAt,
      }));
    }
  }, [user]);

  // 🔥 Reactive Geofencing: Only register if we have background access
  useEffect(() => {
    const syncGeofences = async () => {
      // If NOT authenticated, don't even try
      if (!isAuthenticated) return;

      // Master Killswitch + Permissions Logic
      const shouldBeActive = permissionStatus === PERMISSION_STATUS.GRANTED && user?.isSharingEnabled !== false;

      try {
        if (shouldBeActive) {
          const { backgroundGranted } = await verifyLocationPermissions();
          
          if (backgroundGranted) {
            console.log('[LocationStatusContext] Sharing Active + Perms OK → Registering geofences.');
            const { registerGeofences } = await import('../tasks/geofenceTask');
            const boundaries = await locationService.getBoundaries();
            await registerGeofences(boundaries);
            return;
          }
        }
        
        // Otherwise, stop geofencing (either sharing is paused OR perm is foreground-only)
        console.log('[LocationStatusContext] Sharing Paused or FG-only → Stopping geofences (Killswitch).');
        const { GEOFENCE_TASK } = await import('../tasks/geofenceTask');
        const TaskManager = await import('expo-task-manager');
        const isRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK);
        if (isRegistered) {
          await Location.stopGeofencingAsync(GEOFENCE_TASK);
        }
      } catch (err) {
        console.warn('[LocationStatusContext] Geofence sync failed:', err.message);
      }
    };

    syncGeofences();
  }, [isAuthenticated, permissionStatus, verifyLocationPermissions, user?.isSharingEnabled]);

  return (
    <LocationStatusContext.Provider value={{
      ...status,
      isStale,
      checkLocation,
      loading,
      refreshStatus,
      permissionStatus,
      permissionError,
      verifyLocationPermissions,
      requestLocationPermissions,
    }}>
      {children}
    </LocationStatusContext.Provider>
  );
};

export const useLocationStatus = () => {
  const context = useContext(LocationStatusContext);
  if (!context) {
    throw new Error('useLocationStatus must be used within a LocationStatusProvider');
  }
  return context;
};
