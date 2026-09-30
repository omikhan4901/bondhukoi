import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { router } from 'expo-router';
import { api } from '../lib/api';
import { config } from '../lib/config';

const SUPPORTED = Platform.OS !== 'web';

if (SUPPORTED) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

export async function pushPermission() {
  if (!SUPPORTED) return 'unavailable';
  return (await Notifications.getPermissionsAsync()).status;
}

export async function askPush() {
  if (!SUPPORTED || !Device.isDevice) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', { name: 'BondhuKoi', importance: Notifications.AndroidImportance.DEFAULT });
  }
  const res = await Notifications.requestPermissionsAsync();
  return res.granted;
}

/** Sends this device's push token to the API (only if notifications are allowed). */
export async function registerPushToken() {
  if (!SUPPORTED || !Device.isDevice || config.demo) return;
  if ((await Notifications.getPermissionsAsync()).status !== 'granted') return;
  const { data: token } = await Notifications.getExpoPushTokenAsync(config.easProjectId ? { projectId: config.easProjectId } : undefined);
  await api('/api/me/push-token', { method: 'PUT', body: { token, platform: Platform.OS === 'ios' ? 'ios' : 'android' } });
  return token;
}

export async function unregisterPushToken() {
  if (!SUPPORTED || !Device.isDevice || config.demo) return;
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync(config.easProjectId ? { projectId: config.easProjectId } : undefined);
    await api('/api/me/push-token', { method: 'DELETE', body: { token } });
  } catch {
    // Signing out still works offline.
  }
}

/** Where a tapped notification leads. */
function routeFor(data = {}) {
  if (data.circleId) return `/circle/${data.circleId}`;
  if (data.kind === 'friend_request' || data.kind === 'friend_accepted') return '/friends';
  return '/notifications';
}

/** While signed in: registers the token and opens the right screen when a push is tapped. */
export function usePush(signedIn) {
  useEffect(() => {
    if (!signedIn || !SUPPORTED) return undefined;
    registerPushToken().catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener((res) => {
      router.push(routeFor(res.notification.request.content.data));
    });
    return () => sub.remove();
  }, [signedIn]);
}
