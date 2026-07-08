import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { DriverStatus, DriverPerformance } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Banner } from '../../src/components/Banner';
import { Button } from '../../src/components/Button';
import { Card, ListRow, SectionTitle, Badge } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { Loader } from '../../src/components/Loader';
import { LiveMap, type MapPoint } from '../../src/components/LiveMap';
import { useI18n } from '../../src/i18n';
import { useAuth } from '../../src/store/auth';
import { useAvailability } from '../../src/store/availability';
import { api } from '../../src/lib/api';
import { getCurrentLocation } from '../../src/lib/permissions';
import { useTheme, type AppTheme } from '../../src/theme';

const statusMeta: Record<DriverStatus, { key: string; tone: 'warning' | 'primary' | 'success' | 'danger' }> = {
  pending: { key: 'driver.statusPending', tone: 'warning' },
  under_review: { key: 'driver.statusUnderReview', tone: 'primary' },
  approved: { key: 'driver.statusApproved', tone: 'success' },
  rejected: { key: 'driver.statusRejected', tone: 'danger' },
  suspended: { key: 'driver.statusSuspended', tone: 'danger' },
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
  const meta = statusMeta[status];
  const canSubmit = status === 'pending' || status === 'rejected';
  const approved = status === 'approved';


  useEffect(() => {
    if (approved) {
      api.payouts.performance().then(setPerf).catch(() => undefined);
      void getCurrentLocation().then((l) => l && setLoc(l));
      void restoreAvailability();
    }
  }, [approved, restoreAvailability]);

  const jod = (fils: number) => (fils / 1000).toFixed(3);

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
      <Pressable hitSlop={8} style={s.headerBtn}>
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
            <View style={s.onlineRow}>
              <Switch
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
            <View style={s.statsRow}>
              <View style={s.stat}>
                <Text style={s.statVal}>{perf ? jod(perf.available_earnings_fils) : '—'}</Text>
                <Text style={s.statLbl}>{t('driver.todayEarnings')}</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.stat}>
                <View style={s.statInline}>
                  <Icon name="star" size={13} color={theme.colors.accent} />
                  <Text style={s.statVal}>{perf?.rating?.toFixed(1) ?? driver?.rating_avg?.toFixed(1) ?? '—'}</Text>
                </View>
                <Text style={s.statLbl}>{t('driver.myRating')}</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.stat}>
                <Text style={s.statVal}>{perf?.total_trips ?? driver?.total_trips ?? 0}</Text>
                <Text style={s.statLbl}>{t('driver.myTrips')}</Text>
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
          <Badge label={t(meta.key)} tone={meta.tone} />
        </View>

        {status === 'rejected' && driver?.review_note ? <Banner message={driver.review_note} variant="error" /> : null}
        {error ? <Banner message={error} variant="error" /> : null}

        <SectionTitle title={t('driver.documents')} />
        <Card style={{ padding: 6 }}>
          <ListRow icon="file-text" title={t('driver.documents')} subtitle={`${driver?.documents?.length ?? 0}`} trailing={<Icon name="chevron-left" size={18} color={theme.colors.muted} />} onPress={() => router.push('/(app)/documents')} />
          <ListRow icon="truck" title={t('driver.vehicle')} subtitle={`${driver?.vehicles?.length ?? 0}`} trailing={<Icon name="chevron-left" size={18} color={theme.colors.muted} />} onPress={() => router.push('/(app)/vehicle')} />
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
    brand: { fontFamily: t.fontFamily.extrabold, fontSize: 24, lineHeight: 32, color: t.colors.primary },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.colors.surfaceHighest, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.colors.border },
    avatarText: { fontFamily: t.fontFamily.extrabold, fontSize: 16, color: t.colors.primary },

    overlayTop: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 8, gap: 12 },
    statusCard: { backgroundColor: 'rgba(255,255,255,0.97)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: t.colors.border, gap: 14, ...t.shadow.md },
    statusCardOn: { borderColor: t.colors.accent },
    onlineRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.md },
    onlineTitleRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    onlineTitle: { fontFamily: t.fontFamily.extrabold, fontSize: 16, color: t.colors.text, textAlign: 'right' },
    onlineHint: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary, textAlign: 'right', marginTop: 2 },


    statsRow: { flexDirection: 'row-reverse', alignItems: 'center', paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.colors.hairline },
    stat: { flex: 1, alignItems: 'center', gap: 3 },
    statInline: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
    statVal: { fontFamily: t.fontFamily.extrabold, fontSize: 20, color: t.colors.text },
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
    dashName: { fontFamily: t.fontFamily.extrabold, fontSize: 18, color: t.colors.text, textAlign: 'right', flex: 1 },
    submit: { marginTop: t.spacing.lg },
  });
