import { isolate, tabularNums } from '@rafeeq/tokens';

/**
 * A phone number, safe inside Arabic text.
 *
 * ── The bug this fixes ─────────────────────────────────────────────────────────
 *
 * A phone number is a left-to-right run, but its leading `+` is bidi-NEUTRAL. Inside
 * the dashboard's RTL paragraph (`dir="rtl"` on `<html>`) the bidi algorithm resolves
 * that neutral character to the surrounding direction and paints it at the RIGHT-hand
 * end of the run. So `+962780200002` was displayed as `962780200002+` — in the users
 * table, the captains table, the payout queue and the dispute detail alike. Every
 * phone number the operator could see had its country prefix on the wrong side.
 *
 * Isolating the run pins the `+` to the digits it belongs to. This is the same
 * mechanism `formatJod` already uses for money, and `<Num>` for counts.
 *
 * ── Why not `<Num>` ───────────────────────────────────────────────────────────
 *
 * `<Num>` means "a quantity" — it takes ranges, percentages and units, and its
 * `value` goes through `Number()` when a unit is present. A phone number is an
 * identifier that merely happens to be digits: it is never summed, never rounded and
 * never has a unit. Keeping them apart stops someone later adding numeric formatting
 * to `<Num>` and silently reformatting phone numbers.
 */
export interface PhoneProps {
  value?: string | null;
  /** Rendered when there is no number, so callers need no `?? '—'` of their own. */
  fallback?: string;
  className?: string;
}

export function Phone({ value, fallback = '—', className }: PhoneProps) {
  if (!value) return <>{fallback}</>;

  return (
    <span className={[tabularNums.className, className ?? ''].filter(Boolean).join(' ')}>
      {isolate(value)}
    </span>
  );
}
