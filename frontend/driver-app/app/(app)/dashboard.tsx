import { useEffect, useMemo, useState } from 'react';
import { bareJod } from '@rafeeq/shared';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { DriverStatus, DriverPerformance } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Badge, Banner, Button, Card, getCurrentLocation, Icon, ListRow, LiveMap, Loader, SectionTitle, useTheme, type AppTheme, type MapPoint } from '@rafeeq/ui';
import { useI18n } from '../../src/i18n';
import { useAuth } from '../../src/store/auth';
import { useAvailability } from '../../src/store/availability';
import { api } from '../../src/lib/api';

/*
 * TONE only. The LABEL comes from the API.
 *
 * This table used to carry a translation key per status, and four of the five keys
 * did not exist in the dictionary — so an unapproved captain's badge read
 * «driver.statusPending», because `t()` returns the key when it cannot resolve one.
 * They were among the 42 keys a dead-key sweep deleted, and nothing failed.
 *
 * `DriverProfileResource` has always sent `status_label`, localised server-side by
 * `SetLocale`. Reading that instead means the label cannot drift from the status, and
 * there is no key here to delete.
 */
const statusTone: Record<DriverStatus, 'warning' | 'primary' | 'success' | 'danger'> = {
  pending: 'warning',
  under_review: 'primary',
  approved: 'success',
  rejected: 'danger',
  suspended: 'danger',
};

