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

export { onNotificationTap };

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
