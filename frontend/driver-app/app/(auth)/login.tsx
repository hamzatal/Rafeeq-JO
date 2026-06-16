import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { normalizeJordanPhone, validators } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Screen } from '../../src/components/Screen';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { Banner } from '../../src/components/Banner';
import { useI18n } from '../../src/i18n';
import { useAuth } from '../../src/store/auth';
import { theme } from '../../src/theme';

export default function Login() {
  const { t } = useI18n();
  const router = useRouter();
  const login = useAuth((s) => s.login);

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
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

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.title}>{t('auth.login')}</Text>
      </View>
      <Banner message={formError} />
      <Input label={t('auth.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="07XXXXXXXX" />
      <Input label={t('auth.password')} value={password} onChangeText={setPassword} secureTextEntry />
      <Button title={t('auth.login')} onPress={onSubmit} loading={loading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: theme.spacing['2xl'], marginBottom: theme.spacing.xl },
  title: { fontFamily: theme.fontFamily.extrabold, fontSize: 24, color: theme.colors.text, textAlign: 'right' },
});
