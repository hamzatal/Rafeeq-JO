import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { normalizeJordanPhone, validators, validateForm } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { Banner } from '../../src/components/Banner';
import { AuthScaffold } from '../../src/components/AuthScaffold';
import { useI18n } from '../../src/i18n';
import { useAuth } from '../../src/store/auth';
import { useTheme, type AppTheme } from '../../src/theme';

export default function Register() {
  const { t } = useI18n();
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const register = useAuth((st) => st.register);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ fullName?: string; phone?: string }>({});

  const onSubmit = async () => {
    setFormError(null);
    const { valid, errors: e } = validateForm({
      fullName: () => validators.fullName(fullName),
      phone: () => validators.phone(phone),
    });
    setErrors(e);
    if (!valid) return;

    const normalized = normalizeJordanPhone(phone)!;
    setLoading(true);
    try {
      const otpDebug = await register({ full_name: fullName.trim(), phone: normalized, type: 'student' });
      router.push({ pathname: '/(auth)/otp', params: { phone: normalized, purpose: 'register', debug: otpDebug ?? '' } });
    } catch (err) {
      setFormError(err instanceof RafeeqApiError ? err.firstError() ?? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScaffold title={t('auth.register')} subtitle={t('auth.studentSignupSub')} showBack>
      {formError ? <Banner message={formError} variant="error" /> : null}
      <Input icon="user" label={t('auth.fullName')} value={fullName} onChangeText={setFullName} error={errors.fullName} autoCapitalize="words" />
      <Input icon="phone" label={t('auth.phone')} value={phone} onChangeText={setPhone} error={errors.phone} keyboardType="phone-pad" placeholder="07XXXXXXXX" />
      <Button title={t('auth.sendCode')} icon="arrow-left" onPress={onSubmit} loading={loading} style={s.cta} />

      <Pressable onPress={() => router.replace('/(auth)/login')} hitSlop={8} style={s.bottomLink}>
        <Text style={s.bottomLinkText}>{t('auth.haveAccount')}</Text>
      </Pressable>
    </AuthScaffold>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    cta: { marginTop: t.spacing.sm },
    bottomLink: { alignItems: 'center', marginTop: t.spacing.xl },
    bottomLinkText: { fontFamily: t.fontFamily.semibold, fontSize: 14, color: t.colors.textSecondary },
  });
