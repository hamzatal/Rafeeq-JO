import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { normalizeJordanPhone, validators } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Screen } from '../../src/components/Screen';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { Banner } from '../../src/components/Banner';
import { useI18n } from '../../src/i18n';
import { useAuth } from '../../src/store/auth';
import { api } from '../../src/lib/api';
import { useTheme, type AppTheme } from '../../src/theme';

/** Password-first captain login (OTP fallback + password reset). */
export default function Login() {
  const { t } = useI18n();
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const login = useAuth((a) => a.login);

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const onSubmit = async () => {
    setFormError(null);
    const phoneErr = validators.phone(phone);
    if (phoneErr) return setFormError(phoneErr);
    if (!password) return setFormError(t('validation.required'));
    setLoading(true);
    try {
      await login({ phone: normalizeJordanPhone(phone)!, password });
      router.replace('/(app)/dashboard');
    } catch (e) {
      setFormError(e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const onOtp = async () => {
    setFormError(null);
    const phoneErr = validators.phone(phone);
    if (phoneErr) return setFormError(phoneErr);
    const normalized = normalizeJordanPhone(phone)!;
    setOtpLoading(true);
    try {
      const res = await api.auth.requestOtp(normalized);
      router.push({ pathname: '/(auth)/otp', params: { phone: normalized, purpose: 'login', debug: res.otp_debug ?? '' } });
    } catch (e) {
      setFormError(e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('common.error'));
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <Screen scroll>
      <View style={s.header}>
        <Text style={s.title}>{t('auth.login')}</Text>
        <Text style={s.subtitle}>{t('auth.loginHint')}</Text>
      </View>
      <Banner message={formError} />
      <Input label={t('auth.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="07XXXXXXXX" />
      <Input label={t('auth.password')} value={password} onChangeText={setPassword} secureTextEntry />

      <Pressable onPress={() => router.push('/(auth)/forgot-password')} hitSlop={8} style={s.forgot}>
        <Text style={[s.forgotText, { color: theme.colors.primary }]}>{t('auth.forgotPassword')}</Text>
      </Pressable>

      <Button title={t('auth.login')} onPress={onSubmit} loading={loading} />

      <View style={s.divider}>
        <View style={[s.line, { backgroundColor: theme.colors.border }]} />
        <Text style={[s.or, { color: theme.colors.muted }]}>—</Text>
        <View style={[s.line, { backgroundColor: theme.colors.border }]} />
      </View>

      <Button title={t('auth.loginWithOtp')} onPress={onOtp} loading={otpLoading} variant="outline" icon="message-square" />
    </Screen>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    header: { marginTop: t.spacing['2xl'], marginBottom: t.spacing.xl, gap: t.spacing.xs },
    title: { fontFamily: t.fontFamily.extrabold, fontSize: 24, color: t.colors.text, textAlign: 'right' },
    subtitle: { fontFamily: t.fontFamily.regular, fontSize: 14, color: t.colors.textSecondary, textAlign: 'right' },
    forgot: { alignSelf: 'flex-start', marginBottom: 12, marginTop: 2 },
    forgotText: { fontSize: 13, fontWeight: '700' },
    divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 16 },
    line: { flex: 1, height: 1 },
    or: { fontSize: 12 },
  });