export default function Dashboard() {
  const { t } = useI18n();
  const router = useRouter();
  const theme = useTheme();
  const { height } = useWindowDimensions();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const user = useAuth((a) => a.user);
  const driver = useAuth((a) => a.driver);
  const driverLoaded = useAuth((a) => a.driverLoaded);
  const refreshDriver = useAuth((a) => a.refreshDriver);

  const online = useAvailability((a) => a.online);
  const setOnline = useAvailability((a) => a.setOnline);
  const restoreAvailability = useAvailability((a) => a.restore);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [perf, setPerf] = useState<DriverPerformance | null>(null);
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);

  const status = driver?.status ?? 'pending';
  const tone = statusTone[status];
  const canSubmit = status === 'pending' || status === 'rejected';
  const approved = status === 'approved';


  useEffect(() => {
    if (approved) {
      api.payouts.performance().then(setPerf).catch(() => undefined);
      void getCurrentLocation().then((l) => l && setLoc(l));
      void restoreAvailability();
    }
  }, [approved, restoreAvailability]);

  const jod = (fils: number) => bareJod(fils);

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await api.driver.submitForReview();
      await refreshDriver();
    } catch (e) {
      setError(e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const mapPoints: MapPoint[] = loc ? [{ lat: loc.lat, lng: loc.lng, kind: 'captain', label: user?.full_name ?? '' }] : [];
  const initial = (user?.full_name ?? 'ر').charAt(0);

  if (!driverLoaded) {
    return (
      <SafeAreaView style={[s.safe, { alignItems: 'center', justifyContent: 'center' }]} edges={['top']}>
        <Loader size={12} />
      </SafeAreaView>
    );
  }

  // Shared floating header (avatar · Rafeeq · bell)
  const header = (
    <View style={s.header}>
      <View style={s.headerBrand}>
        <View style={s.avatar}><Text style={s.avatarText}>{initial}</Text></View>
        <Text style={s.brand}>رفيق</Text>
      </View>
      {/* A Pressable again, because there is finally an inbox behind it. */}
      <Pressable
        onPress={() => router.push('/(app)/notifications')}
        accessibilityRole="button"
        accessibilityLabel={t('notifications.title')}
        hitSlop={8}
        style={s.headerBtn}
      >
        <Icon name="bell" size={24} color={theme.colors.primary} />
      </Pressable>
    </View>
  );


  // ── Approved captain → map-first cockpit (Stitch _20) ───────────────
  if (approved) {
    return (
      <View style={s.root}>
        <View style={StyleSheet.absoluteFill}>
          <LiveMap points={mapPoints} legend={false} height={height} />
        </View>
        <View style={s.topScrim} pointerEvents="none" />

        <SafeAreaView edges={['top']} style={s.overlayTop} pointerEvents="box-none">
          {header}
          {/* Floating status card: online toggle + live stats */}
          <View style={[s.statusCard, online && s.statusCardOn]}>
            {/* Full width and 60 tall: this is the control the whole screen exists
                for, and it was a 40pt system switch beside two lines of text. */}
            <View style={s.onlineRow}>
              <Switch
                style={s.switchScale}
                value={online}
                onValueChange={(v) => void setOnline(v)}
                trackColor={{ true: theme.colors.accent, false: theme.colors.border }}
                thumbColor={online ? theme.colors.onAccent : theme.colors.surface}
              />
              <View style={{ flex: 1 }}>
                <View style={s.onlineTitleRow}>
                  <View style={[s.dot, { backgroundColor: online ? theme.colors.success : theme.colors.muted }]} />
                  <Text style={s.onlineTitle}>{online ? t('driver.online') : t('driver.offline')}</Text>
                </View>
                <Text style={s.onlineHint} numberOfLines={1}>{online ? t('driver.onlineHint') : t('driver.offlineHint')}</Text>
              </View>
            </View>
            {/*
              ONE hero number, and it says what it is.

              This was three equal cells at the same size, so nothing was the answer to
              «how did today go?». Worse, the first cell rendered
              `perf.available_earnings_fils` — the withdrawable BALANCE — under the label
              «أرباح اليوم». A captain who withdrew yesterday saw today's earnings drop to
              zero, and a captain who had not withdrawn in a week saw a week's work
              reported as one day's.

              Today's earnings are now `today_earnings_fils`, and the rating and trip
              count are a secondary line beneath — which is what they are.
            */}
            <View style={s.heroWrap}>
              <Text style={s.heroLabel}>{t('driver.todayEarnings')}</Text>
              <Text style={s.heroValue}>{perf ? jod(perf.today_earnings_fils) : '—'}</Text>
              <View style={s.heroMetaRow}>
                <View style={s.statInline}>
                  <Icon name="star" size={13} color={theme.colors.accent} />
                  <Text style={s.statLbl}>{perf?.rating?.toFixed(1) ?? driver?.rating_avg?.toFixed(1) ?? '—'}</Text>
                </View>
                <Text style={s.statLbl}>·</Text>
                <Text style={s.statLbl}>
                  {perf?.today_trips ?? 0} {t('driver.tripsShort')}
                </Text>
              </View>
            </View>
          </View>
        </SafeAreaView>


        {/* Bottom action card */}
        <SafeAreaView edges={['bottom']} style={s.bottomWrap} pointerEvents="box-none">
          {online ? (
            <Pressable onPress={() => router.push('/(app)/offers')} style={({ pressed }) => [s.offersCard, pressed && { opacity: 0.92 }]}>
              <View style={s.offersIcon}><Icon name="inbox" size={22} color={theme.colors.onPrimary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.offersTitle}>{t('driver.offers')}</Text>
                <Text style={s.offersSub}>{t('driver.onlineHint')}</Text>
              </View>
              <Icon name="chevron-left" size={22} color={theme.colors.onPrimaryMuted} />
            </Pressable>
          ) : (
            <View style={s.offlineCard}>
              <Icon name="power" size={20} color={theme.colors.muted} />
              <Text style={s.offlineText}>{t('driver.offlineHint')}</Text>
            </View>
          )}
        </SafeAreaView>
      </View>
    );
  }

  // ── Pending / rejected captain → onboarding & documents ─────────────
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {header}
        <View style={s.statusRow}>
          <Text style={s.dashName} numberOfLines={1}>{user?.full_name ?? t('driver.dashboard')}</Text>
          <Badge label={driver?.status_label ?? ''} tone={tone} />
        </View>

        {status === 'rejected' && driver?.review_note ? <Banner message={driver.review_note} variant="error" /> : null}
        {error ? <Banner message={error} variant="error" /> : null}

        <SectionTitle title={t('driver.documents')} />
        <Card style={{ padding: 6 }}>
          {/* One row, because documents and the vehicle are one task — see
              (app)/vehicle-docs.tsx, where the vehicle was already step 4 of 4. */}
          <ListRow
            icon="file-text"
            title={t('driver.vehicleAndDocs')}
            subtitle={`${(driver?.documents?.length ?? 0) + (driver?.vehicles?.length ?? 0)} / 4`}
            trailing={<Icon name="chevron-left" size={18} color={theme.colors.muted} />}
            onPress={() => router.push('/(app)/vehicle-docs')}
          />
        </Card>

        {canSubmit ? <Button title={t('driver.submitReview')} onPress={onSubmit} loading={submitting} style={s.submit} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}


const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colors.background },
    content: { padding: t.spacing.lg, paddingBottom: t.spacing['3xl'] },
    root: { flex: 1, backgroundColor: t.colors.background },
    topScrim: { position: 'absolute', top: 0, left: 0, right: 0, height: 150, backgroundColor: 'rgba(249,249,255,0.5)' },

    header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
    headerBrand: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.md },
    headerBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center', ...t.shadow.sm },
    brand: { fontFamily: t.fontFamily.bold, fontSize: 24, lineHeight: 32, color: t.colors.primary },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.colors.surfaceHighest, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.colors.border },
    avatarText: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.primary },

    overlayTop: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 8, gap: 12 },
    statusCard: { backgroundColor: 'rgba(255,255,255,0.97)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: t.colors.border, gap: 14, ...t.shadow.md },
    statusCardOn: { borderColor: t.colors.accent },
    onlineRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.md, minHeight: 60 },
    onlineTitleRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    onlineTitle: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.text, textAlign: 'right' },
    onlineHint: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary, textAlign: 'right', marginTop: 2 },


    onlineRowTall: { minHeight: 60 },
    switchScale: { transform: [{ scaleX: 1.15 }, { scaleY: 1.15 }] },
    heroWrap: { alignItems: 'center', paddingTop: 14, gap: 2, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.colors.hairline },
    heroLabel: { ...t.type.label, color: t.colors.textSecondary },
    heroValue: { ...t.type.displayMd, color: t.colors.primary },
    heroMetaRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
    statsRow: { flexDirection: 'row-reverse', alignItems: 'center', paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.colors.hairline },
    stat: { flex: 1, alignItems: 'center', gap: 3 },
    statInline: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
    statVal: { fontFamily: t.fontFamily.bold, fontSize: 20, color: t.colors.text },
    statLbl: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary },
    statDivider: { width: StyleSheet.hairlineWidth, height: 34, backgroundColor: t.colors.border },

    bottomWrap: { position: 'absolute', left: 0, right: 0, bottom: 92, paddingHorizontal: 20 },
    offersCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.md, backgroundColor: t.colors.primary, borderRadius: 16, padding: 16, ...t.shadow.lg },
    offersIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
    offersTitle: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.onPrimary, textAlign: 'right' },
    offersSub: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.onPrimaryMuted, textAlign: 'right', marginTop: 2 },
    offlineCard: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.97)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: t.colors.border, ...t.shadow.sm },
    offlineText: { fontFamily: t.fontFamily.medium, fontSize: 14, color: t.colors.textSecondary },

    statusRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginTop: t.spacing.md, marginBottom: t.spacing.md },
    dashName: { fontFamily: t.fontFamily.bold, fontSize: 18, color: t.colors.text, textAlign: 'right', flex: 1 },
    submit: { marginTop: t.spacing.lg },
  });
