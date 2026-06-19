import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { api } from './api';

/**
 * Push notifications (Firebase Cloud Messaging via the native device token).
 *
 * Design principles (matches Rafeeq's resilience policy):
 *  - Never crashes the app: every step is guarded; on web / simulator / when
 *    Firebase isn't configured yet it simply no-ops.
 *  - Uses the NATIVE device push token (FCM on Android, APNs on iOS) so it
 *    matches the backend FcmPushGateway, which sends straight to FCM v1.
 *  - Android channels mirror the backend NotificationType.channelId() values
 *    so each category gets the right sound + importance (incl. loud ride
 *    offers for captains and critical safety alerts).
 */

// Foreground behaviour: show the alert AND play the sound while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

let registeredToken: string | null = null;

interface ChannelSpec {
  id: string;
  name: string;
  importance: Notifications.AndroidImportance;
}

/** Channels must match backend NotificationType->channelId(). */
const CHANNELS: ChannelSpec[] = [
  { id: 'rafeeq_default', name: 'إشعارات عامة', importance: Notifications.AndroidImportance.DEFAULT },
  { id: 'rafeeq_trips', name: 'الرحلات', importance: Notifications.AndroidImportance.HIGH },
  { id: 'rafeeq_rides', name: 'طلبات الرحلات', importance: Notifications.AndroidImportance.MAX },
  { id: 'rafeeq_payments', name: 'المدفوعات والمحفظة', importance: Notifications.AndroidImportance.HIGH },
  { id: 'rafeeq_critical', name: 'تنبيهات حرجة وأمان', importance: Notifications.AndroidImportance.MAX },
];

async function ensureAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  for (const c of CHANNELS) {
    await Notifications.setNotificationChannelAsync(c.id, {
      name: c.name,
      importance: c.importance,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0B7A43',
      enableVibrate: true,
    });
  }
}

/**
 * Register this device for push and send the token to the backend.
 * Safe to call repeatedly; it only re-registers when the token changes.
 */
export async function registerForPush(): Promise<void> {
  try {
    // No native push on web or simulators/emulators.
    if (Platform.OS === 'web' || !Device.isDevice) return;

    await ensureAndroidChannels();

    const current = await Notifications.getPermissionsAsync();
    let granted =
      current.granted ||
      current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

    if (!granted) {
      const requested = await Notifications.requestPermissionsAsync();
      granted = requested.granted;
    }
    if (!granted) return;

    // Native token (FCM on Android, APNs on iOS) — matches the backend gateway.
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
 * Returns an unsubscribe function. No-ops gracefully on failure.
 */
export function onNotificationTap(handler: (data: Record<string, unknown>) => void): () => void {
  try {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = (response.notification.request.content.data ?? {}) as Record<string, unknown>;
      handler(data);
    });
    return () => sub.remove();
  } catch {
    return () => undefined;
  }
}
