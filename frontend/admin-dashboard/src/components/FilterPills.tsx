'use client';

import { Num } from './Num';

/* ═══════════════════════════════════════════════════════════════════════════
   COUNTED FILTER PILLS — «الكل 9 · تذاكر 5 · شكاوى 4»

   From `docs/design/v2/06-admin-2/3`, on the queues an operator works through.

   ── Why the count belongs in the control ──────────────────────────────────

   A bare «شكاوى» filter makes you click to learn whether clicking is worth it. With
   the count on the pill, the whole queue is legible before any interaction — and the
   numbers add up in view, so a filter that silently drops rows is obvious.

   `undefined` is not `0`. A count still loading renders nothing rather than a zero,
   because «شكاوى 0» is a statement that there is nothing to do, and making that claim
   before the request returns is how an operator stops trusting the number.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface FilterOption {
  /** Value written to state. The empty string conventionally means "all". */
  value: string;
  label: string;
  /** Omit while unknown — see above. */
  count?: number;
}

export interface FilterPillsProps {
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  /** Names the group for a screen reader, e.g. «تصفية التذاكر». */
  label: string;
}

export function FilterPills({ options, value, onChange, label }: FilterPillsProps) {
  return (
    /*
     * `role="tablist"` would promise arrow-key cycling this does not implement, and a
     * `<select>` would hide the counts that are the reason this exists. A labelled group
     * of buttons with `aria-pressed` is what it actually is.
     */
    <div role="group" aria-label={label} className="inline-flex items-center gap-1 p-1 rounded-xl bg-neutral-100">
      {options.map((option) => {
        const active = option.value === value;

        return (
          <button
            key={option.value || 'all'}
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm transition-colors ${
              active ? 'bg-surface shadow-sm font-bold surface-text' : 'text-muted hover:surface-text'
            }`}
          >
            {option.label}
            {option.count === undefined ? null : (
              <span className={`text-xs ${active ? 'text-primary' : 'text-muted'}`}>
                <Num value={option.count} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
