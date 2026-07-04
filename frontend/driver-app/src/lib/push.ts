import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { api } from './api';

/**
 * Push notifications for the captain app (Firebase Cloud Messaging via the
 * native device token).
 *
 * Captains rely on LOUD, high-importance alerts for incoming ride offers, so
 * the `rafeeq_rides` channel uses MAX importance + sound. Mirrors the backend
 * NotificationType->channelId() values.
 *
 * Resilience: every step is guarded — on web / simulator / missing Firebase
 * config it no-ops and never crashes the app.
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    // SDK 52+ split the foreground alert into banner + list.
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let registeredToken: string | null = null;

interface ChannelSpec {
  id: string;
  name: string;
  importance: Notifications.AndroidImportance;
}

const CHANNELS: ChannelSpec[] = [
  { id: 'rafeeq_default', name: 'إشعارات عامة', importance: Notifications.AndroidImportance.DEFAULT },
  { id: 'rafeeq_trips', name: 'الرحلات', importance: Notifications.AndroidImportance.HIGH },
  { id: 'rafeeq_rides', name: 'طلبات الرحلات الواردة', importance: Notifications.AndroidImportance.MAX },
  { id: 'rafeeq_payments', name: 'الأرباح والمحفظة', importance: Notifications.AndroidImportance.HIGH },
  { id: 'rafeeq_critical', name: 'تنبيهات حرجة وأمان', importance: Notifications.AndroidImportance.MAX },
];

async function ensureAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  for (const c of CHANNELS) {
    await Notifications.setNotificationChannelAsync(c.id, {
      name: c.name,
      importance: c.importance,
      sound: 'default',
      vibrationPattern: [0, 300, 200, 300],
      lightColor: '#2F6BFF',
      enableVibrate: true,
    });
  }
}

export async function registerForPush(): Promise<void> {
  try {
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

    const { data: token } = await Notifications.getDevicePushTokenAsync();
    if (!token || typeof token !== 'string' || token === registeredToken) return;

    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    await api.notifications.registerDevice(token, platform);
    registeredToken = token;
  } catch (err) {
    console.warn('[push] registration skipped', err);
  }
}

export async function unregisterPush(): Promise<void> {
  try {
    if (registeredToken) {
      await api.notifications.unregisterDevice(registeredToken);
      registeredToken = null;
    }
  } catch {
    // best effort
  }
}

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
