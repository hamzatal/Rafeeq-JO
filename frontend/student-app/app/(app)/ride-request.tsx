import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { FareQuote, RideRequest, RideType, University } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { Banner } from '../../src/components/Banner';
import { useI18n } from '../../src/i18n';
import { api } from '../../src/lib/api';
import { useTheme, type AppTheme } from '../../src/theme';

export default function RideRequestScreen() {
  const { t, locale } = useI18n();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [universities, setUniversities] = useState<University[]>([]);
  const [universityId, setUniversityId] = useState<string | null>(null);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [address, setAddress] = useState('');
  const [type, setType] = useState<RideType>('scheduled');
  const [quote, setQuote] = useState<FareQuote | null>(null);
  const [mine, setMine] = useState<RideRequest[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const load = async () => {
    try {
      const [unis, reqs] = await Promise.all([api.catalog.listUniversities(), api.rideRequests.mine()]);
      setUniversities(unis);
      setMine(reqs);
      if (!universityId && unis[0]) setUniversityId(unis[0].id);
    } catch {
      /* silent */
    }
  };

  useEffect(() => {
    load();
  }, []);

  const useMyLocation = () => {
    const geo = (globalThis as unknown as { navigator?: { geolocation?: any } }).navigator?.geolocation;
    if (!geo) {
      setMsg({ text: t('rideRequest.locationFailed'), ok: false });
      return;
    }
    geo.getCurrentPosition(
      (pos: { coords: { latitude: number; longitude: number } }) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
      },
      () => setMsg({ text: t('rideRequest.locationFailed'), ok: false }),
    );
  };

  const estimate = async () => {
    try {
      const q = await api.rideRequests.estimate({ type, riders: 1, capacity: 4 });
      setQuote(q);
    } catch {
      /* silent */
    }
  };

  const submit = async () => {
    if (!universityId) {
      setMsg({ text: t('rideRequest.pickUniversity'), ok: false });
      return;
    }
    const la = Number(lat);
    const ln = Number(lng);
    if (!Number.isFinite(la) || !Number.isFinite(ln)) {
      setMsg({ text: t('rideRequest.locationFailed'), ok: false });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await api.rideRequests.create({
        university_id: universityId,
        pickup_lat: la,
        pickup_lng: ln,
        pickup_address: address || undefined,
        desired_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        type,
      });
      setMsg({ text: t('rideRequest.created'), ok: true });
      await load();
    } catch (e) {
      setMsg({ text: e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('common.error'), ok: false });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <Text style={s.h1}>{t('rideRequest.title')}</Text>
      {msg && <Banner message={msg.text} variant={msg.ok ? 'success' : 'error'} />}

      <Text style={s.section}>{t('rideRequest.university')}</Text>
      <View style={s.chips}>
        {universities.map((u) => (
          <Pressable
            key={u.id}
            onPress={() => setUniversityId(u.id)}
            style={[s.chip, universityId === u.id && s.chipActive]}
          >
            <Text style={[s.chipText, universityId === u.id && s.chipTextActive]}>
              {locale === 'ar' ? u.name_ar : u.name_en}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={s.section}>{t('rideRequest.pickup')}</Text>
      <Pressable onPress={useMyLocation} style={s.locBtn}>
        <Text style={s.locText}>📍 {t('rideRequest.useMyLocation')}</Text>
      </Pressable>
      <View style={s.row2}>
        <View style={s.half}><Input label={t('rideRequest.lat')} keyboardType="numeric" value={lat} onChangeText={setLat} /></View>
        <View style={s.half}><Input label={t('rideRequest.lng')} keyboardType="numeric" value={lng} onChangeText={setLng} /></View>
      </View>
      <Input label={t('rideRequest.address')} value={address} onChangeText={setAddress} />

      <View style={s.typeRow}>
        <Pressable onPress={() => setType('scheduled')} style={[s.typeChip, type === 'scheduled' && s.chipActive]}>
          <Text style={[s.chipText, type === 'scheduled' && s.chipTextActive]}>{t('rideRequest.typeScheduled')}</Text>
        </Pressable>
        <Pressable onPress={() => setType('express')} style={[s.typeChip, type === 'express' && s.chipActive]}>
          <Text style={[s.chipText, type === 'express' && s.chipTextActive]}>{t('rideRequest.typeExpress')}</Text>
        </Pressable>
      </View>

      <Pressable onPress={estimate} style={s.estimateBtn}>
        <Text style={s.locText}>{t('rideRequest.estimate')}</Text>
      </Pressable>
      {quote && (
        <View style={s.quoteCard}>
          <Text style={s.quoteText}>{t('rideRequest.estimatedFare')}: {(quote.fare_fils / 1000).toFixed(3)} {t('subscriptions.currency')}</Text>
          <Text style={s.meta}>{t('rideRequest.surge')}: ×{quote.surge_multiplier}</Text>
        </View>
      )}

      <Button title={t('rideRequest.submit')} onPress={submit} loading={busy} style={s.submit} />

      <Text style={s.section}>{t('rideRequest.myRequests')}</Text>
      {mine.length === 0 ? (
        <Text style={s.meta}>{t('rideRequest.none')}</Text>
      ) : (
        mine.map((r) => (
          <View key={r.id} style={s.reqCard}>
            <View style={s.row}>
              <Text style={s.cardTitle}>{r.zone ? (locale === 'ar' ? r.zone.name_ar : r.zone.name_en) : '—'}</Text>
              <Text style={s.badge}>{r.status_label}</Text>
            </View>
            <Text style={s.meta}>{r.is_express ? t('rideRequest.typeExpress') : t('rideRequest.typeScheduled')}</Text>
          </View>
        ))
      )}
    </Screen>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    h1: { fontFamily: t.fontFamily.extrabold, fontSize: 22, color: t.colors.text, textAlign: 'right', marginBottom: t.spacing.base },
    section: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.text, textAlign: 'right', marginTop: t.spacing.base, marginBottom: t.spacing.sm },
    chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: t.spacing.sm },
    chip: { paddingHorizontal: t.spacing.base, paddingVertical: 8, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.border, backgroundColor: t.colors.surface },
    chipActive: { borderColor: t.colors.primary, backgroundColor: `${t.colors.primary}1A` },
    chipText: { fontFamily: t.fontFamily.medium, fontSize: 13, color: t.colors.text },
    chipTextActive: { color: t.colors.primary, fontFamily: t.fontFamily.bold },
    locBtn: { borderWidth: 1, borderColor: t.colors.primary, borderRadius: t.radius.md, paddingVertical: 10, alignItems: 'center', marginBottom: t.spacing.sm },
    locText: { fontFamily: t.fontFamily.bold, fontSize: 14, color: t.colors.primary },
    row2: { flexDirection: 'row-reverse', gap: t.spacing.sm },
    half: { flex: 1 },
    typeRow: { flexDirection: 'row-reverse', gap: t.spacing.sm, marginTop: t.spacing.sm },
    typeChip: { flex: 1, paddingVertical: 12, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.border, alignItems: 'center', backgroundColor: t.colors.surface },
    estimateBtn: { borderWidth: 1.5, borderColor: t.colors.primary, borderRadius: t.radius.md, paddingVertical: 12, alignItems: 'center', marginTop: t.spacing.base },
    quoteCard: { backgroundColor: t.colors.surface, borderRadius: t.radius.md, padding: t.spacing.base, marginTop: t.spacing.sm },
    quoteText: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.text, textAlign: 'right' },
    submit: { marginTop: t.spacing.base },
    reqCard: { backgroundColor: t.colors.card, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.border, padding: t.spacing.base, marginBottom: t.spacing.sm },
    cardTitle: { fontFamily: t.fontFamily.bold, fontSize: 14, color: t.colors.text },
    badge: { fontFamily: t.fontFamily.bold, fontSize: 12, color: t.colors.primary },
    row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    meta: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary, textAlign: 'right', marginTop: 2 },
  });
