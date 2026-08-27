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

export { onNotificationTap };

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
