import * as Notifications from 'expo-notifications';
import { t } from '@rafeeq/shared';
import {
  onNotificationTap,
  registerForPush as register,
  unregisterPush as unregister,
  getApiLocale,
  type ChannelSpec,
} from '@rafeeq/ui';
import { api } from './api';

/**
 * Where each notification type takes a CAPTAIN.
 *
 * Deliberately not the same table as the student app: `ride_offer` is a captain's
 * countdown screen with no student equivalent, and `payment_approved` means income
 * here and spending there. That divergence is why the map is passed into
 * `onNotificationTap` rather than living inside `packages/ui`.
 */
const ROUTES: Record<string, string> = {
  ride_offer: '/(app)/offers',
  ride_matched: '/(app)/offers',
  trip_scheduled: '/(app)/trips',
  trip_started: '/(app)/trips',
  trip_cancelled: '/(app)/trips',
  boarding_confirmed: '/(app)/trips',
  dropoff_confirmed: '/(app)/trips',
  trip_completed: '/(app)/earnings',
  payment_approved: '/(app)/earnings',
  /* Was '/(app)/invoices', which is now a section of the one money screen. These
     two taps were the ONLY way to reach that screen — nothing in either app linked
     to it — so repointing them is what keeps a rejected top-up reachable at all. */
  payment_rejected: '/(app)/earnings',
  payment_under_review: '/(app)/earnings',
  wallet_credited: '/(app)/earnings',
  /* Was '/(app)/settings', merged into '/(app)/account'. */
  account_frozen: '/(app)/account',
  general: '/(app)/dashboard',
};

export function subscribeToNotificationTaps(
  navigate: (path: string, params?: Record<string, string>) => void,
): () => void {
  return onNotificationTap(ROUTES, navigate);
}

/**
 * The captain's channels.
 *
 * Two differences from the student app, both intentional:
 *
 *   • `rafeeq_rides` is «طلبات الرحلات الواردة» and `rafeeq_payments` is «الأرباح
 *     والمحفظة» — the same channel ids, the captain's vocabulary.
 *   • the incoming-offer channel vibrates `[0, 300, 200, 300]` rather than the
 *     default `[0, 250, 250, 250]`. A longer double pulse is distinguishable from
 *     a wallet notification WITHOUT looking at the phone, which is the entire point
 *     while driving.
 */
function channels(): ChannelSpec[] {
  const locale = getApiLocale();
  const name = (key: string) => t(locale, `push.${key}`);

  return [
    { id: 'rafeeq_default', name: name('general'), importance: Notifications.AndroidImportance.DEFAULT },
    { id: 'rafeeq_trips', name: name('trips'), importance: Notifications.AndroidImportance.HIGH },
    {
      id: 'rafeeq_rides',
      name: name('ridesDriver'),
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 300, 200, 300],
    },
    { id: 'rafeeq_payments', name: name('paymentsDriver'), importance: Notifications.AndroidImportance.HIGH },
    { id: 'rafeeq_critical', name: name('critical'), importance: Notifications.AndroidImportance.MAX },
  ];
}

export const registerForPush = () => register(api, channels());
export const unregisterPush = () => unregister(api);
