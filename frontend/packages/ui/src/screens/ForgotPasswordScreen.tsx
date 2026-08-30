/* ═══════════════════════════════════════════════════════════════════════════
   PASSWORD RESET — one copy.

   85 and 86 lines with the same single real divergence as sign-in: one app used
   `isValidJordanPhone` plus a hard-coded message, the other `validators.phone` and
   the validator's own. Nothing else differed at all.

   ── The code length was wrong in both ──────────────────────────────────────

   Both copies had `maxLength={6}` on the reset code with `placeholder="----"` — four
   dashes — and a guard of `length < 4`. Three different opinions about one field, in
   one line, twice. The OTP length is `OTP_LENGTH` in `@rafeeq/shared` and the two
   `otp.tsx` screens already use it; this now does too, so the placeholder, the limit
   and the guard cannot disagree.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { OTP_LENGTH, normalizeJordanPhone, validators } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import type { RafeeqApi } from '@rafeeq/api-client';
import { AuthShell } from '../components/AuthShell';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Text } from '../components/Text';
import { useI18n } from '../runtime/i18n';
import { useTheme, type AppTheme } from '../theme';

export interface ForgotPasswordScreenProps {
  api: RafeeqApi;
  /** The password has been reset — send them to sign in. */
  onReset: () => void;
  /** «لدي حساب» — the way back out without resetting anything. */
  onHaveAccount: () => void;
}

export function ForgotPasswordScreen({ api, onReset, onHaveAccount }: ForgotPasswordScreenProps) {
  const { t } = useI18n();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const fail = (e: unknown) =>
    setMsg({ text: e instanceof RafeeqApiError ? (e.firstError() ?? e.message) : t('common.error'), ok: false });

  const sendCode = async () => {
    setMsg(null);
    const phoneError = validators.phone(phone);
    if (phoneError) return setMsg({ text: phoneError, ok: false });
    setLoading(true);
    try {
      const res = await api.auth.forgotPassword(normalizeJordanPhone(phone)!);
      setStep('reset');
      if (res.otp_debug) setMsg({ text: `${t('auth.code')}: ${res.otp_debug}`, ok: true });
    } catch (e) {
      fail(e);
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    setMsg(null);
    if (code.trim().length !== OTP_LENGTH) return setMsg({ text: t('validation.required'), ok: false });
    if (password.length < 8) return setMsg({ text: t('auth.passwordMin'), ok: false });
    if (password !== confirm) return setMsg({ text: t('auth.passwordMismatch'), ok: false });
    setLoading(true);
    try {
      await api.auth.resetPassword({
        phone: normalizeJordanPhone(phone)!,
        code: code.trim(),
        password,
        password_confirmation: confirm,
      });
      onReset();
    } catch (e) {
      fail(e);
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
          <Input
            label={t('auth.code')}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={OTP_LENGTH}
            placeholder={'-'.repeat(OTP_LENGTH)}
          />
          <Input label={t('auth.newPassword')} value={password} onChangeText={setPassword} secureTextEntry />
          <Input label={t('auth.confirmPassword')} value={confirm} onChangeText={setConfirm} secureTextEntry />
          <Button title={t('auth.resetTitle')} onPress={reset} loading={loading} />
        </>
      )}

      <Pressable onPress={onHaveAccount} hitSlop={8} accessibilityRole="button" style={s.bottomLink}>
        <Text role="body" tone="secondary" align="center" style={s.semibold}>{t('auth.haveAccount')}</Text>
      </Pressable>
    </AuthShell>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    bottomLink: { alignItems: 'center', marginTop: t.spacing.xl },
    semibold: { fontFamily: t.fontFamily.semibold },
  });
