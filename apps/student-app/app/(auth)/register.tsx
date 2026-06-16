import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { isValidJordanPhone, normalizeJordanPhone } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Screen } from '../../src/components/Screen';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { Banner } from '../../src/components/Banner';
import { useI18n } from '../../src/i18n';
import { useAuth } from '../../src/store/auth';
import { theme } from '../../src/theme';

export default function Register() {
  const { t } = useI18n();
  const router = useRouter();
  const register = useAuth((s) => s.register);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ fullName?: string; phone?: string }>({});

  const onSubmit = async () => {
    setFormError(null);
    const next: typeof errors = {};
    if (fullName.trim().length < 3) next.fullName = t('validation.required');
    if (!isValidJordanPhone(phone)) next.phone = t('validation.invalidPhone');
    setErrors(next);
    if (Object.keys(next).length) return;

    const normalized = normalizeJordanPhone(phone)!;
    setLoading(true);
    try {
      const otpDebug = await register({ full_name: fullName.trim(), phone: normalized, type: 'student' });
      router.push({ pathname: '/(auth)/otp', params: { phone: normalized, purpose: 'register', debug: otpDebug ?? '' } });
    } catch (e) {
      setFormError(e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.title}>{t('auth.register')}</Text>
      </View>
      <Banner message={formError} />
      <Input
        label={t('auth.fullName')}
        value={fullName}
        onChangeText={setFullName}
        error={errors.fullName}
        autoCapitalize="words"
      />
      <Input
        label={t('auth.phone')}
        value={phone}
        onChangeText={setPhone}
        error={errors.phone}
        keyboardType="phone-pad"
        placeholder="07XXXXXXXX"
      />
      <Button title={t('auth.sendCode')} onPress={onSubmit} loading={loading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: theme.spacing['2xl'], marginBottom: theme.spacing.xl },
  title: { fontFamily: theme.fontFamily.extrabold, fontSize: 24, color: theme.colors.text, textAlign: 'right' },
});
