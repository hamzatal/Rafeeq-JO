import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { validators } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { Banner } from '../../src/components/Banner';
import { AuthShell } from '../../src/components/AuthShell';
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

  useEffect(() => {
    if (params.debug && !code) setCode(String(params.debug));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.debug]);

  const onVerify = async () => {
    setFormError(null);
    const err = validators.otp(code.trim());
    if (err) return setFormError(err);
    setLoading(true);
    try {
      await verifyOtp({ phone: params.phone, code: code.trim(), purpose: (params.purpose as 'register' | 'login') ?? 'register' });
      router.replace('/(app)/dashboard');
    } catch (e) {
      setFormError(e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title={t('auth.otpTitle')} subtitle={`${t('auth.otpSubtitle')} — ${params.phone}`}>
      {formError ? <Banner message={formError} variant="error" /> : null}
      {params.debug ? <Text style={s.debug}>{t('auth.testCode')}: {params.debug}</Text> : null}
      <Input value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} placeholder="------" style={s.codeInput} />
      <Button title={t('auth.verify')} onPress={onVerify} loading={loading} />
    </AuthShell>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    debug: { fontFamily: t.fontFamily.medium, fontSize: 13, color: t.colors.accent, textAlign: 'center', marginBottom: t.spacing.md },
    codeInput: { textAlign: 'center', letterSpacing: 8, fontSize: 24 },
  });
