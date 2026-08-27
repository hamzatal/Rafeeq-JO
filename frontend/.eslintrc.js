/* ═══════════════════════════════════════════════════════════════════════════
   ESLint for the two Expo apps and the shared packages.

   ── Why this file did not exist before ─────────────────────────────────────

   It did not, and neither did any other. `npm run lint` at this root was
   `eslint . --ext .ts,.tsx` with no configuration anywhere above it, so it exited
   with "couldn't find a configuration file" — a script that had never run. Only
   `admin-dashboard` had a config, via `next/core-web-vitals`, and it still does;
   this file ignores that directory rather than fighting it.

   ── Deliberately small ────────────────────────────────────────────────────

   Two rules, not a preset. A full React Native preset on a codebase this size
   produces several hundred findings in one commit, and a lint run nobody can get
   to zero is a lint run people learn to skip. These two encode decisions that
   phase 7 actually made, and they can be enforced at zero today.

   It is a `.js` file and not `.eslintrc.json` because the grandfather list below
   needs to explain itself, and ESLint rejects unknown keys in JSON — including
   comment-shaped ones.
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Screens that still import `Text` from `react-native`.
 *
 * This is a RATCHET, not an exemption. These 45 files carry the 351 remaining raw
 * `fontSize:` values, and migrating them means rewriting every `<Text>` on every
 * screen — which is precisely what phases 8, 9 and 10 do against the approved
 * mockups. Doing it here would be an unreviewed visual change to the whole product
 * in the same commit that extracts the component library.
 *
 * The list may only SHRINK. A NEW file is blocked because it is not on the list,
 * which is the property that matters: today's debt is frozen, tomorrow's is
 * prevented, and the phases that already touch these files pay it down.
 */
const GRANDFATHERED_RAW_TEXT = [
  'student-app/app/(app)/addresses.tsx',
  'student-app/app/(app)/assistant.tsx',
  'student-app/app/(app)/chat.tsx',
  'student-app/app/(app)/checkout.tsx',
  'student-app/app/(app)/emergency.tsx',
  'student-app/app/(app)/home.tsx',
  'student-app/app/(app)/lost-found.tsx',
  'student-app/app/(app)/notifications.tsx',
  'student-app/app/(app)/payments.tsx',
  'student-app/app/(app)/rewards.tsx',
  'student-app/app/(app)/ride-request.tsx',
  'student-app/app/(app)/settings.tsx',
  'student-app/app/(app)/subscriptions.tsx',
  'student-app/app/(app)/support.tsx',
  'student-app/app/(app)/trips.tsx',
  'student-app/app/(app)/wallet.tsx',
  'student-app/app/(auth)/forgot-password.tsx',
  'student-app/app/(auth)/login.tsx',
  'student-app/app/(auth)/otp.tsx',
  'student-app/app/(auth)/register.tsx',
  'student-app/app/(auth)/welcome.tsx',
  'student-app/app/(onboarding)/intro.tsx',
  'student-app/app/(onboarding)/permissions.tsx',
  'student-app/app/(onboarding)/profile-setup.tsx',
  'student-app/src/components/SmartSuggestions.tsx',
  'driver-app/app/(app)/chat.tsx',
  'driver-app/app/(app)/dashboard.tsx',
  'driver-app/app/(app)/documents.tsx',
  'driver-app/app/(app)/earnings-detail.tsx',
  'driver-app/app/(app)/earnings.tsx',
  'driver-app/app/(app)/invoices.tsx',
  'driver-app/app/(app)/offers.tsx',
  'driver-app/app/(app)/profile.tsx',
  'driver-app/app/(app)/settings.tsx',
  /* `[id]` is a glob character class, so it must be escaped or the file is
     silently NOT matched — which is how this one error survived the first run. */
  'driver-app/app/(app)/trip/*.tsx',
  'driver-app/app/(app)/trips.tsx',
  'driver-app/app/(app)/vehicle.tsx',
  'driver-app/app/(app)/withdraw.tsx',
  'driver-app/app/(auth)/forgot-password.tsx',
  'driver-app/app/(auth)/login.tsx',
  'driver-app/app/(auth)/otp.tsx',
  'driver-app/app/(auth)/register.tsx',
  'driver-app/app/(auth)/welcome.tsx',
  'driver-app/app/(onboarding)/intro.tsx',
  'driver-app/app/(onboarding)/permissions.tsx',
];

/**
 * `packages/ui` must never import from an app.
 *
 * A dependency in that direction is what let the two `src/` trees become copies of
 * each other: a shared file reached for `usePrefs`, `usePrefs` reached for the API
 * client, and the client's token key is per-app — so the only way to satisfy both
 * apps was to duplicate the file. Everything app-specific is a factory argument now.
 */
const NO_APP_IMPORTS = {
  group: ['**/student-app/**', '**/driver-app/**'],
  message:
    'packages/ui must not import from an app. Pass what you need in as a prop or a factory argument — a dependency in this direction is what made the two src/ trees copies of each other.',
};

const RAW_TEXT = {
  name: 'react-native',
  importNames: ['Text'],
  message:
    "Import Text from '@rafeeq/ui' and pass a `role`. Raw `fontSize:` appears 351 times across the two apps because every call site picked its own number; the shared Text takes a role from the type scale instead. For the one case that must not touch the theme — ErrorBoundary, which renders when the theme may be what failed — use `UnstyledText`.",
};

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['react-hooks'],
  ignorePatterns: [
    'node_modules',
    /* Has its own next/core-web-vitals config. */
    'admin-dashboard',
    '**/.expo/**',
    '**/dist/**',
    '**/*.config.js',
    '**/*.config.ts',
    '**/*.mjs',
  ],
  rules: {
    'react-hooks/rules-of-hooks': 'error',
    'no-restricted-imports': ['error', { paths: [RAW_TEXT], patterns: [NO_APP_IMPORTS] }],
  },
  overrides: [
    {
      /*
       * The two components that ARE the text primitive, plus the tests and test
       * helpers — a component test asserts on what our `Text` HANDED to
       * react-native's, so it has to be able to name it.
       */
      files: [
        'packages/ui/src/components/Text.tsx',
        'packages/ui/src/components/Num.tsx',
        'packages/ui/src/**/*.test.tsx',
        'packages/ui/src/test/**',
      ],
      rules: { 'no-restricted-imports': ['error', { patterns: [NO_APP_IMPORTS] }] },
    },
    {
      files: GRANDFATHERED_RAW_TEXT,
      rules: { 'no-restricted-imports': ['error', { patterns: [NO_APP_IMPORTS] }] },
    },
  ],
};
