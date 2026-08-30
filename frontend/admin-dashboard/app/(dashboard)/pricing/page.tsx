'use client';

import { TabbedPage } from '../../../src/components/TabbedPage';
import { TariffView } from '../../../src/views/TariffView';
import { PlansView } from '../../../src/views/PlansView';
import { SubscriptionsView } from '../../../src/views/SubscriptionsView';
import { CouponsView } from '../../../src/views/CouponsView';

/**
 * التسعير والخطط — the tariff, the plans sold against it, who is subscribed, and the
 * coupons that discount both.
 *
 * Phase 9 made a plan a DISCOUNT rather than a gate, which is what makes this one
 * destination instead of four: a plan's price is only defensible next to the tariff it
 * discounts, and a coupon is a third adjustment to the same number.
 */
export default function PricingPage() {
  return (
    <TabbedPage
      href="/pricing"
      render={(tab) =>
        tab === 'plans' ? (
          <PlansView />
        ) : tab === 'subscriptions' ? (
          <SubscriptionsView />
        ) : tab === 'coupons' ? (
          <CouponsView />
        ) : (
          <TariffView />
        )
      }
    />
  );
}
