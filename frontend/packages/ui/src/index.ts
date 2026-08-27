/* ═══════════════════════════════════════════════════════════════════════════
   @rafeeq/ui — the shared Expo layer for the student and captain apps.

   ── What this replaced ─────────────────────────────────────────────────────

   Two `src/` trees that were the same tree. Nine files were byte-identical —
   1,128 lines, including a 510-line `LiveMap` twice — and eighteen more were
   near-copies whose differences were almost entirely COMMENTS, plus four real
   parameters (a storage key, a prefs key, a logo tagline, a receipt title) that
   had been implemented by duplicating the file.

   The cost was not the duplication. It was that nothing compared the two, so the
   drift went in both directions and neither side was right:

     • both tab bars broke approved decision 16 — the student's had a border it
       should not have and a translucent capsule where the decision says solid;
       the captain's had no shadow, no capsule at all
     • both splash screens were DARK, where decision 15 says light for the student
     • the captain's `permissions.ts` was the student's with web geolocation,
       `watchLocation` and the proactive permission request deleted — in the app
       that broadcasts a live position
     • the receipt PDF printed `#0B192C` and `#1FB6C1`, a navy and teal that are
       not even the *retired* palette, on the one artefact a user keeps
     • `Banner` tinted at 10% in one app and 13% in the other, from a
       hex-concatenated alpha suffix nobody could read at the call site

   ── The layering, and why it is enforced ───────────────────────────────────

     components/  presentation. `react-native`, `react-native-svg`, tokens.
     runtime/     native-facing FACTORIES. Never an app singleton.

   `runtime` exports `createTokenStorage(key)`, `createPrefsStore(key)`,
   `createAppApi({...})`, and functions that TAKE the api rather than importing
   one. That inversion is what lets a single package serve both apps: the two
   differ only in the values they pass, and the values are visible at the call
   site instead of being hidden in a duplicated constant.

   ── This package is for the two EXPO apps only ─────────────────────────────

   `admin-dashboard` must never import it. Everything here reaches `react-native`,
   and phase 6 already proved what that does to a Next.js build: re-exporting a
   `lucide-react-native` registry from the tokens barrel typechecked cleanly on all
   six workspaces and then failed `next build` on Flow syntax inside
   `react-native/index.js`. `check:layers` fails the build on such an import.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── theme + primitives ───────────────────────────────────────────────────── */
export { theme, staticColors, useTheme } from './theme';
export type { AppTheme } from './theme';
export { motionDuration, useReduceMotion } from './motion';

/* ── text ─────────────────────────────────────────────────────────────────── */
export { Text, UnstyledText } from './components/Text';
export type { TextProps, TextTone } from './components/Text';

/* ── icons ────────────────────────────────────────────────────────────────── */
export { Icon } from './components/Icon';
export type { IconName } from './components/Icon';
export { IconButton, LabelledPressable, TOUCH_TARGET } from './components/IconButton';
export type { IconButtonProps } from './components/IconButton';

/* ── controls ─────────────────────────────────────────────────────────────── */
export { Button } from './components/Button';
export { Input } from './components/Input';
export { Banner } from './components/Banner';
export { Num } from './components/Num';
export type { NumProps } from './components/Num';

/* ── layout ───────────────────────────────────────────────────────────────── */
export { Screen } from './components/Screen';
export { AuthShell } from './components/AuthShell';
export { TabBar } from './components/TabBar';
export type { TabBarProps } from './components/TabBar';

/* ── surfaces ─────────────────────────────────────────────────────────────── */
export { Badge, Card, ListRow, ScreenHeader, SectionTitle, StatCard } from './components/surfaces';

/* ── list states ──────────────────────────────────────────────────────────── */
export {
  EmptyState,
  ErrorState,
  ListState,
  listLabels,
  SkeletonList,
  statusFromError,
} from './components/states';
export type { ListStateLabels, ListStateProps, ListStatus } from './components/states';

/* ── kit ──────────────────────────────────────────────────────────────────── */
export {
  Chip,
  Divider,
  KeyValue,
  ListSkeleton,
  PressableScale,
  SegmentedControl,
  Sheet,
  Skeleton,
  Stepper,
  TripTimeline,
} from './components/kit';
export type { PressableScaleProps } from './components/kit';

/* ── brand ────────────────────────────────────────────────────────────────── */
export { BrandSplash } from './components/BrandSplash';
export type { BrandSplashProps } from './components/BrandSplash';
export { Logo } from './components/Logo';
export { MapBackdrop } from './components/MapBackdrop';

/* ── feedback ─────────────────────────────────────────────────────────────── */
export { Loader, LoaderScreen } from './components/Loader';
export { FeedbackProvider, useConfirm, useToast } from './components/Feedback';
export type { ConfirmOptions } from './components/Feedback';
export { ErrorBoundary } from './components/ErrorBoundary';
export type { ErrorBoundaryLabels } from './components/ErrorBoundary';

/* ── map ──────────────────────────────────────────────────────────────────── */
export { LiveMap } from './components/LiveMap';
export type { MapPoint } from './components/LiveMap';

/* ═══════════════════════ runtime ═══════════════════════════════════════════ */

export { createAppApi, getApiLocale, setApiLocale } from './runtime/api';
export { createSession } from './runtime/session';
export { reportApiProblem, useApiProblemToasts } from './runtime/problems';
export type { ApiProblemLabels } from './runtime/problems';
export type { Session, SessionOptions } from './runtime/session';
export type { CreateAppApiOptions } from './runtime/api';
export { createTokenStorage } from './runtime/storage';
export type { TokenStorage } from './runtime/storage';
export { createPrefsStore } from './runtime/prefs';
export type { PrefsState, PrefsStore } from './runtime/prefs';
export { I18nProvider, useI18n } from './runtime/i18n';
export { getMapsKey, getMapsProvider, loadAppConfig } from './runtime/appConfig';
export {
  getCurrentLocation,
  getLocationState,
  getNotificationState,
  requestLocation,
  requestNotifications,
  watchLocation,
} from './runtime/permissions';
export type { Coords, PermState } from './runtime/permissions';
export { DEFAULT_VIBRATION, onNotificationTap, registerForPush, unregisterPush } from './runtime/push';
export type { ChannelSpec } from './runtime/push';
export { saveInvoicePdf } from './runtime/invoice';
export type { InvoiceLabels } from './runtime/invoice';
