import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Parcel, ParcelSize } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { Banner } from '../../src/components/Banner';
import { Card, EmptyState, Badge } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { useI18n } from '../../src/i18n';
import { api } from '../../src/lib/api';
import { useTheme, type AppTheme } from '../../src/theme';

const SIZES: ParcelSize[] = ['small', 'medium', 'large'];

export default function Parcels() {
  const { t, locale } = useI18n();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [items, setItems] = useState<Parcel[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [size, setSize] = useState<ParcelSize>('small');
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const load = async () => {
    try {
      setItems(await api.parcels.mine());
    } catch {
      /* silent */
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    if (name.trim().length < 2 || phone.trim().length < 6) return;
    setBusy(true);
    setMsg(null);
    try {
      await api.parcels.create({ receiver_name: name, receiver_phone: phone, from_address: from || undefined, to_address: to || undefined, size, description: desc || undefined });
      setMsg({ text: t('parcels.created'), ok: true });
      setName(''); setPhone(''); setFrom(''); setTo(''); setDesc('');
      setShowForm(false);
      await load();
    } catch (e) {
      setMsg({ text: e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('parcels.failed'), ok: false });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.h1}>{t('parcels.title')}</Text>
          <Pressable onPress={() => setShowForm((v) => !v)} style={s.addBtn}>
            <Icon name={showForm ? 'x' : 'plus'} size={18} color={theme.colors.onPrimary} />
          </Pressable>
        </View>
        {msg && <Banner message={msg.text} variant={msg.ok ? 'success' : 'error'} />}

        {showForm && (
          <Card>
            <Input label={t('parcels.receiverName')} value={name} onChangeText={setName} />
            <Input label={t('parcels.receiverPhone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <Input label={t('parcels.fromAddress')} value={from} onChangeText={setFrom} />
            <Input label={t('parcels.toAddress')} value={to} onChangeText={setTo} />
            <Text style={s.fieldLabel}>{t('parcels.size')}</Text>
            <View style={s.chips}>
              {SIZES.map((sz) => (
                <Pressable key={sz} onPress={() => setSize(sz)} style={[s.chip, size === sz && s.chipActive]}>
                  <Text style={[s.chipText, size === sz && s.chipTextActive]}>{t(`parcels.${sz}`)}</Text>
                </Pressable>
              ))}
            </View>
            <Input label={t('parcels.description')} value={desc} onChangeText={setDesc} />
            <Button title={t('parcels.newParcel')} onPress={submit} loading={busy} />
          </Card>
        )}

        {items.length === 0 ? (
          <EmptyState icon="package" title={t('parcels.none')} />
        ) : (
          items.map((p) => (
            <Card key={p.id}>
              <View style={s.row}>
                <Text style={s.cardTitle}>{p.number}</Text>
                <Badge label={p.status_label} tone={p.status === 'delivered' ? 'success' : p.status === 'cancelled' ? 'danger' : 'primary'} />
              </View>
              <Text style={s.meta}>{p.receiver_name} · {p.size_label} · {p.fee_jod.toFixed(3)} {t('subscriptions.currency')}</Text>
              {p.pickup_code && (
                <View style={s.codeRow}>
                  <Text style={s.codeLabel}>{t('parcels.pickupCode')}</Text>
                  <Text style={s.code}>{p.pickup_code}</Text>
                </View>
              )}
              {p.delivery_code && (
                <View style={s.codeRow}>
                  <Text style={s.codeLabel}>{t('parcels.deliveryCode')}</Text>
                  <Text style={s.code}>{p.delivery_code}</Text>
                </View>
              )}
              {p.created_at && <Text style={s.meta}>{new Date(p.created_at).toLocaleString(locale)}</Text>}
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colors.background },
    content: { padding: t.spacing.lg, paddingBottom: t.spacing['3xl'] },
    header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: t.spacing.base },
    h1: { fontFamily: t.fontFamily.extrabold, fontSize: 26, color: t.colors.text, textAlign: 'right' },
    addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center' },
    fieldLabel: { fontFamily: t.fontFamily.medium, fontSize: 14, color: t.colors.text, textAlign: 'right', marginBottom: t.spacing.xs },
    chips: { flexDirection: 'row-reverse', gap: t.spacing.sm, marginBottom: t.spacing.base },
    chip: { flex: 1, paddingVertical: 10, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.border, alignItems: 'center', backgroundColor: t.colors.surface },
    chipActive: { borderColor: t.colors.primary, backgroundColor: t.colors.primarySoft },
    chipText: { fontFamily: t.fontFamily.medium, fontSize: 13, color: t.colors.text },
    chipTextActive: { color: t.colors.primary, fontFamily: t.fontFamily.bold },
    row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.text },
    codeRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', backgroundColor: t.colors.primarySoft, borderRadius: t.radius.sm, paddingHorizontal: t.spacing.sm, paddingVertical: 6, marginTop: 6 },
    codeLabel: { fontFamily: t.fontFamily.medium, fontSize: 12, color: t.colors.textSecondary },
    code: { fontFamily: t.fontFamily.extrabold, fontSize: 18, letterSpacing: 3, color: t.colors.primary },
    meta: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary, textAlign: 'right', marginTop: 4 },
  });
