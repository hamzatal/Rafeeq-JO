import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Screen } from '../../src/components/Screen';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { Banner } from '../../src/components/Banner';
import { useI18n } from '../../src/i18n';
import { api } from '../../src/lib/api';
import { useTheme, type AppTheme } from '../../src/theme';

export default function Withdraw() {
  const { t } = useI18n();
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [amount, setAmount] = useState('');
  const [destination, setDestination] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    const jod = parseFloat(amount.replace(',', '.'));
    if (isNaN(jod) || jod <= 0) return setError(t('validation.required'));
    const amount_fils = Math.round(jod * 1000);
    setLoading(true);
    try {
      await api.payouts.requestWithdrawal({ amount_fils, destination: destination.trim() || undefined });
      router.back();
    } catch (e) {
      setError(e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <View style={s.header}>
        <Text style={s.title}>{t('payout.withdraw')}</Text>
        <Text style={s.hint}>{t('payout.minHint')}</Text>
      </View>
      <Banner message={error} />
      <Input label={t('payout.amount')} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="5.000" />
      <Input label={t('payout.destination')} value={destination} onChangeText={setDestination} placeholder="07XXXXXXXX" keyboardType="phone-pad" />
      <Button title={t('payout.submit')} onPress={submit} loading={loading} />
    </Screen>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    header: { marginTop: t.spacing['2xl'], marginBottom: t.spacing.xl, gap: t.spacing.xs },
    title: { fontFamily: t.fontFamily.extrabold, fontSize: 24, color: t.colors.text, textAlign: 'right' },
    hint: { fontFamily: t.fontFamily.regular, fontSize: 14, color: t.colors.textSecondary, textAlign: 'right' },
  });
