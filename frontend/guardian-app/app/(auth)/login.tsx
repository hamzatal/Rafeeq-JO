import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { isValidJordanPhone, normalizeJordanPhone } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Screen } from '../../src/components/Screen';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { Banner } from '../../src/components/Banner';
import { useI18n } from '../../src/i18n';
import { api } from '../../src/lib/api';
import { useTheme, type AppTheme } from '../../src/theme';

/** Guardian sign-in is passwordless: request an OTP, then verify it. */
export default function Login() {
  const { t } = useI18n();
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const onSubmit = async () => {
    setFormError(null);
    if (!isValidJordanPhone(phone)) return setFormError(t('validation.invalidPhone'));
    const normalized = normalizeJordanPhone(phone)!;
    setLoading(true);
    try {
      const res = await api.auth.requestOtp(normalized);
      router.push({
        pathname: '/(auth)/otp',
        params: { phone: normalized, purpose: 'login', debug: res?.otp_debug ?? '' },
      });
    } catch (e) {
      setFormError(e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <View style={s.header}>
        <Text style={s.title}>{t('guardian.login')}</Text>
        <Text style={s.subtitle}>{t('guardian.loginSubtitle')}</Text>
      </View>
      <Banner message={formError} />
      <Input label={t('auth.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="07XXXXXXXX" />
      <Button title={t('guardian.sendCode')} onPress={onSubmit} loading={loading} />
    </Screen>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    header: { marginTop: t.spacing['2xl'], marginBottom: t.spacing.xl, gap: t.spacing.xs },
    title: { fontFamily: t.fontFamily.extrabold, fontSize: 24, color: t.colors.text, textAlign: 'right' },
    subtitle: { fontFamily: t.fontFamily.regular, fontSize: 15, color: t.colors.textSecondary, textAlign: 'right' },
  });
