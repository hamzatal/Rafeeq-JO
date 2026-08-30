import { Redirect, Tabs } from 'expo-router';
import { useAuth } from '../../src/store/auth';
import { useI18n } from '../../src/i18n';
import { Icon, TabBar, type IconName } from '@rafeeq/ui';

/* ═══════════════════════════════════════════════════════════════════════════
   FOUR TABS, and the assistant is not one of them.

   ── What the fifth tab was costing ─────────────────────────────────────────

   `assistant` sat in the CENTRE of the bar as a raised circle — the most
   prominent control in the app, the position every ride-hailing product reserves
   for its primary action. In a product whose primary action is "get me to
   campus", that position was given to a chat bot.

   Decision recorded in `docs/design/SCREENS.md`: the assistant moves to an entry
   on the home screen. It is still reachable, still one tap from the first thing
   the student sees, and it no longer outranks the wallet.

   ── Why the count matters beyond tidiness ──────────────────────────────────

   Five tabs on a 390pt screen gives each one 78pt, and the labels are Arabic
   words that do not truncate gracefully. Four gives 97pt. The bar is also the
   only navigation a student ever sees, so every item in it is a claim about what
   this app is for.
   ═══════════════════════════════════════════════════════════════════════════ */

export default function AppLayout() {
  const status = useAuth((s) => s.status);
  const { t } = useI18n();

  if (status === 'unauthenticated') {
    return <Redirect href="/(auth)/welcome" />;
  }

  /*
   * Through the shared `Icon`, not Feather directly.
   *
   * This imported `Feather` straight from `@expo/vector-icons`, so the tab glyphs
   * came from a DIFFERENT icon set than every other glyph in the app — and got
   * none of the RTL mirroring the wrapper applies.
   */
  const tab = (name: IconName) =>
    ({ color, size }: { color: string; size: number }) => <Icon name={name} size={size} color={color} />;

  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      {/* RTL, right → left: الرئيسية · رحلاتي · المحفظة · حسابي */}
      <Tabs.Screen name="home" options={{ title: t('home.title'), tabBarIcon: tab('house') }} />
      <Tabs.Screen name="trips" options={{ title: t('home.trips'), tabBarIcon: tab('navigation') }} />
      <Tabs.Screen name="wallet" options={{ title: t('home.wallet'), tabBarIcon: tab('credit-card') }} />
      <Tabs.Screen name="settings" options={{ title: t('settings.title'), tabBarIcon: tab('user') }} />

      {/* Reachable by navigation, absent from the bar. */}
      <Tabs.Screen name="assistant" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="subscriptions" options={{ href: null }} />
      <Tabs.Screen name="checkout" options={{ href: null }} />
      <Tabs.Screen name="chat" options={{ href: null }} />
      <Tabs.Screen name="addresses" options={{ href: null }} />
      <Tabs.Screen name="ride-request" options={{ href: null }} />
      <Tabs.Screen name="support" options={{ href: null }} />
      <Tabs.Screen name="emergency" options={{ href: null }} />
    </Tabs>
  );
}
