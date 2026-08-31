'use client';

/* ═══════════════════════════════════════════════════════════════════════════
   A panel — `.apanel` from `docs/design/src/06-admin-1.html`.

     .apanel { background:var(--n0); border:1px solid var(--n200); border-radius:14px }
     .aph    { padding:11px 14px; border-bottom:1px solid var(--n200) }

   Radius 14, not the 16 of `--r-card`: the admin surface was densified in
   `09-density.html` and the panels came down with everything else. A titled panel is
   the reference's unit of composition on every page, so it is one component rather than
   a `div` with five classes repeated twenty times.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface PanelProps {
  /** Rendered in `.aph`. Omit for a panel that is only a table. */
  title?: string;
  /** Sits at the far end of the title row. */
  action?: React.ReactNode;
  /** `false` when the body is a table, which brings its own cell padding. */
  padded?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Panel({ title, action, padded = false, className = '', children }: PanelProps) {
  return (
    <div className={`bg-surface border border-line rounded-[14px] overflow-hidden ${className}`}>
      {title ? (
        <div className="px-[14px] py-[11px] border-b border-line flex items-center gap-2">
          <span className="text-[15px] font-bold surface-text">{title}</span>
          {action ? <div className="ms-auto">{action}</div> : null}
        </div>
      ) : null}
      <div className={padded ? 'px-[14px] py-3' : ''}>{children}</div>
    </div>
  );
}
