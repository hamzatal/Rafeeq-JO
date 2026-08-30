'use client';

import { TabbedPage } from '../../../src/components/TabbedPage';
import { SessionsView } from '../../../src/views/SessionsView';
import { AuditView } from '../../../src/views/AuditView';

/**
 * الأمان والتدقيق — who can get in, and what everyone did once inside.
 *
 * The audit log is the record of the actions the MFA settings on the other tab
 * protect; reading one without the other answers half a question.
 */
export default function SecurityPage() {
  return (
    <TabbedPage
      href="/security"
      render={(tab) => (tab === 'audit' ? <AuditView /> : <SessionsView />)}
    />
  );
}
