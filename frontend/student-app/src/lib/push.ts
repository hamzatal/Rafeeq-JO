import * as Notifications from 'expo-notifications';
import { t } from '@rafeeq/shared';
import {
  getApiLocale,
  onNotificationTap,
  registerForPush as register,
  unregisterPush as unregister,
  type ChannelSpec,
} from '@rafeeq/ui';
import { api } from './api';

/**
 * Where each notification type takes a STUDENT.
 *
 * `onNotificationTap` existed, was exported three levels up, and was never called —
 * so every push in the product opened the app on whatever screen it was last on and
 * the `data` payload was thrown away. Worst for the ones that matter: «الكابتن وصل»
 * took a rider to their wallet if that is where they happened to be.
 *
 * The live trip is a STATE of `home` (see `docs/design/SCREENS.md`), so every
 * trip-shaped notification lands there rather than on a route that does not exist.
 * A type with no entry here is deliberately ignored: opening the app somewhere
 * arbitrary is worse than opening it where the user left it.
 */
const ROUTES: Record<string, string> = {
  ride_matched: '/(app)/home',
  trip_scheduled: '/(app)/home',
  trip_started: '/(app)/home',
  trip_cancelled: '/(app)/home',
  boarding_confirmed: '/(app)/home',
  dropoff_confirmed: '/(app)/home',
  trip_completed: '/(app)/trips',
  rating_request: '/(app)/trips',
  payment_approved: '/(app)/wallet',
  payment_rejected: '/(app)/wallet',
  payment_under_review: '/(app)/wallet',
  wallet_credited: '/(app)/wallet',
  wallet_low_balance: '/(app)/wallet',
  subscription_activated: '/(app)/subscriptions',
  sos_triggered: '/(app)/emergency',
  account_frozen: '/(app)/support',
  /* A broadcast may carry `coupon_code`, which the inbox renders as an activate chip. */
  general: '/(app)/notifications',
};

export function subscribeToNotificationTaps(
  navigate: (path: string, params?: Record<string, string>) => void,
): () => void {
  return onNotificationTap(ROUTES, navigate);
}

/**
 * This app's Android notification channels.
 *
 * The ids are fixed — the backend's `NotificationType->channelId()` addresses them
 * by name — but the display names are user-visible Arabic and belong to the
 * student's vocabulary. The captain app names the same `rafeeq_payments` channel
 * «الأرباح والمحفظة», because to a captain it is income, not spending.
 *
 * Resolved at CALL time, not at module load: channel names appear in the Android
 * system settings, so they have to be in the language the user picked, and the
 * locale is not known when this module is first imported.
 */
function channels(): ChannelSpec[] {
  const locale = getApiLocale();
  const name = (key: string) => t(locale, `push.${key}`);

  return [
    { id: 'rafeeq_default', name: name('general'), importance: Notifications.AndroidImportance.DEFAULT },
    { id: 'rafeeq_trips', name: name('trips'), importance: Notifications.AndroidImportance.HIGH },
    { id: 'rafeeq_rides', name: name('rides'), importance: Notifications.AndroidImportance.MAX },
    { id: 'rafeeq_payments', name: name('payments'), importance: Notifications.AndroidImportance.HIGH },
    { id: 'rafeeq_critical', name: name('critical'), importance: Notifications.AndroidImportance.MAX },
  ];
}

export const registerForPush = () => register(api, channels());
export const unregisterPush = () => unregister(api);
