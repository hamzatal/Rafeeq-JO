'use client';

import { useT } from '../lib/i18n';
import { PageHeader } from './PageHeader';
import { NAV_ITEMS, PROFILE } from '../lib/nav';

/* ═══════════════════════════════════════════════════════════════════════════
   A page header that takes its words from `nav.ts`.

   ── Why the title is not a prop ───────────────────────────────────────────

   Eleven pages opened with a hand-written `<h1>`, and they had already drifted three
   ways: `text-2xl font-bold surface-text`, the same with `mb-4`, and `page-title`. Some
   read their label from the dictionary, some had the Arabic inline — so «الكباتن» and
   «المدفوعات» could be renamed in the sidebar and stay stale on their own page.

   Passing an `href` instead means the heading, the sidebar entry and the command palette
   result are the same two strings by construction. `TabbedPage` already worked this way;
   this is the flat-page half of it.

   ── `stat` is where the real number goes ──────────────────────────────────

   The approved headers carry a factual line — «126 كابتناً · 6 بانتظار التوثيق». The
   purpose sentence comes from `nav.hint.*`; anything the page has actually COUNTED goes
   in `stat`, and appears before it. Pages pass it only once their data has loaded, so a
   count never renders as a zero that means "still fetching".
   ═══════════════════════════════════════════════════════════════════════════ */

export interface NavPageHeaderProps {
  /** The destination's href, e.g. `/drivers`. Looked up in `nav.ts`. */
  href: string;
  /** A counted phrase from loaded data. Omit until it is true. */
  stat?: React.ReactNode;
  actions?: React.ReactNode;
}

export function NavPageHeader({ href, stat, actions }: NavPageHeaderProps) {
  const { t } = useT();
  const item = [...NAV_ITEMS, PROFILE].find((entry) => entry.href === href);

  if (!item) return null;

  return (
    <PageHeader
      title={t(item.labelKey)}
      subtitle={
        stat ? (
          <>
            <span className="font-semibold surface-text">{stat}</span>
            <span className="mx-2 text-line">·</span>
            {t(item.hintKey)}
          </>
        ) : (
          t(item.hintKey)
        )
      }
      actions={actions}
    />
  );
}
