import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { isValidJordanPhone, normalizeJordanPhone } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { Banner } from '../../src/components/Banner';
import { AuthShell } from '../../src/components/AuthShell';
import { useI18n } from '../../src/i18n';
import { api } from '../../src/lib/api';
import { useTheme, type AppTheme } from '../../src/theme';

export default function ForgotPassword() {
  const { t } = useI18n();
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const sendCode = async () => {
    setMsg(null);
    if (!isValidJordanPhone(phone)) return setMsg({ text: t('validation.invalidPhone'), ok: false });
    setLoading(true);
    try {
      const res = await api.auth.forgotPassword(normalizeJordanPhone(phone)!);
      setStep('reset');
      if (res.otp_debug) setMsg({ text: `${t('auth.code')}: ${res.otp_debug}`, ok: true });
    } catch (e) {
      setMsg({ text: e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('common.error'), ok: false });
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    setMsg(null);
    if (code.trim().length < 4) return setMsg({ text: t('validation.required'), ok: false });
    if (password.length < 8) return setMsg({ text: t('auth.passwordMin'), ok: false });
    if (password !== confirm) return setMsg({ text: t('auth.passwordMismatch'), ok: false });
    setLoading(true);
    try {
      await api.auth.resetPassword({ phone: normalizeJordanPhone(phone)!, code: code.trim(), password, password_confirmation: confirm });
      router.replace('/(auth)/login');
    } catch (e) {
      setMsg({ text: e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('common.error'), ok: false });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title={t('auth.resetTitle')} subtitle={t('auth.resetHint')}>
      {msg ? <Banner message={msg.text} variant={msg.ok ? 'success' : 'error'} /> : null}

      {step === 'request' ? (
        <>
          <Input label={t('auth.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="07XXXXXXXX" />
          <Button title={t('auth.sendResetCode')} onPress={sendCode} loading={loading} />
        </>
      ) : (
        <>
          <Input label={t('auth.code')} value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} placeholder="----" />
          <Input label={t('auth.newPassword')} value={password} onChangeText={setPassword} secureTextEntry />
          <Input label={t('auth.confirmPassword')} value={confirm} onChangeText={setConfirm} secureTextEntry />
          <Button title={t('auth.resetTitle')} onPress={reset} loading={loading} />
        </>
      )}

      <Pressable onPress={() => router.replace('/(auth)/login')} hitSlop={8} style={s.bottomLink}>
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
