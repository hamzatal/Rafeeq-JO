'use client';

import { TabbedPage } from '../../../src/components/TabbedPage';
import { TicketsView } from '../../../src/views/TicketsView';
import { ComplaintsView } from '../../../src/views/ComplaintsView';

/**
 * الدعم والشكاوى — one inbox for the two things a user can send when something is
 * wrong. They were two sidebar entries and one queue in practice: a complaint that
 * needs a reply is a ticket, and a ticket about a captain is a complaint.
 */
export default function SupportPage() {
  return (
    <TabbedPage
      href="/support"
      render={(tab) => (tab === 'complaints' ? <ComplaintsView /> : <TicketsView />)}
    />
  );
}
