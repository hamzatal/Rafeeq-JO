import { I18nManager } from 'react-native';
import { ICON_SIZE, ICON_STROKE, shouldMirror } from '@rafeeq/tokens';
/*
 * A DEEP import, and the only one in the product.
 *
 * The registry holds `lucide-react-native` components, not values, so it is kept out
 * of the `@rafeeq/tokens` barrel — re-exporting it there pulled `react-native` into
 * the Next.js dashboard bundle and broke `next build` on Flow syntax inside
 * `react-native/index.js`. The `src/` segment is deliberate: a real file path resolves
 * under both classic Node resolution and an `exports`-aware bundler.
 */
import { ICON_REGISTRY, type IconName } from '@rafeeq/tokens/src/icon-registry';
import { useTheme } from '../theme';

export type { IconName };

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  /** Override only for a deliberately heavier or lighter glyph. */
  strokeWidth?: number;
}

/**
 * The app's icon. Lucide, mirrored under RTL.
 *
 * ── Why Lucide and not Feather ─────────────────────────────────────────────
 *
 * `docs/design/src/ui.mjs` — the renderer that produces every approved mockup —
 * already drew LUCIDE paths, while both apps rendered Feather and the admin
 * dashboard rendered Material Symbols ligatures. Three naming systems, and the
 * design source agreed with none of the products: every mockup differed from the
 * screen it depicted on every icon, invisibly, because a chevron reads as a
 * chevron until you compare stroke weights side by side.
 *
 * Lucide began as a Feather fork, so most names carried over unchanged. The ones
 * that did not are in `RENAMED`, and generating the registry against the INSTALLED
 * package is what caught the two that mattered — `home` → `house` and
 * `help-circle` → `circle-question-mark`. Each would have silently rendered
 * nothing, which is worse than rendering the wrong glyph: the gap is the right
 * size, so the layout still looks intentional.
 *
 * ── Names are checked at COMPILE time now ──────────────────────────────────
 *
 * `IconName` is the union of the icons in the generated registry, not the
 * ~280-name Feather glyphMap. A typo is a type error rather than an empty square.
 */
export function Icon({ name, size = ICON_SIZE, color, strokeWidth = ICON_STROKE }: IconProps) {
  const theme = useTheme();
  const Glyph = ICON_REGISTRY[name];
  const mirror = I18nManager.isRTL && shouldMirror(name);

  return (
    <Glyph
      size={size}
      color={color ?? theme.colors.text}
      strokeWidth={strokeWidth}
      style={mirror ? { transform: [{ scaleX: -1 }] } : undefined}
    />
  );
}
