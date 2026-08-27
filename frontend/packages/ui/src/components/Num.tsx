import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';
import { count, isolate, percent, range, tabularNums } from '@rafeeq/tokens';

/**
 * A number, safe inside Arabic text.
 *
 * ── Why every number needs this and not just money ─────────────────────────
 *
 * Latin digits inside an RTL paragraph are bidi-neutral at their edges, so the
 * algorithm is free to move them. `money.ts` already isolates amounts, but a seat
 * count, an ETA, a distance, a boarding code and a range are all digit runs too,
 * and none of them were isolated — `unicodeBidi` and `writingDirection` appeared
 * in zero TypeScript files across all three clients.
 *
 * The failure is not hypothetical. Six marketing posters shipped a REVERSED fare
 * table — "5–3 كم" where the source said "3–5" — because the en dash between two
 * digit runs is neutral and the surrounding Arabic reordered them. The same
 * mechanism applies to every range and every "4 مقاعد · 6 كم" in the product.
 *
 * It also applies `tabular-nums`, which was set nowhere in any app: proportional
 * digits make a column of counts impossible to scan because the ones place does
 * not line up. kit.css had it, so the mockups looked tidier than the product did.
 *
 * ── Usage ──────────────────────────────────────────────────────────────────
 *
 *   <Num value={4} unit="مقاعد" />        4 مقاعد
 *   <Num range={[3, 5]} unit="كم" />      3–5 كم   (one unbreakable run)
 *   <Num percent={15} />                  15%
 *   <Num value={boardingCode} mono />     tabular, for a code
 *
 * Money does NOT come through here — `formatJod` already returns an isolated
 * string. Pass that to a plain `<Text>`.
 */
export interface NumProps extends Omit<TextProps, 'children'> {
  /** A single number or an already-formatted numeric string. */
  value?: string | number;
  /** A numeric range. Isolated as ONE run so the dash cannot flip it. */
  range?: [string | number, string | number];
  /** A percentage. */
  percent?: number;
  /** Unit label. Stays outside the isolate so it reads to the left in Arabic. */
  unit?: string;
  /** Tabular figures. On by default — turn off only for display-size type. */
  tabular?: boolean;
  style?: TextStyle | TextStyle[];
}

export function Num({
  value,
  range: rangeProp,
  percent: percentProp,
  unit,
  tabular = true,
  style,
  ...rest
}: NumProps) {
  let body: string;

  if (rangeProp) {
    body = unit ? `${range(rangeProp[0], rangeProp[1])} ${unit}` : range(rangeProp[0], rangeProp[1]);
  } else if (percentProp !== undefined) {
    body = percent(percentProp);
  } else if (value !== undefined) {
    body = unit ? count(Number(value), unit) : isolate(value);
  } else {
    body = '';
  }

  return (
    <Text style={[tabular && styles.tabular, style]} {...rest}>
      {body}
    </Text>
  );
}

const styles = StyleSheet.create({
  tabular: tabularNums.rn,
});
