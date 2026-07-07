import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { normalizeJordanPhone, validators } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { Banner } from '../../src/components/Banner';
import { AuthShell } from '../../src/components/AuthShell';
import { Icon } from '../../src/components/Icon';
import { useI18n } from '../../src/i18n';
import { useAuth } from '../../src/store/auth';
import { api } from '../../src/lib/api';
import { useTheme, type AppTheme } from '../../src/theme';

export default function Login() {
  const { t } = useI18n();
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const login = useAuth((a) => a.login);
  const devLogin = useAuth((a) => a.devLogin);

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
    <AuthShell title={t('auth.login')} subtitle={t('auth.captainSigninSub')}>
      {formError ? <Banner message={formError} variant="error" /> : null}
      <Input label={t('auth.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="07XXXXXXXX" />
      <Input label={t('auth.password')} value={password} onChangeText={setPassword} secureTextEntry />

      <Pressable onPress={() => router.push('/(auth)/forgot-password')} hitSlop={8} style={s.forgot}>
        <Text style={s.forgotText}>{t('auth.forgotPassword')}</Text>
      </Pressable>

      <Button title={t('auth.login')} onPress={onSubmit} loading={loading} />

      <View style={s.divider}>
        <View style={s.line} />
        <Text style={s.or}>{t('common.or')}</Text>
        <View style={s.line} />
      </View>

      <Pressable onPress={onOtp} disabled={otpLoading} style={({ pressed }) => [s.secondary, pressed && s.pressed]}>
        <Icon name="message-square" size={18} color={theme.colors.primary} />
        <Text style={s.secondaryText}>{otpLoading ? '...' : t('auth.loginWithOtp')}</Text>
      </Pressable>

      <Pressable onPress={() => router.push('/(auth)/register')} hitSlop={8} style={s.bottomLink}>
        <Text style={s.bottomLinkText}>{t('auth.noAccount')}</Text>
      </Pressable>

      {__DEV__ ? (
        <Pressable
          onPress={async () => {
            await devLogin();
            router.replace('/(app)/dashboard');
          }}
          hitSlop={8}
          style={s.devLink}
        >
          <Text style={s.devText}>دخول تجريبي (معاينة بدون خادم)</Text>
        </Pressable>
      ) : null}
    </AuthShell>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    forgot: { alignSelf: 'flex-start', marginBottom: t.spacing.base, marginTop: 2 },
    forgotText: { fontFamily: t.fontFamily.bold, fontSize: 13, color: t.colors.accent },
    divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: t.spacing.lg },
    line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: t.colors.border },
    or: { fontFamily: t.fontFamily.medium, fontSize: 13, color: t.colors.muted },
    secondary: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 54,
      borderRadius: t.radius.lg,
      borderWidth: 2,
      borderColor: t.colors.primary,
      backgroundColor: 'transparent',
    },
    secondaryText: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.primary },
    pressed: { opacity: 0.7 },
    bottomLink: { alignItems: 'center', marginTop: t.spacing.xl },
    bottomLinkText: { fontFamily: t.fontFamily.semibold, fontSize: 14, color: t.colors.textSecondary },
    devLink: { alignItems: 'center', marginTop: t.spacing.md, paddingVertical: 6 },
    devText: { fontFamily: t.fontFamily.medium, fontSize: 13, color: t.colors.accent, textDecorationLine: 'underline' },
  });
