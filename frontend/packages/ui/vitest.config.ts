import { defineConfig } from 'vitest/config';

/* ═══════════════════════════════════════════════════════════════════════════
   Vitest for React Native components, without a native runtime.

   ── The alias is the whole trick ───────────────────────────────────────────

   The real `react-native` ships Flow-typed source, which Vitest cannot parse — it
   is the same Flow syntax that broke `next build` in phase 6. `react-native-web`
   is the same component API implemented in plain JavaScript, so `<View>`,
   `<Pressable>` and `StyleSheet.create` all behave and the module graph loads.

   ── What this does and does not prove ─────────────────────────────────────

   It proves BEHAVIOUR: which branch renders, what the accessibility props say,
   whether a style resolves to the token value. It does not prove native LAYOUT —
   `react-native-web` maps to CSS, and a flexbox difference between it and Yoga
   would not show up here. Layout is what the mockups in `docs/design/v2` are for.

   That is a real limitation and worth stating rather than implying these are
   end-to-end tests. Phase 11 adds Maestro for the flows that need a device.
   ═══════════════════════════════════════════════════════════════════════════ */

export default defineConfig({
  resolve: {
    alias: {
      'react-native': 'react-native-web',
      /*
       * Arrives transitively via `Icon` → `lucide-react-native` → here, and its
       * TypeScript source contains `import typeof`, which Node's ESM loader cannot
       * parse. Stubbed to a `View`; see the stub for why that loses nothing.
       */
      'react-native-svg': new URL('./src/test/stubs/react-native-svg.tsx', import.meta.url).pathname,
    },
  },
  test: {
    globals: true,
    /*
     * jsdom, because `react-native-web`'s `TextInput` reads `document` on mount even
     * under `react-test-renderer`, which otherwise never needs a DOM. Only `Input`
     * requires it; paying for it globally is simpler than splitting the suite in two.
     */
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    server: {
      deps: {
        /*
         * Processed by Vite instead of being loaded raw by Node.
         *
         * `lucide-react-native` does a plain CJS `require('react-native-svg')`, and a
         * Vite alias only applies to modules Vite itself resolves — so without this the
         * real package loads and dies on `import typeof`, alias or not.
         */
        inline: ['lucide-react-native'],
      },
    },
  },
});
