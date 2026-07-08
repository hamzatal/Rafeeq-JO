import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { normalizeJordanPhone, validators, validateForm } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { Banner } from '../../src/components/Banner';
import { AuthShell } from '../../src/components/AuthShell';
import { useI18n } from '../../src/i18n';
import { useAuth } from '../../src/store/auth';
import { api } from '../../src/lib/api';
import { useTheme, type AppTheme } from '../../src/theme';

export default function Register() {
  const { t } = useI18n();
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const register = useAuth((a) => a.register);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ fullName?: string; phone?: string; password?: string }>({});

  const onSubmit = async () => {
    setFormError(null);
    const { valid, errors: e } = validateForm({
      fullName: () => validators.fullName(fullName),
      phone: () => validators.phone(phone),
      password: () => (password.length < 8 ? t('auth.passwordMin') : null),
    });
    setErrors(e);
    if (!valid) return;
    if (password !== confirm) {
      setFormError(t('auth.passwordMismatch'));
      return;
    }
    const normalized = normalizeJordanPhone(phone)!;
    setLoading(true);
    try {
      const otpDebug = await register({ full_name: fullName.trim(), phone: normalized, password });
      router.push({ pathname: '/(auth)/otp', params: { phone: normalized, purpose: 'register', debug: otpDebug ?? '' } });
    } catch (err) {
      // Phone already belongs to a Rafeeq account → sign in via login OTP; the
      // captain capability is added automatically after verification.
      if (err instanceof RafeeqApiError && err.status === 422 && err.errors?.phone) {
        try {
          const res = await api.auth.requestOtp(normalized);
          router.push({ pathname: '/(auth)/otp', params: { phone: normalized, purpose: 'login', debug: res.otp_debug ?? '' } });
          return;
        } catch (e2) {
          setFormError(e2 instanceof RafeeqApiError ? e2.firstError() ?? e2.message : t('common.error'));
          return;
        }
      }
      setFormError(err instanceof RafeeqApiError ? err.firstError() ?? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title={t('auth.register')} subtitle={t('auth.captainSignupSub')}>
      {formError ? <Banner message={formError} variant="error" /> : null}
      <Input label={t('auth.fullName')} value={fullName} onChangeText={setFullName} error={errors.fullName} autoCapitalize="words" />
      <Input label={t('auth.phone')} value={phone} onChangeText={setPhone} error={errors.phone} keyboardType="phone-pad" placeholder="07XXXXXXXX" />
      <Input label={t('auth.password')} value={password} onChangeText={setPassword} error={errors.password} secureTextEntry />
      <Input label={t('auth.confirmPassword')} value={confirm} onChangeText={setConfirm} secureTextEntry />
      <Button title={t('auth.sendCode')} onPress={onSubmit} loading={loading} />

      <Pressable onPress={() => router.push('/(auth)/login')} hitSlop={8} style={s.bottomLink}>
        <Text style={s.bottomLinkText}>{t('auth.haveAccount')}</Text>
      </Pressable>
    </AuthShell>
  );
}

const makeStyles = (_t: AppTheme) =>
  StyleSheet.create({
    bottomLink: { alignItems: 'center', marginTop: 24 },
    bottomLinkText: { fontFamily: _t.fontFamily.semibold, fontSize: 14, color: _t.colors.textSecondary },
  });
