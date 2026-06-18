import { useState } from 'react';
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
    if (!isValidJordanPhone(phone)) return setFormError(t('validation.invalidPhone'));
    if (password.length < 1) return setFormError(t('validation.required'));
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

  return (
    <Screen scroll>
      <AuthHeader title={t('auth.login')} subtitle={t('auth.welcomeSubtitle')} />
      <Banner message={formError} />
      <Input label={t('auth.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="07XXXXXXXX" />
      <Input label={t('auth.password')} value={password} onChangeText={setPassword} secureTextEntry />
      <Button title={t('auth.login')} onPress={onSubmit} loading={loading} />
    </Screen>
  );
}
