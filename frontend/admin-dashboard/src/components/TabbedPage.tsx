'use client';

import { useSearchParams } from 'next/navigation';
import { useAuth } from '../lib/auth';
import { useT } from '../lib/i18n';
import { TabStrip } from './TabStrip';
import { NAV_ITEMS, resolveTab } from '../lib/nav';

/* ═══════════════════════════════════════════════════════════════════════════
   The shell every merged destination shares.

   Five destinations gained tabs in phase 10, and writing the strip, the `?tab=`
   parsing, the admin filter and the heading five times over is how those five drift
   apart — which is exactly what happened to the two navigation lists this phase
   replaced. One shell, one behaviour.

   The tab set comes from `nav.ts`, so the sidebar, the command palette and this
   heading cannot disagree about what a destination contains.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface TabbedPageProps {
  /** The destination's href, e.g. `/geography`. Looked up in `NAV_ITEMS`. */
  href: string;
  /** Rendered for the resolved tab key. */
  render: (tabKey: string) => React.ReactNode;
}

export function TabbedPage({ href, render }: TabbedPageProps) {
  const params = useSearchParams();
  const { user } = useAuth();
  const { t } = useT();

  const item = NAV_ITEMS.find((entry) => entry.href === href);
  const isAdmin = (user?.roles ?? []).includes('admin');

  /*
   * A destination with no entry in `nav.ts` is a programming error, not a user error —
   * say so instead of rendering an empty page that looks like missing data.
   */
  if (!item?.tabs) {
    return <p className="text-danger">{t('common.error')}</p>;
  }

  const tab = resolveTab(item, params.get('tab'));
  if (!tab) return <p className="text-danger">{t('common.error')}</p>;

  // An `adminOnly` tab reached by URL by someone who may not see it falls back to the
  // first tab, rather than rendering a panel the sidebar deliberately hid.
  const allowed = !tab.adminOnly || isAdmin;
  const effective = allowed ? tab : (item.tabs[0] ?? tab);

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold font-display surface-text">{t(item.labelKey)}</h1>
        <p className="text-sm text-muted mt-1">{t(item.hintKey)}</p>
      </div>

      <TabStrip base={href} tabs={item.tabs} activeKey={effective.key} isAdmin={isAdmin} />

      {render(effective.key)}
    </div>
  );
}
