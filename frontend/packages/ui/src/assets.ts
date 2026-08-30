import type { ImageSourcePropType } from 'react-native';

/* ═══════════════════════════════════════════════════════════════════════════
   THE BRAND MARK — owned by the package that draws it.

   ── Why this file exists ───────────────────────────────────────────────────

   Phase 7 consolidated the two copies of the logo into `packages/ui/assets/r-logo.png`
   and DELETED `student-app/assets/r-logo.png` and `driver-app/assets/r-logo.png`. But
   both apps' `welcome.tsx` kept calling `require('../../assets/r-logo.png')`, so from
   that commit onward Metro could not resolve the asset and NEITHER APP COULD BUNDLE
   AT ALL — the welcome screen is the entry of the auth flow:

       Unable to resolve module ../../assets/r-logo.png

   It sat on `main` through phases 8 and 9 with CI green, because `tsc --noEmit` does
   not verify the path inside `require()` of an image and nothing in CI bundled the
   apps. `ci.yml` now runs `expo export` for both, so this class of break cannot hide
   again.

   ── Why a module and not a subpath import ──────────────────────────────────

   An app could write `require('@rafeeq/ui/assets/r-logo.png')`, but that depends on
   package `exports` resolving a non-JS subpath through Metro, which is fragile. A
   relative `require` INSIDE the package always resolves, and exporting the result
   means there is exactly one path to this file in the whole monorepo.
   ═══════════════════════════════════════════════════════════════════════════ */

/** The Rafeeq mark. The only reference to the logo file anywhere in the apps. */
export const LOGO_MARK = require('../assets/r-logo.png') as ImageSourcePropType;
