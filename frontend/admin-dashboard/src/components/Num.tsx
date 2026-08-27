import { count, isolate, percent, range, tabularNums } from '@rafeeq/tokens';

/**
 * A number, safe inside Arabic text. The web twin of the apps' `<Num>`.
 *
 * The dashboard is RTL (`dir="rtl"` on `<html>`) and every table of counts,
 * ranges and percentages had the same two problems the Expo apps did: digit runs
 * are bidi-neutral at their edges so the algorithm can reorder them, and nothing
 * set `font-variant-numeric`, so a column of figures did not line up on the ones
 * place. An operator scanning a payout queue is exactly the reader who needs
 * tabular digits.
 *
 * Money does NOT come through here — `formatJod` already returns an isolated
 * string. Render that directly.
 */
export interface NumProps {
  value?: string | number;
  /** Isolated as ONE run, so the dash between the two cannot flip them. */
  range?: [string | number, string | number];
  percent?: number;
  /** Stays outside the isolate so it reads to the left in Arabic. */
  unit?: string;
  tabular?: boolean;
  className?: string;
}

export function Num({ value, range: rangeProp, percent: percentProp, unit, tabular = true, className }: NumProps) {
  let body = '';

  if (rangeProp) {
    body = unit ? `${range(rangeProp[0], rangeProp[1])} ${unit}` : range(rangeProp[0], rangeProp[1]);
  } else if (percentProp !== undefined) {
    body = percent(percentProp);
  } else if (value !== undefined) {
    body = unit ? count(Number(value), unit) : isolate(value);
  }

  return (
    <span className={[tabular ? tabularNums.className : '', className ?? ''].filter(Boolean).join(' ')}>
      {body}
    </span>
  );
}
