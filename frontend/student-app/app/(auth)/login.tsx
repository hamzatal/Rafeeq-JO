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
import { api } from '../../src/lib/api';

/**
 * Login is OTP-based — consistent with registration (phone only, no password).
 * Accounts are created with name + phone and verified by a one-time code, so
 * there is never a password to remember. Entering a phone here requests a
 * login code, then we continue on the OTP screen.
 */
export default function Login() {
  const { t } = useI18n();
  const router = useRouter();

  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const onSubmit = async () => {
    setFormError(null);
    if (!isValidJordanPhone(phone)) return setFormError(t('validation.invalidPhone'));
    const normalized = normalizeJordanPhone(phone)!;
    setLoading(true);
    try {
      const res = await api.auth.requestOtp(normalized);
      router.push({
        pathname: '/(auth)/otp',
        params: { phone: normalized, purpose: 'login', debug: res.otp_debug ?? '' },
      });
    } catch (e) {
      setFormError(e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <AuthHeader title={t('auth.login')} subtitle={t('auth.loginHint')} />
      <Banner message={formError} />
      <Input
        label={t('auth.phone')}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="07XXXXXXXX"
      />
      <Button title={t('auth.sendCode')} onPress={onSubmit} loading={loading} />
    </Screen>
  );
}
