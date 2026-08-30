import { NotificationsInbox } from '@rafeeq/ui';
import { api } from '../../src/lib/api';
import { useCoupon } from '../../src/store/coupon';

export default function Notifications() {
  const activateCoupon = useCoupon((c) => c.activate);

  /*
   * A promo code in a notification is something a STUDENT can spend on a ride, so
   * it is validated against a nominal fare first to confirm it is live before it is
   * stored — otherwise the code is "activated" and then rejected at checkout.
   */
  const onActivateCoupon = async (code: string) => {
    const res = await api.coupons.validate({ code, scope: 'ride', amount_fils: 1500 });
    await activateCoupon(res.code);
  };

  return <NotificationsInbox api={api} onActivateCoupon={onActivateCoupon} />;
}
