import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { validators } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Screen } from '../../src/components/Screen';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { Banner } from '../../src/components/Banner';
import { AuthHeader } from '../../src/components/AuthHeader';
import { useI18n } from '../../src/i18n';
import { useAuth } from '../../src/store/auth';
import { useTheme, type AppTheme } from '../../src/theme';

export default function Otp() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useLocalSearchParams<{ phone: string; purpose: string; debug?: string }>();
  const verifyOtp = useAuth((s) => s.verifyOtp);
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const onVerify = async () => {
    setFormError(null);
    const err = validators.otp(code.trim());
    if (err) return setFormError(err);
    setLoading(true);
    try {
      await verifyOtp({ phone: params.phone, code: code.trim(), purpose: (params.purpose as 'register' | 'login') ?? 'register' });
      router.replace('/(app)/home');
    } catch (e) {
      setFormError(e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <AuthHeader title={t('auth.otpTitle')} subtitle={t('auth.otpSubtitle')} />
      <View style={s.header}>
        <Text style={s.phone}>{params.phone}</Text>
        {params.debug ? <Text style={s.debug}>{t('auth.testCode')}: {params.debug}</Text> : null}
      </View>
      <Banner message={formError} />
      <Input value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} placeholder="------" style={s.codeInput} />
      <Button title={t('auth.verify')} onPress={onVerify} loading={loading} />
    </Screen>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    header: { marginBottom: t.spacing.xl, gap: t.spacing.xs, alignItems: 'center' },
    phone: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.primary, textAlign: 'center' },
    debug: { fontFamily: t.fontFamily.medium, fontSize: 13, color: t.colors.warning, textAlign: 'center' },
    codeInput: { textAlign: 'center', letterSpacing: 8, fontSize: 22 },
  });
