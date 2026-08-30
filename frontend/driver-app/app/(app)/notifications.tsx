import { NotificationsInbox } from '@rafeeq/ui';
import { api } from '../../src/lib/api';

/*
 * The screen the five bells needed.
 *
 * The captain app had bell icons in five headers — dashboard, trips, wallet,
 * profile, settings — that were `<Pressable>` with no `onPress`, then demoted to
 * inert `<View>`s in phase 7 because there was nothing to open. A captain who
 * missed the tap on «تم رفض دفعتك» had no route to that information at all.
 *
 * No `onActivateCoupon`: a ride coupon is a student's to spend, and a button that
 * does nothing is the bug this screen exists to fix.
 */
export default function Notifications() {
  return <NotificationsInbox api={api} />;
}
