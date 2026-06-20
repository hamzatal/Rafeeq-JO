import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { isValidJordanPhone, normalizeJordanPhone } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Screen } from '../../src/components/Screen';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { Banner } from '../../src/components/Banner';
import { AuthHeader } from '../../src/components/AuthHeader';
import { useI18n } from '../../src/i18n';
import { useAuth } from '../../src/store/auth';
import { api } from '../../src/lib/api';
import { useTheme } from '../../src/theme';

/**
 * Password-first login (works even if OTP/SMS is down) with an OTP fallback
 * and password reset. Accounts always have a password (set at registration).
 */
export default function Login() {
  const { t } = useI18n();
  const router = useRouter();
  const theme = useTheme();
  const login = useAuth((s) => s.login);

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const onSubmit = async () => {
    setFormError(null);
    if (!isValidJordanPhone(phone)) return setFormError(t('validation.invalidPhone'));
    if (!password) return setFormError(t('validation.required'));
    setLoading(true);
    try {
      await login({ phone: normalizeJordanPhone(phone)!, password });
      router.replace('/(app)/home');
    } catch (e) {
      setFormError(e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  // Fallback: sign in with a one-time code instead of a password.
  const onOtp = async () => {
    setFormError(null);
    if (!isValidJordanPhone(phone)) return setFormError(t('validation.invalidPhone'));
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
      <AuthHeader title={t('auth.login')} subtitle={t('auth.loginHint')} />
      <Banner message={formError} />
      <Input label={t('auth.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="07XXXXXXXX" />
      <Input label={t('auth.password')} value={password} onChangeText={setPassword} secureTextEntry />

      <Pressable onPress={() => router.push('/(auth)/forgot-password')} hitSlop={8} style={styles.forgot}>
        <Text style={[styles.forgotText, { color: theme.colors.primary }]}>{t('auth.forgotPassword')}</Text>
      </Pressable>

      <Button title={t('auth.login')} onPress={onSubmit} loading={loading} />

      <View style={styles.divider}>
        <View style={[styles.line, { backgroundColor: theme.colors.border }]} />
        <Text style={[styles.or, { color: theme.colors.muted }]}>—</Text>
        <View style={[styles.line, { backgroundColor: theme.colors.border }]} />
      </View>

      <Button title={t('auth.loginWithOtp')} onPress={onOtp} loading={otpLoading} variant="outline" icon="message-square" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  forgot: { alignSelf: 'flex-start', marginBottom: 12, marginTop: 2 },
  forgotText: { fontSize: 13, fontWeight: '700' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 16 },
  line: { flex: 1, height: 1 },
  or: { fontSize: 12 },
});
