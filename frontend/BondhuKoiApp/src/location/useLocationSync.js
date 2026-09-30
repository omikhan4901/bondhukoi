import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { permissionStatus, reportNow, syncZones } from './location';
import { keys } from '../lib/queries';
import { config } from '../lib/config';

const MIN_GAP_MS = 5 * 60_000;

/**
 * While signed in: sends a reading when the app opens (at most every 5 minutes) and keeps
 * the OS zone watching up to date. Call `refresh()` after zones change.
 */
export function useLocationSync(enabled) {
  const client = useQueryClient();
  const last = useRef(0);

  const refresh = useCallback(
    async ({ force = false } = {}) => {
      if (!enabled || config.demo) return;
      if (!force && Date.now() - last.current < MIN_GAP_MS) return;
      const { foreground } = await permissionStatus();
      if (!foreground) return;
      last.current = Date.now();
      try {
        await reportNow();
        await syncZones();
        client.invalidateQueries({ queryKey: keys.myPresence });
      } catch {
        // Offline or signed out: the next open tries again.
      }
    },
    [enabled, client],
  );

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);

  return refresh;
}
