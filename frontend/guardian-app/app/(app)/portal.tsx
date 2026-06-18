import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { GuardianArrivalEvent, GuardianChild, GuardianLiveTrip } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Banner } from '../../src/components/Banner';
import { Card, EmptyState, SectionTitle, Badge } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { LiveMap } from '../../src/components/LiveMap';
import { useI18n } from '../../src/i18n';
import { api } from '../../src/lib/api';
import { useTheme, type AppTheme } from '../../src/theme';

const SOS_HOLD_MS = 3000;
const POLL_MS = 15000;

export default function Portal() {
  const { t, locale } = useI18n();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [children, setChildren] = useState<GuardianChild[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [live, setLive] = useState<GuardianLiveTrip | null>(null);
  const [events, setEvents] = useState<GuardianArrivalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [sosProgress, setSosProgress] = useState(false);

  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadChildren = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.guardian.children();
      setChildren(list);
      setSelected((prev) => prev ?? list[0]?.student_user_id ?? null);
    } catch (e) {
      setMsg({ text: e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('common.error'), ok: false });
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadTrip = useCallback(async (studentId: string) => {
    try {
      const [l, ev] = await Promise.all([
        api.guardian.liveTrip(studentId),
        api.guardian.arrivals(studentId),
      ]);
      setLive(l);
      setEvents(ev);
    } catch {
      /* transient — keep last known state */
    }
  }, []);

  useEffect(() => { void loadChildren(); }, [loadChildren]);

  useEffect(() => {
    if (!selected) return;
    void loadTrip(selected);
    const id = setInterval(() => void loadTrip(selected), POLL_MS);
    return () => clearInterval(id);
  }, [selected, loadTrip]);

  const callCaptain = async () => {
    if (!selected) return;
    setMsg(null);
    try {
      const c = await api.guardian.contactCaptain(selected);
      Alert.alert(c.captain_name, c.masked_phone ?? '', [
        { text: t('common.cancel'), style: 'cancel' },
        c.masked_phone
          ? { text: t('guardian.callCaptain'), onPress: () => Linking.openURL(`tel:${c.masked_phone}`) }
          : { text: t('common.confirm') },
      ]);
    } catch (e) {
      setMsg({ text: e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('guardian.callFailed'), ok: false });
    }
  };

  const triggerSos = async () => {
    if (!selected) return;
    setSosProgress(false);
    try {
      await api.guardian.sos(selected);
      setMsg({ text: t('guardian.sosSent'), ok: true });
    } catch (e) {
      setMsg({ text: e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('guardian.sosFailed'), ok: false });
    }
  };

  const onSosPressIn = () => {
    setSosProgress(true);
    holdTimer.current = setTimeout(() => void triggerSos(), SOS_HOLD_MS);
  };
  const onSosPressOut = () => {
    setSosProgress(false);
    if (holdTimer.current) clearTimeout(holdTimer.current);
  };

  const selectedChild = children.find((c) => c.student_user_id === selected);
  const trip = live?.trip ?? null;
  const captain = live?.captain ?? null;
  const vehicle = live?.vehicle ?? null;
  const loc = live?.location ?? null;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.h1}>{t('guardian.portalTitle')}</Text>
            <Text style={s.sub}>{t('guardian.portalSubtitle')}</Text>
          </View>
          <View style={s.shieldBadge}>
            <Icon name="shield" size={18} color={theme.colors.onPrimary} />
          </View>
        </View>

        {msg && <Banner message={msg.text} variant={msg.ok ? 'success' : 'error'} />}

        {loading ? (
          <Text style={s.meta}>{t('common.loading')}</Text>
        ) : children.length === 0 ? (
          <EmptyState icon="users" title={t('guardian.noChildren')} hint={t('guardian.noChildrenHint')} />
        ) : (
          <>
            {/* Child selector */}
            {children.length > 1 && (
              <View style={s.childRow}>
                {children.map((c) => (
                  <Pressable
                    key={c.student_user_id}
                    onPress={() => setSelected(c.student_user_id)}
                    style={[s.childChip, selected === c.student_user_id && s.childChipActive]}
                  >
                    <Text style={[s.childChipText, selected === c.student_user_id && s.childChipTextActive]}>
                      {c.name ?? '—'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Protection-active banner */}
            <View style={s.protection}>
              <Icon name="shield" size={16} color={theme.colors.success} />
              <Text style={s.protectionText}>{t('guardian.protectionActive')}</Text>
            </View>

            {/* Live trip */}
            <SectionTitle title={t('guardian.activeTrip')} />
            {!live?.active || !trip ? (
              <EmptyState icon="navigation" title={t('guardian.noActiveTrip')} hint={t('guardian.noActiveTripHint')} />
            ) : (
              <Card>
                <View style={s.row}>
                  <Text style={s.cardTitle}>{trip.route_name ?? '—'}</Text>
                  <Badge label={trip.status_label} tone={trip.status === 'started' ? 'success' : 'primary'} />
                </View>

                {/* Progress */}
                <Text style={s.meta}>{t('guardian.progress')}: {trip.progress_percent}%</Text>
                <View style={s.progressTrack}>
                  <View style={[s.progressFill, { width: `${Math.min(100, Math.max(0, trip.progress_percent))}%` }]} />
                </View>

                {/* Map */}
                {loc && (
                  <LiveMap points={[{ lat: loc.lat, lng: loc.lng, kind: 'captain', label: t('guardian.trackLive') }]} height={200} />
                )}

                {/* Captain */}
                {captain && (
                  <View style={s.infoRow}>
                    <View style={s.infoIcon}><Icon name="user" size={16} color={theme.colors.primary} /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.infoTitle}>{captain.name}</Text>
                      <Text style={s.meta}>⭐ {captain.rating.toFixed(1)} · {captain.total_trips} {t('guardian.trackLive')}</Text>
                    </View>
                  </View>
                )}

                {/* Vehicle */}
                {vehicle && (
                  <View style={s.infoRow}>
                    <View style={s.infoIcon}><Icon name="truck" size={16} color={theme.colors.primary} /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.infoTitle}>{vehicle.make} {vehicle.model} · {vehicle.color}</Text>
                      <Text style={s.meta}>{t('guardian.plate')}: {vehicle.plate_number}</Text>
                    </View>
                  </View>
                )}

                {/* Call captain */}
                <Pressable onPress={callCaptain} style={s.callBtn}>
                  <Icon name="phone" size={16} color={theme.colors.onPrimary} />
                  <Text style={s.callText}>{t('guardian.callCaptain')}</Text>
                </Pressable>
              </Card>
            )}

            {/* Safe-arrival log */}
            <SectionTitle title={t('guardian.arrivalLog')} />
            {events.length === 0 ? (
              <EmptyState icon="clock" title={t('guardian.noArrivals')} />
            ) : (
              <Card>
                {events.map((e, i) => (
                  <View key={`${e.trip_id}-${e.type}-${i}`} style={s.eventRow}>
                    <View style={[s.eventDot, { backgroundColor: e.type === 'arrival' ? theme.colors.success : theme.colors.primary }]}>
                      <Icon name={e.type === 'arrival' ? 'check' : 'navigation'} size={13} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.eventLabel}>{e.type === 'arrival' ? t('guardian.arrivedSafely') : t('guardian.departed')}</Text>
                      <Text style={s.meta}>{e.route_name ?? ''} · {new Date(e.at).toLocaleString(locale)}</Text>
                    </View>
                  </View>
                ))}
              </Card>
            )}

            {/* SOS — hold to trigger */}
            <Pressable
              onPressIn={onSosPressIn}
              onPressOut={onSosPressOut}
              style={[s.sosBtn, sosProgress && s.sosBtnActive]}
            >
              <Icon name="alert-octagon" size={22} color="#FFFFFF" />
              <View>
                <Text style={s.sosTitle}>{t('guardian.sos')}</Text>
                <Text style={s.sosHint}>{t('guardian.sosHold')}</Text>
              </View>
            </Pressable>
            {selectedChild ? <Text style={s.sosFor}>{t('guardian.selectChild')}: {selectedChild.name ?? '—'}</Text> : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colors.background },
    content: { padding: t.spacing.lg, paddingBottom: t.spacing['3xl'] },
    headerRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
    h1: { fontFamily: t.fontFamily.extrabold, fontSize: 24, color: t.colors.text, textAlign: 'right' },
    sub: { fontFamily: t.fontFamily.regular, fontSize: 13, color: t.colors.textSecondary, textAlign: 'right', marginTop: 2 },
    shieldBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center' },
    meta: { fontFamily: t.fontFamily.regular, fontSize: 13, color: t.colors.textSecondary, textAlign: 'right', marginTop: 4 },
    childRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginTop: t.spacing.base },
    childChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: t.colors.border, backgroundColor: t.colors.surface },
    childChipActive: { backgroundColor: t.colors.primary, borderColor: t.colors.primary },
    childChipText: { fontFamily: t.fontFamily.medium, fontSize: 13, color: t.colors.textSecondary },
    childChipTextActive: { color: t.colors.onPrimary },
    protection: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, backgroundColor: `${t.colors.success}1A`, borderRadius: t.radius.md, padding: t.spacing.sm, marginTop: t.spacing.base },
    protectionText: { fontFamily: t.fontFamily.bold, fontSize: 13, color: t.colors.success },
    row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.text, flex: 1, textAlign: 'right' },
    progressTrack: { height: 8, borderRadius: 999, backgroundColor: t.colors.border, marginTop: 6, overflow: 'hidden' },
    progressFill: { height: 8, borderRadius: 999, backgroundColor: t.colors.primary },
    infoRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginTop: t.spacing.sm },
    infoIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: t.colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    infoTitle: { fontFamily: t.fontFamily.bold, fontSize: 14, color: t.colors.text, textAlign: 'right' },
    callBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: t.spacing.base, backgroundColor: t.colors.primary, borderRadius: t.radius.md, paddingVertical: 12 },
    callText: { fontFamily: t.fontFamily.bold, fontSize: 14, color: t.colors.onPrimary },
    eventRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 8 },
    eventDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    eventLabel: { fontFamily: t.fontFamily.bold, fontSize: 14, color: t.colors.text, textAlign: 'right' },
    sosBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: t.spacing.xl, backgroundColor: t.colors.danger, borderRadius: t.radius.xl, paddingVertical: 18, ...t.shadow.md },
    sosBtnActive: { opacity: 0.7, transform: [{ scale: 0.98 }] },
    sosTitle: { fontFamily: t.fontFamily.extrabold, fontSize: 17, color: '#FFFFFF', textAlign: 'center' },
    sosHint: { fontFamily: t.fontFamily.regular, fontSize: 12, color: '#FFFFFF', opacity: 0.85, textAlign: 'center' },
    sosFor: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary, textAlign: 'center', marginTop: 8 },
  });
