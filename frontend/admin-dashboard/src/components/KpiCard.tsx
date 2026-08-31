'use client';

import { Num } from './Num';

/* ═══════════════════════════════════════════════════════════════════════════
   A KPI card — `.akpi` from `docs/design/src/06-admin-1.html`.

     .akpi { background:var(--n0); border:1px solid var(--n200); border-radius:14px;
             padding:13px 14px }
     .abar { height:6px; border-radius:999px; background:var(--n100) }

   Label (`t-label`, n500) · value (`t-display` 26/32 700, with an optional unit in
   `t-label`) · a 6px bar · a caption in `t-caption` weight 500, COLOURED BY MEANING:
   green when ahead, n600 when neutral, amber when short of target, red when breaching.

   ── The bar needs a denominator, and the caption must name it ──────────────

   The reference captions read «74% من هدف اليوم» and «38% — أقل من المستهدف 50%»: a
   percentage and the thing it is a percentage OF. An earlier version of this dashboard
   held four hand-typed constants (0.75, 0.8, 0.6, 0.3) that were never even rendered.
   So `share` here is a real ratio and `caption` states its denominator — and a card with
   neither gets no bar, rather than a filled one that means nothing.
   ═══════════════════════════════════════════════════════════════════════════ */

export type KpiTone = 'good' | 'neutral' | 'warn' | 'bad';

const CAPTION: Record<KpiTone, string> = {
  good: 'text-success',
  neutral: 'text-neutral-600',
  warn: 'text-warning',
  bad: 'text-danger',
};

const BAR: Record<KpiTone, string> = {
  good: 'bg-primary',
  neutral: 'bg-primary',
  warn: 'bg-live',
  bad: 'bg-danger',
};

export interface KpiCardProps {
  label: string;
  /** Already formatted — money arrives from `formatJod`, counts from `<Num>`. */
  value: React.ReactNode;
  /** «د.أ», «رحلة» — stays outside the number so it reads on the correct side. */
  unit?: string;
  /** 0..1. Omitted when nothing real divides into this figure. */
  share?: number;
  /** States the denominator. Without one the bar is not drawn. */
  caption?: React.ReactNode;
  tone?: KpiTone;
}

export function KpiCard({ label, value, unit, share, caption, tone = 'neutral' }: KpiCardProps) {
  const percent = share === undefined ? null : Math.round(Math.min(1, Math.max(0, share)) * 100);

  return (
    <div className="bg-surface border border-line rounded-[14px] px-[14px] py-[13px]">
      <span className="text-xs text-neutral-500">{label}</span>

      <div className="flex items-baseline gap-1 mt-px mb-2.5">
        <span className="text-[26px] leading-8 font-bold surface-text tabular-nums">{value}</span>
        {unit ? <span className="text-xs text-neutral-600">{unit}</span> : null}
      </div>

      {percent === null ? null : (
        /* `aria-hidden`: the caption below states the same ratio in words, and a
           progressbar role would make a screen reader read the figure twice. */
        <div aria-hidden="true" className="h-1.5 rounded-full bg-neutral-100 overflow-hidden">
          <div className={`h-full rounded-full ${BAR[tone]}`} style={{ width: `${percent}%` }} />
        </div>
      )}

      {caption ? (
        <div className={`text-[11px] font-medium mt-[5px] ${CAPTION[tone]}`}>
          {percent === null ? null : (
            <>
              <Num percent={percent} />{' '}
            </>
          )}
          {caption}
        </div>
      ) : null}
    </div>
  );
}
