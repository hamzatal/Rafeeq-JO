'use client';

import { TabbedPage } from '../../../src/components/TabbedPage';
import { StaffView } from '../../../src/views/StaffView';
import { CliqView } from '../../../src/views/CliqView';
import { BroadcastView } from '../../../src/views/BroadcastView';
import { AdsView } from '../../../src/views/AdsView';

/**
 * الإعدادات والموظفون — the platform's own configuration: who operates it, where its
 * money arrives, what it says to users, and what it advertises to them.
 *
 * All four were admin-only entries scattered across two groups. Grouping them is also
 * what makes the permission legible: this destination is the one an ordinary staff
 * member cannot open, rather than four pages that each refuse for their own reason.
 */
export default function SettingsPage() {
  return (
    <TabbedPage
      href="/settings"
      render={(tab) =>
        tab === 'cliq' ? (
          <CliqView />
        ) : tab === 'broadcast' ? (
          <BroadcastView />
        ) : tab === 'ads' ? (
          <AdsView />
        ) : (
          <StaffView />
        )
      }
    />
  );
}
