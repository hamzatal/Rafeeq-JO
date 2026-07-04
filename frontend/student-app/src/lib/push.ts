import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { api } from './api';

/**
 * Push notifications (Firebase Cloud Messaging via the native device token).
 *
 * IMPORTANT (Expo Go): the remote-push API of `expo-notifications` was REMOVED
 * from Expo Go with SDK 53. Importing the module at top level THROWS inside
 * Expo Go and would crash the whole app. So we load it LAZILY and treat any
 * failure as "push unavailable" — the app runs fully; push simply only works in
 * a development/production build. Never crashes the app.
 */

let registeredToken: string | null = null;
let handlerSet = false;

/** Lazily load expo-notifications; returns null on web / Expo Go / any failure. */
async function loadNotifications(): Promise<any | null> {
  if (Platform.OS === 'web') return null;
  try {
    return await import('expo-notifications');
  } catch {
    return null;
  }
}

/** Foreground behaviour: show banner + list + sound while the app is open. */
async function ensureHandler(Notifications: any): Promise<void> {
  if (handlerSet) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    handlerSet = true;
  } catch {
    /* ignore */
  }
}

/** Channels must match backend NotificationType->channelId(). */
async function ensureAndroidChannels(Notifications: any): Promise<void> {
  if (Platform.OS !== 'android') return;
  const I = Notifications.AndroidImportance;
  const channels = [
    { id: 'rafeeq_default', name: 'إشعارات عامة', importance: I.DEFAULT },
    { id: 'rafeeq_trips', name: 'الرحلات', importance: I.HIGH },
    { id: 'rafeeq_rides', name: 'طلبات الرحلات', importance: I.MAX },
    { id: 'rafeeq_payments', name: 'المدفوعات والمحفظة', importance: I.HIGH },
    { id: 'rafeeq_critical', name: 'تنبيهات حرجة وأمان', importance: I.MAX },
  ];
  for (const c of channels) {
    await Notifications.setNotificationChannelAsync(c.id, {
      name: c.name,
      importance: c.importance,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2F6BFF',
      enableVibrate: true,
    });
  }
}

/**
 * Register this device for push and send the token to the backend.
 * Safe to call repeatedly; no-ops on web / Expo Go / simulators.
 */
export async function registerForPush(): Promise<void> {
  try {
    if (Platform.OS === 'web' || !Device.isDevice) return;
    const Notifications = await loadNotifications();
    if (!Notifications) return; // Expo Go / unavailable

    await ensureHandler(Notifications);
    await ensureAndroidChannels(Notifications);

    const current = await Notifications.getPermissionsAsync();
    let granted =
      current.granted ||
      current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

    if (!granted) {
      const requested = await Notifications.requestPermissionsAsync();
      granted = requested.granted;
    }
    if (!granted) return;

    const { data: token } = await Notifications.getDevicePushTokenAsync();
    if (!token || typeof token !== 'string' || token === registeredToken) return;

    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    await api.notifications.registerDevice(token, platform);
    registeredToken = token;
  } catch (err) {
    // Push is a non-essential side-effect: never break the app over it.
    console.warn('[push] registration skipped', err);
  }
}

/** Remove this device's token on logout so it stops receiving pushes. */
export async function unregisterPush(): Promise<void> {
  try {
    if (registeredToken) {
      await api.notifications.unregisterDevice(registeredToken);
      registeredToken = null;
    }
  } catch {
    // ignore — best effort
  }
}

/**
 * Listen for the user tapping a notification (for deep-linking).
 * Returns an unsubscribe function. Lazily attaches; no-ops in Expo Go.
 */
export function onNotificationTap(handler: (data: Record<string, unknown>) => void): () => void {
  let sub: { remove: () => void } | null = null;
  let cancelled = false;
  (async () => {
    const Notifications = await loadNotifications();
    if (!Notifications || cancelled) return;
    try {
      sub = Notifications.addNotificationResponseReceivedListener((response: any) => {
        const data = (response?.notification?.request?.content?.data ?? {}) as Record<string, unknown>;
        handler(data);
      });
    } catch {
      /* ignore */
    }
  })();
  return () => {
    cancelled = true;
    try {
      sub?.remove();
    } catch {
      /* ignore */
    }
  };
}
