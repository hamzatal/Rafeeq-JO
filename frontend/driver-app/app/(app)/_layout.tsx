import { Redirect, Tabs } from 'expo-router';
import { Icon, TabBar, type IconName } from '@rafeeq/ui';
import { useAuth } from '../../src/store/auth';
import { useI18n } from '../../src/i18n';

/* ═══════════════════════════════════════════════════════════════════════════
   FOUR TABS, matching the student app and design screens 25–32.

   ── What five tabs were costing ────────────────────────────────────────────

   `profile` and `settings` were both tabs, both about the same two objects, and each
   linked to the OTHER's rows: documents and the vehicle were reachable from both. So
   two of the five most prominent controls in the app were different-looking doors to
   the same place, and the captain had no way to tell which one to use.

   Five tabs on a 390pt screen gives each 78pt for an Arabic word that does not
   truncate gracefully. Four gives 97pt.

   ── 13 route files → 9 ─────────────────────────────────────────────────────

     dashboard      يومي, and its "not yet approved" state (design 25 + 26)
     offers         the incoming offer, full screen (27)
     trip/[id]      trip mode (28)
     trips          رحلاتي (29)
     earnings       أرباحي — was four screens: earnings, earnings-detail,
                    withdraw, invoices (30)
     vehicle-docs   مركبتي ووثائقي — was documents + vehicle (31)
     account        حسابي — was profile + settings (32)
     notifications  the inbox the five bells needed
     chat           the trip thread, shared with the student app

   `chat` and `notifications` are not in the design deck because neither is a
   destination: one is reached from a passenger row, the other from a bell.
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
   * This imported `Feather` straight from `@expo/vector-icons`, so the tab glyphs came
   * from a DIFFERENT icon set than every other glyph in the app — and got none of the
   * RTL mirroring the wrapper applies.
   */
  const tab = (name: IconName) =>
    ({ color, size }: { color: string; size: number }) => <Icon name={name} size={size} color={color} />;

  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      {/* RTL, right → left: يومي · رحلاتي · أرباحي · حسابي */}
      <Tabs.Screen name="dashboard" options={{ title: t('driver.dashboard'), tabBarIcon: tab('gauge') }} />
      <Tabs.Screen name="trips" options={{ title: t('driver.myTrips'), tabBarIcon: tab('navigation') }} />
      <Tabs.Screen name="earnings" options={{ title: t('driver.wallet'), tabBarIcon: tab('credit-card') }} />
      <Tabs.Screen name="account" options={{ title: t('settings.account'), tabBarIcon: tab('user') }} />

      {/* Reachable by navigation, absent from the bar. */}
      <Tabs.Screen name="offers" options={{ href: null }} />
      <Tabs.Screen name="trip/[id]" options={{ href: null }} />
      <Tabs.Screen name="vehicle-docs" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="chat" options={{ href: null }} />
    </Tabs>
  );
}
