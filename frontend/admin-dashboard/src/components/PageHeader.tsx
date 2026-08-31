'use client';

/* ═══════════════════════════════════════════════════════════════════════════
   THE PAGE HEADER — every page in `docs/design/v2/06-admin-1/2/3` opens with one.

   Three parts, and the middle one is the point:

     title      what this page is
     subtitle   a FACTUAL line of counts, not a slogan — «9 تذاكر مفتوحة · الشكاوى
                مدموجة في نفس الطابور», «126 كابتناً · 6 بانتظار التوثيق · 48 متصل الآن»
     actions    an outline button and at most one filled one, on the far side

   The subtitle is what makes the header worth the vertical space. A heading that
   repeats the sidebar label costs 80px and tells an operator nothing; the same strip
   carrying today's numbers answers "is there anything for me here?" before they read
   the table. So `subtitle` takes nodes, not a string — the counts inside it are real
   values that need `<Num>` and their own emphasis.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface PageHeaderProps {
  title: string;
  /** The factual line. Omitted only when the page genuinely has no counts to state. */
  subtitle?: React.ReactNode;
  /** Buttons, in reading order. Rendered on the far side of the title. */
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold font-display surface-text">{title}</h1>
        {subtitle ? <p className="text-sm text-muted mt-1">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2 shrink-0">{actions}</div> : null}
    </div>
  );
}
