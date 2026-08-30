'use client';

import Link from 'next/link';
import { useT } from '../lib/i18n';
import { Icon } from './Icon';
import type { NavTab } from '../lib/nav';

/* ═══════════════════════════════════════════════════════════════════════════
   The tab strip for a merged destination.

   Phase 10 folded thirteen sidebar entries into five destinations, and these are how
   the facets are reached. Links, not buttons: each tab is a real URL (`?tab=…`), so it
   can be bookmarked, opened in a new tab, and reached by the redirects that keep the
   old paths working. A `useState` strip would have broken all three.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface TabStripProps {
  /** Destination this strip belongs to, e.g. `/geography`. */
  base: string;
  tabs: NavTab[];
  activeKey: string;
  /** Hides `adminOnly` tabs from staff who are not top-level admins. */
  isAdmin: boolean;
}

export function TabStrip({ base, tabs, activeKey, isAdmin }: TabStripProps) {
  const { t } = useT();
  const visible = tabs.filter((tab) => !tab.adminOnly || isAdmin);

  if (visible.length < 2) return null;

  return (
    /*
     * `role="tablist"` with `aria-current` on the active link, rather than
     * `aria-selected`: these are links that navigate, not tab widgets that swap panels
     * in place, and announcing them as the latter would promise keyboard behaviour
     * (arrow-key cycling) that a set of links does not have.
     */
    <div role="tablist" aria-label={t('palette.pages')} className="flex items-center gap-1 border-b border-line mb-6 -mx-1 px-1 overflow-x-auto">
      {visible.map((tab) => {
        const active = tab.key === activeKey;

        return (
          <Link
            key={tab.key}
            href={`${base}?tab=${tab.key}`}
            aria-current={active ? 'page' : undefined}
            className={[
              'flex items-center gap-2 px-4 py-2.5 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors',
              active
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted hover:text-ink hover:border-line',
            ].join(' ')}
          >
            <Icon name={tab.icon} size={18} strokeWidth={active ? 2.25 : undefined} />
            {t(tab.labelKey)}
          </Link>
        );
      })}
    </div>
  );
}
