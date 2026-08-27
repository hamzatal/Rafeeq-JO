/* ═══════════════════════════════════════════════════════════════════════════
   The React Native theme object.

   Shaped to match the `AppTheme` both Expo apps already consume, so migrating
   them is an import change rather than a rewrite of every `makeStyles`.
   ═══════════════════════════════════════════════════════════════════════════ */

import { colors, legacyAliases, type Colors } from './semantic';
import { fontFamily, rnType, type, type TypeRole } from './type';
import { radius, shadow, size, space } from './space';

/**
 * Colours as the apps see them, including the deprecated aliases.
 *
 * `card` and `elevated` are both `surface`; they exist so the migration diff
 * stays small and are reported by `check:tokens` so they get removed rather than
 * settling in.
 */
export type RnColors = Colors & typeof legacyAliases;

const rnColors: RnColors = { ...colors, ...legacyAliases };

export interface AppTheme {
  colors: RnColors;
  space: typeof space;
  radius: typeof radius;
  size: typeof size;
  shadow: typeof shadow;
  fontFamily: typeof fontFamily;
  /** Role-named type scale. Spread it: `{...t.type.titleMd}`. */
  type: Record<TypeRole, ReturnType<typeof rnType>>;

  /**
   * `spacing` is the OLD name for `space`, kept through the migration.
   *
   * Both apps reference `t.spacing.md` in ~450 places. Renaming the key and
   * every call site in one change would make the token diff unreviewable, so the
   * alias stays until phase 7 touches these files anyway for `packages/ui`.
   *
   * @deprecated use `space`
   */
  spacing: typeof space;
}

const resolvedType = Object.fromEntries(
  (Object.keys(type) as TypeRole[]).map((role) => [role, rnType(role)]),
) as Record<TypeRole, ReturnType<typeof rnType>>;

export const rnTheme: AppTheme = {
  colors: rnColors,
  space,
  spacing: space,
  radius,
  size,
  shadow,
  fontFamily,
  type: resolvedType,
};

/**
 * The theme, as a function, for call sites that used `useTheme()`.
 *
 * Not a hook and never was — the old one was a plain accessor left over from
 * when a dark-scheme preference was read from a store (decision 7 removed dark
 * mode). Kept so screens do not all have to change at once.
 */
export function useTheme(): AppTheme {
  return rnTheme;
}

/** For module-scope `StyleSheet.create` blocks, which run before any hook. */
export const staticColors = rnColors;
