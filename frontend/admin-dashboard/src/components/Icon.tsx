'use client';

import { icons } from 'lucide-react';
import { ICON_SIZE, ICON_STROKE, lucideName, shouldMirror } from '@rafeeq/tokens';

/**
 * The dashboard's icon. Lucide, the same set the apps and the mockups use.
 *
 * ── What this replaces ─────────────────────────────────────────────────────
 *
 * `<span className="material-symbols-outlined">person_add</span>` — a web font
 * with snake_case ligatures, across ~35 call sites. That made three icon systems
 * in one product: Material Symbols here, Feather in the apps, and Lucide in the
 * mockup renderer that produces the approved designs. So the dashboard matched
 * neither the apps nor the design.
 *
 * Three concrete defects came with it:
 *
 *   1. **Two variants were mixed.** `material-symbols-rounded` appeared on two
 *      pages and had NO CSS rule — so it got no `font-variation-settings`, no
 *      22px size, and may not even have been in the loaded font subset.
 *   2. **No RTL mirroring at all.** The apps mirror directional glyphs; the
 *      dashboard did not, so every chevron in an RTL table pointed the wrong way.
 *   3. **A webfont icon cannot fail visibly.** A ligature that is not in the
 *      subset renders as the literal text `person_add`, or as nothing.
 *
 * ── Names ──────────────────────────────────────────────────────────────────
 *
 * Lucide kebab names, the same vocabulary the apps and the mockups use. The
 * ligature names were rewritten at the call sites rather than translated by a
 * compatibility map, so there is exactly one icon vocabulary in the product.
 *
 * `name` is `string`, not a union, because most names arrive from a nav table as
 * data (`icon: 'layout-dashboard'`) rather than as a literal — so TypeScript could
 * not narrow them anyway. `scripts/build-icons.mjs` resolves every name in this
 * workspace against the installed `lucide-react` and fails the build on one it does
 * not export, which is where a typo is caught.
 *
 * A namespace import is fine here, unlike in the Expo apps: this is a Next.js
 * bundle with real tree-shaking, so only the referenced glyphs ship.
 */
export interface IconProps {
  name: string;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

/** `circle-check` → `CircleCheck`, which is how Lucide keys its registry. */
function pascal(kebab: string): string {
  return kebab
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

export function Icon({ name, size = ICON_SIZE, className, strokeWidth = ICON_STROKE }: IconProps) {
  const resolved = pascal(lucideName(name));
  const Glyph = (icons as Record<string, React.ComponentType<{
    size?: number;
    strokeWidth?: number;
    className?: string;
    style?: React.CSSProperties;
  }>>)[resolved];

  /*
   * An unresolved name must be VISIBLE, not silent.
   *
   * The Material Symbols version failed by rendering nothing, which left a gap the
   * right size — so a missing icon looked like a deliberate layout choice and
   * survived review. A question mark is obviously wrong.
   */
  if (!Glyph) {
    const Fallback = (icons as Record<string, React.ComponentType<{ size?: number; className?: string }> | undefined>)
      .CircleQuestionMark;

    // And if even the fallback is missing, say so in text rather than crashing the page
    // on `<undefined />`. Lucide renames glyphs — `help-circle` became
    // `circle-question-mark` — so this is the same class of miss one level up.
    if (!Fallback) return <span className={className} aria-hidden="true">?</span>;

    return <Fallback size={size} className={className} />;
  }

  return (
    <Glyph
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      style={shouldMirror(name) ? { transform: 'scaleX(-1)' } : undefined}
    />
  );
}
