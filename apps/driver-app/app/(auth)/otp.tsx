import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { validators } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Screen } from '../../src/components/Screen';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { Banner } from '../../src/components/Banner';
import { useI18n } from '../../src/i18n';
import { useAuth } from '../../src/store/auth';
import { theme } from '../../src/theme';

export default function Otp() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useLocalSearchParams<{ phone: string; purpose: string; debug?: string }>();
  const verifyOtp = useAuth((s) => s.verifyOtp);

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const onVerify = async () => {
    setFormError(null);
    const err = validators.otp(code.trim());
    if (err) {
      setFormError(err);
      return;
    }
    setLoading(true);
    try {
      await verifyOtp({
        phone: params.phone,
        code: code.trim(),
        purpose: (params.purpose as 'register' | 'login') ?? 'register',
      });
      router.replace('/(app)/dashboard');
    } catch (e) {
      setFormError(e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.title}>{t('auth.otpTitle')}</Text>
        <Text style={styles.subtitle}>{t('auth.otpSubtitle')}</Text>
        <Text style={styles.phone}>{params.phone}</Text>
        {params.debug ? <Text style={styles.debug}>كود التجربة: {params.debug}</Text> : null}
      </View>
      <Banner message={formError} />
      <Input value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} placeholder="------" style={styles.codeInput} />
      <Button title={t('auth.verify')} onPress={onVerify} loading={loading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: theme.spacing['2xl'], marginBottom: theme.spacing.xl, gap: theme.spacing.xs },
  title: { fontFamily: theme.fontFamily.extrabold, fontSize: 24, color: theme.colors.text, textAlign: 'right' },
  subtitle: { fontFamily: theme.fontFamily.regular, fontSize: 15, color: theme.colors.textSecondary, textAlign: 'right' },
  phone: { fontFamily: theme.fontFamily.bold, fontSize: 16, color: theme.colors.primary, textAlign: 'right' },
  debug: { fontFamily: theme.fontFamily.medium, fontSize: 13, color: theme.colors.warning, textAlign: 'right' },
  codeInput: { textAlign: 'center', letterSpacing: 8, fontSize: 22 },
});
