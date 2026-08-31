'use client';

import { useEffect, useState } from 'react';
import { Num } from './Num';

/* ═══════════════════════════════════════════════════════════════════════════
   «منذ» — how long this row has been waiting.

   Four of the approved queues carry this column (34 الطلبات الحيّة, 37 المدفوعات,
   38 السلامة, 40 الدعم), and on every one of them it is the column an operator sorts
   their attention by: a payment waiting four minutes and one waiting two days are the
   same row in every other respect.

   ── Why not a formatted timestamp ─────────────────────────────────────────

   «قبل 3 أيام» answers the question. «2026-08-21T09:14:00Z» requires the reader to do
   arithmetic against a clock they have to find, in a locale they may not share, and it
   is what these tables printed before. The absolute time stays available in `title`.

   ── Why it ticks ─────────────────────────────────────────────────────────

   The safety queue is left open on a wall display. A static «منذ دقيقتين» that was
   rendered forty minutes ago is not stale styling, it is a false statement about how
   long someone has been waiting for help. The interval is 30s — fine for a column whose
   smallest unit is a minute, and cheap enough at 30 rows.

   ── Why the first render is deferred ─────────────────────────────────────

   `Date.now()` differs between the server render and the client hydration, which React
   reports as a hydration mismatch and then silently patches. Rendering the absolute
   date first and the relative phrase after mount makes the two passes agree.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface SinceProps {
  /** An ISO timestamp. `null` renders «—» — an unknown age, not a zero one. */
  at: string | null | undefined;
}

/** One second, named — `check:money` reads a bare `/ 1000` as a fils-to-dinar conversion,
    and it is right to: that division outside `formatJod` is how a currency bug starts. */
const MS_PER_SECOND = 1000;

/** Largest sensible unit, so «قبل 3 أيام» rather than «قبل 4,320 دقيقة». */
function phrase(from: number, now: number): React.ReactNode {
  const seconds = Math.max(0, Math.floor((now - from) / MS_PER_SECOND));

  if (seconds < 60) return 'الآن';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return (
      <>
        قبل <Num value={minutes} /> د
      </>
    );
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return (
      <>
        قبل <Num value={hours} /> س
      </>
    );
  }

  const days = Math.floor(hours / 24);

  return (
    <>
      قبل <Num value={days} /> ي
    </>
  );
}

export function Since({ at }: SinceProps) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!at) return;

    setNow(Date.now());
    const handle = setInterval(() => setNow(Date.now()), 30_000);

    return () => clearInterval(handle);
  }, [at]);

  if (!at) return <span className="text-muted">—</span>;

  const from = new Date(at).getTime();
  if (Number.isNaN(from)) return <span className="text-muted">—</span>;

  const absolute = new Date(at).toISOString().slice(0, 16).replace('T', ' ');

  return (
    <span className="whitespace-nowrap tabular-nums" title={absolute}>
      {now === null ? absolute : phrase(from, now)}
    </span>
  );
}
