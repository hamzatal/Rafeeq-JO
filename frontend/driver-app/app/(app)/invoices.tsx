import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import type { CliqInstructions, PaymentRequest } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { Banner } from '../../src/components/Banner';
import { Card, EmptyState, SectionTitle, Badge } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { useI18n } from '../../src/i18n';
import { api } from '../../src/lib/api';
import { saveInvoicePdf } from '../../src/lib/invoice';
import { useAuth } from '../../src/store/auth';
import { useTheme, type AppTheme } from '../../src/theme';

async function pickProof(): Promise<Blob | null> {
  if (Platform.OS === 'web') return null;
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  return { uri: a.uri, name: a.fileName ?? `receipt-${Date.now()}.jpg`, type: a.mimeType ?? 'image/jpeg' } as unknown as Blob;
}


export default function Invoices() {
  const { t, locale } = useI18n();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const user = useAuth((st) => st.user);

  const [items, setItems] = useState<PaymentRequest[]>([]);
  const [amount, setAmount] = useState('');
  const [instructions, setInstructions] = useState<CliqInstructions | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const load = async () => {
    try {
      setItems(await api.payments.mine());
    } catch {
      /* surfaced by actions */
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createTopup = async () => {
    const jod = Number(amount);
    if (!Number.isFinite(jod) || jod < 1) {
      setMsg({ text: t('wallet.invalidAmount'), ok: false });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const { instructions: ins } = await api.payments.create({ purpose: 'wallet_topup', amount_fils: Math.round(jod * 1000) });
      setInstructions(ins);
      setMsg({ text: t('payments.created'), ok: true });
      await load();
    } catch (e) {
      setMsg({ text: e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('payments.failed'), ok: false });
    } finally {
      setBusy(false);
    }
  };


  const uploadProof = async (id: string) => {
    const file = await pickProof();
    if (!file) return;
    setUploading(id);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append('proof', file as Blob);
      await api.payments.submitProof(id, fd);
      setMsg({ text: t('payments.proofUploaded'), ok: true });
      await load();
    } catch (e) {
      setMsg({ text: e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('common.error'), ok: false });
    } finally {
      setUploading(null);
    }
  };

  const canUpload = (status: string) => ['pending', 'submitted', 'under_review'].includes(status);
  const tone = (status: string) => (status === 'approved' ? 'success' : status === 'rejected' ? 'danger' : 'primary');

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.h1}>{t('payments.title')}</Text>
        {msg && <Banner message={msg.text} variant={msg.ok ? 'success' : 'error'} />}

        <SectionTitle title={t('payments.topupWallet')} />
        <Card>
          <Input label={t('wallet.amount')} keyboardType="numeric" value={amount} onChangeText={setAmount} placeholder="5" />
          <Button title={t('payments.topupWallet')} onPress={createTopup} loading={busy} />
        </Card>

        {instructions && (
          <Card style={{ borderColor: theme.colors.primary }}>
            <View style={s.cliqHead}>
              <Icon name="info" size={18} color={theme.colors.primary} />
              <Text style={s.cliqTitle}>{t('wallet.cliqTitle')}</Text>
            </View>
            <Text style={s.rowValue}>{t('wallet.alias')}: {instructions.alias ?? '—'}</Text>
            <Text style={s.rowValue}>{t('wallet.reference')}: {instructions.reference}</Text>
            <Text style={s.note}>{instructions.note}</Text>
          </Card>
        )}


        <SectionTitle title={t('payments.title')} />
        {items.length === 0 ? (
          <EmptyState icon="dollar-sign" title={t('payments.none')} />
        ) : (
          items.map((p) => (
            <Card key={p.id}>
              <View style={s.row}>
                <Text style={s.cardTitle}>{p.number}</Text>
                <Badge label={p.status_label} tone={tone(p.status)} />
              </View>
              <Text style={s.meta}>{p.purpose_label} · {p.amount_jod.toFixed(3)} {t('subscriptions.currency')}</Text>
              {p.created_at && <Text style={s.meta}>{new Date(p.created_at).toLocaleString(locale)}</Text>}
              {p.reject_reason && <Text style={[s.meta, { color: theme.colors.danger }]}>{p.reject_reason}</Text>}
              {canUpload(p.status) && (
                <Pressable onPress={() => uploadProof(p.id)} style={s.uploadBtn}>
                  <Icon name="upload" size={16} color={theme.colors.primary} />
                  <Text style={s.uploadText}>{uploading === p.id ? '...' : t('payments.uploadProof')}</Text>
                </Pressable>
              )}
              <Pressable onPress={() => saveInvoicePdf(p, user?.full_name ?? '').catch(() => {})} style={s.invoiceBtn}>
                <Icon name="download" size={16} color={theme.colors.muted} />
                <Text style={s.invoiceText}>{t('payments.saveInvoice')}</Text>
              </Pressable>
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
    h1: { fontFamily: t.fontFamily.extrabold, fontSize: 26, color: t.colors.text, textAlign: 'right', marginBottom: t.spacing.base },
    cliqHead: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: t.spacing.xs },
    cliqTitle: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.text },
    row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.text },
    rowValue: { fontFamily: t.fontFamily.medium, fontSize: 13, color: t.colors.text, textAlign: 'right', marginBottom: 2 },
    note: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.muted, textAlign: 'right', marginTop: t.spacing.xs },
    meta: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary, textAlign: 'right', marginTop: 2 },
    uploadBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: t.spacing.sm, borderWidth: 1.5, borderColor: t.colors.primary, borderRadius: t.radius.md, paddingVertical: 10 },
    uploadText: { fontFamily: t.fontFamily.bold, fontSize: 14, color: t.colors.primary },
    invoiceBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: t.spacing.xs, paddingVertical: 8 },
    invoiceText: { fontFamily: t.fontFamily.medium, fontSize: 13, color: t.colors.muted },
  });
