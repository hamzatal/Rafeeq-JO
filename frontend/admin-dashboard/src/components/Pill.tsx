'use client';

import { Icon } from './Icon';

/* ═══════════════════════════════════════════════════════════════════════════
   STATUS PILLS — one implementation, six tones.

   `docs/design/v2/06-admin-3` marks every row state with a small filled pill, and the
   tone carries meaning rather than decoration:

     open      مفتوحة · بانتظار الردّ        amber   — waiting on US
     progress  قيد المعالجة · مُحوّلة لنزاع   blue    — someone is on it
     done      مُغلقة · نجح                  green   — finished, no action
     urgent    عاجل · فشل                    red     — act now
     neutral   استفسار · حساب                grey    — a label, not a state
     brand     نوع الطلب                     brand   — a classification

   ── Why this replaced per-page markup ─────────────────────────────────────

   The same pill was being hand-written in each table with its own colour choice, so
   «مفتوحة» was amber on one page and blue on another — and a colour that means two
   things means nothing. Worse, several carried colour ALONE, which is a WCAG 1.4.1
   failure: an operator with low colour discrimination could not tell a resolved row
   from an urgent one. Every tone here pairs its colour with an optional icon, and the
   text always states the status in words.
   ═══════════════════════════════════════════════════════════════════════════ */

export type PillTone = 'open' | 'progress' | 'done' | 'urgent' | 'neutral' | 'brand';

const TONES: Record<PillTone, string> = {
  open: 'bg-warning/10 text-warning',
  progress: 'bg-info/10 text-info',
  done: 'bg-success/10 text-success',
  urgent: 'bg-danger/10 text-danger',
  neutral: 'bg-neutral-100 text-muted',
  brand: 'bg-brand-100 text-primary-dark',
};

export interface PillProps {
  tone?: PillTone;
  /** A Lucide name. Colour alone must not carry the meaning. */
  icon?: string;
  children: React.ReactNode;
}

export function Pill({ tone = 'neutral', icon, children }: PillProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${TONES[tone]}`}
    >
      {icon ? <Icon name={icon} size={13} /> : null}
      {children}
    </span>
  );
}
