import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import type { RafeeqApi } from '@rafeeq/api-client';
import { brand } from '@rafeeq/tokens';

/**
 * Push notifications — Firebase Cloud Messaging via the NATIVE device token.
 *
 * The native token (FCM on Android, APNs on iOS) is what the backend's
 * `FcmPushGateway` expects, since it posts straight to FCM v1. An Expo push token
 * would need Expo's relay and would not reach that gateway at all.
 *
 * Resilience: every step is guarded. On web, on a simulator, or before Firebase
 * is configured this no-ops. Push is a side effect — it must never be the reason
 * the app fails to start.
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

let registeredToken: string | null = null;

export interface ChannelSpec {
  /** MUST match the backend's `NotificationType->channelId()`. */
  id: string;
  /** Shown in the Android system settings, so it is a translated string. */
  name: string;
  importance: Notifications.AndroidImportance;
  /**
   * Vibration pattern in ms, `[delay, vibrate, pause, vibrate, …]`.
   *
   * Per channel because it carries meaning: a captain's incoming-offer buzz is
   * longer and double-pulsed so it is distinguishable from a wallet notification
   * without looking at the phone — which is the whole point while driving.
   */
  vibrationPattern?: number[];
}

/**
 * The channels every app defines, with a shared default vibration.
 *
 * Channel ids are FIXED — the backend addresses them by name — but the display
 * names are user-visible Arabic, and the two apps legitimately word them
 * differently: the same `rafeeq_payments` channel is «المدفوعات والمحفظة» to a
 * student and «الأرباح والمحفظة» to a captain. So the ids live here and the names
 * are passed in.
 */
export const DEFAULT_VIBRATION = [0, 250, 250, 250];

async function ensureAndroidChannels(channels: ChannelSpec[]): Promise<void> {
  if (Platform.OS !== 'android') return;

  for (const c of channels) {
    await Notifications.setNotificationChannelAsync(c.id, {
      name: c.name,
      importance: c.importance,
      sound: 'default',
      vibrationPattern: c.vibrationPattern ?? DEFAULT_VIBRATION,
      lightColor: brand[500],
      enableVibrate: true,
    });
  }
}

/**
 * Register this device for push and send the token to the backend.
 *
 * Safe to call repeatedly; re-registers only when the token actually changes.
 */
export async function registerForPush(api: RafeeqApi, channels: ChannelSpec[]): Promise<void> {
  try {
    if (Platform.OS === 'web' || !Device.isDevice) return;

    await ensureAndroidChannels(channels);

    const current = await Notifications.getPermissionsAsync();
    let granted = current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

    if (!granted) {
      const requested = await Notifications.requestPermissionsAsync();
      granted = requested.granted;
    }
    if (!granted) return;

    const { data: token } = await Notifications.getDevicePushTokenAsync();
    if (!token || typeof token !== 'string' || token === registeredToken) return;

    await api.notifications.registerDevice(token, Platform.OS === 'ios' ? 'ios' : 'android');
    registeredToken = token;
  } catch (err) {
    console.warn('[push] registration skipped', err);
  }
}

/** Drop this device's token on logout so it stops receiving pushes. */
export async function unregisterPush(api: RafeeqApi): Promise<void> {
  try {
    if (registeredToken) {
      await api.notifications.unregisterDevice(registeredToken);
      registeredToken = null;
    }
  } catch {
    /* best effort — the token expires server-side anyway */
  }
}

/**
 * Listen for a notification tap, for deep-linking. Returns an unsubscribe.
 */
export function onNotificationTap(handler: (data: Record<string, unknown>) => void): () => void {
  try {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      handler((response.notification.request.content.data ?? {}) as Record<string, unknown>);
    });

    return () => sub.remove();
  } catch {
    return () => undefined;
  }
}
