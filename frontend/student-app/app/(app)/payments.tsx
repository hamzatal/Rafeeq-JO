import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { CliqInstructions, PaymentRequest } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { Banner } from '../../src/components/Banner';
import { useI18n } from '../../src/i18n';
import { api } from '../../src/lib/api';
import { useTheme, type AppTheme } from '../../src/theme';

/** Web-only file picker for the CliQ transfer proof image. */
function pickImageWeb(): Promise<unknown> {
  return new Promise((resolve) => {
    const doc = (globalThis as unknown as { document?: any }).document;
    if (!doc) return resolve(null);
    const input = doc.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => resolve(input.files && input.files[0] ? input.files[0] : null);
    input.click();
  });
}

export default function Payments() {
  const { t, locale } = useI18n();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

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
    if (Platform.OS !== 'web') {
      setMsg({ text: t('payments.webOnlyUpload'), ok: false });
      return;
    }
    const file = await pickImageWeb();
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

  return (
    <Screen scroll>
      <Text style={s.h1}>{t('payments.title')}</Text>
      {msg && <Banner message={msg.text} variant={msg.ok ? 'success' : 'error'} />}

      <View style={s.card}>
        <Text style={s.section}>{t('payments.topupWallet')}</Text>
        <Input label={t('wallet.amount')} keyboardType="numeric" value={amount} onChangeText={setAmount} placeholder="5" />
        <Button title={t('payments.topupWallet')} onPress={createTopup} loading={busy} />
      </View>

      {instructions && (
        <View style={s.cliqCard}>
          <Text style={s.cliqTitle}>{t('wallet.cliqTitle')}</Text>
          <Text style={s.rowValue}>{t('wallet.alias')}: {instructions.alias ?? '—'}</Text>
          <Text style={s.rowValue}>{t('wallet.reference')}: {instructions.reference}</Text>
          <Text style={s.note}>{instructions.note}</Text>
        </View>
      )}

      <Text style={s.section}>{t('payments.title')}</Text>
      {items.length === 0 ? (
        <Text style={s.meta}>{t('payments.none')}</Text>
      ) : (
        items.map((p) => (
          <View key={p.id} style={s.card}>
            <View style={s.row}>
              <Text style={s.cardTitle}>{p.number}</Text>
              <Text style={s.badge}>{p.status_label}</Text>
            </View>
            <Text style={s.meta}>{p.purpose_label} · {p.amount_jod.toFixed(3)} {t('subscriptions.currency')}</Text>
            {p.created_at && <Text style={s.meta}>{new Date(p.created_at).toLocaleString(locale)}</Text>}
            {p.reject_reason && <Text style={[s.meta, { color: theme.colors.danger }]}>{p.reject_reason}</Text>}
            {canUpload(p.status) && (
              <Pressable onPress={() => uploadProof(p.id)} style={s.uploadBtn}>
                <Text style={s.uploadText}>{uploading === p.id ? '...' : t('payments.uploadProof')}</Text>
              </Pressable>
            )}
          </View>
        ))
      )}
    </Screen>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    h1: { fontFamily: t.fontFamily.extrabold, fontSize: 24, color: t.colors.text, textAlign: 'right', marginBottom: t.spacing.base },
    section: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.text, textAlign: 'right', marginTop: t.spacing.base, marginBottom: t.spacing.sm },
    card: { backgroundColor: t.colors.card, borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.colors.border, padding: t.spacing.base, marginBottom: t.spacing.base },
    cliqCard: { backgroundColor: t.colors.surface, borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.colors.primary, padding: t.spacing.base, marginBottom: t.spacing.base },
    cliqTitle: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.text, textAlign: 'right', marginBottom: t.spacing.xs },
    row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.text },
    badge: { fontFamily: t.fontFamily.bold, fontSize: 12, color: t.colors.primary },
    rowValue: { fontFamily: t.fontFamily.medium, fontSize: 13, color: t.colors.text, textAlign: 'right', marginBottom: 2 },
    note: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.muted, textAlign: 'right', marginTop: t.spacing.xs },
    meta: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary, textAlign: 'right', marginTop: 2 },
    uploadBtn: { marginTop: t.spacing.sm, borderWidth: 1.5, borderColor: t.colors.primary, borderRadius: t.radius.md, paddingVertical: 10, alignItems: 'center' },
    uploadText: { fontFamily: t.fontFamily.bold, fontSize: 14, color: t.colors.primary },
  });
