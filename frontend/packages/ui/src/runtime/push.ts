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
    /*
     * Best effort, and the token is NOT guaranteed to go away on its own.
     *
     * This used to say "the token expires server-side anyway". It did not: nothing
     * pruned `device_tokens`, `last_used_at` was written once at registration and never
     * again, and `RetentionPolicy` had no entry for the table. The backend now deletes a
     * token the moment FCM answers `UNREGISTERED`, so an abandoned one is cleaned up on
     * the next send rather than never — but a failed unregister still means this handset
     * keeps receiving pushes until then.
     */
  }
}

/**
 * Route a notification tap to the screen the notification is about.
 *
 * ── Why this needed a router, not just a listener ──────────────────────────
 *
 * The listener existed. It was exported from this file, re-exported by `packages/ui`,
 * re-exported again by both apps' `push.ts` — and **never called**. So every push in
 * the product opened the app on whatever screen it was last on, and the `data` payload
 * the backend has always attached (`type`, `coupon_code`, …) was delivered to the
 * device and thrown away.
 *
 * That is worst for the notifications that matter most: «الكابتن وصل» took a rider to
 * their wallet if that is where they happened to be, and a captain's incoming offer —
 * which expires on a countdown — took them nowhere at all.
 *
 * ── Why the mapping is a table passed in ───────────────────────────────────
 *
 * The `type` values are shared (`Shared\Enums\NotificationType`) but the destinations
 * are not: `ride_offer` is a captain's full-screen offer and has no student equivalent,
 * and `payment_approved` is the student wallet against the captain's earnings screen.
 * A single map here would need to know which app it is in, which is the coupling
 * `packages/ui` exists to avoid.
 *
 * @param routes  notification `type` → route path. A type with no entry is ignored
 *                rather than sent somewhere arbitrary.
 * @param navigate  the app's router push.
 */
export function onNotificationTap(
  routes: Record<string, string>,
  navigate: (path: string, params?: Record<string, string>) => void,
): () => void {
  try {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = (response.notification.request.content.data ?? {}) as Record<string, unknown>;
      const type = typeof data.type === 'string' ? data.type : null;
      const path = type ? routes[type] : undefined;
      if (!path) return;

      /*
       * Only string values are forwarded. FCM stringifies every `data` value on the
       * wire anyway, and expo-router params must be strings — passing an object
       * through would serialise as "[object Object]" in the URL.
       */
      const params: Record<string, string> = {};
      for (const [key, value] of Object.entries(data)) {
        if (key !== 'type' && typeof value === 'string') params[key] = value;
      }

      navigate(path, params);
    });

    return () => sub.remove();
  } catch {
    return () => undefined;
  }
}
