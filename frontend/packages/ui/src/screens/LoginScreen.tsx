/* ═══════════════════════════════════════════════════════════════════════════
   SIGN IN — one copy.

   ── What the two copies had already drifted into ───────────────────────────

   107 and 109 lines, fourteen of them different, and the important difference was
   not a feature — it was that **the two apps validated a phone number differently**:

       student:  if (!isValidJordanPhone(phone)) setFormError(t('validation.invalidPhone'))
       captain:  const err = validators.phone(phone); if (err) setFormError(err)

   Two functions, two messages, one rule. `validators.phone` returns the localised
   reason and `isValidJordanPhone` returns a boolean the call site then has to
   describe, so the student app was hard-coding a message the shared validator
   already owned. Nothing was broken today; the point is that nobody could have
   noticed if it had been, because no test and no gate compared the two files.

   This copy uses `validators.phone`: the rule and its explanation stay together.

   ── Why the differences are callbacks ──────────────────────────────────────

   The rest of the drift was `router.replace('/(app)/home')` vs `'/(app)/dashboard')`
   and a subtitle key. Both are genuinely per-app, and both are now arguments — so
   they are visible at the call site instead of being the reason the file was copied.
   `packages/ui` also must not reach into an app's auth store (the `layer-violation`
   gate forbids it), which is exactly the constraint that produced the duplication in
   the first place; passing `login` in inverts it.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { normalizeJordanPhone, validators } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import type { RafeeqApi } from '@rafeeq/api-client';
import { AuthShell } from '../components/AuthShell';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { Input } from '../components/Input';
import { Text } from '../components/Text';
import { useI18n } from '../runtime/i18n';
import { useTheme, type AppTheme } from '../theme';

export interface LoginScreenProps {
  api: RafeeqApi;
  /** «سجّل دخولك ككابتن» vs the student wording. */
  subtitleKey: string;
  /** The app's own auth store action. Throws on failure. */
  login: (credentials: { phone: string; password: string }) => Promise<unknown>;
  /** Where a signed-in user of THIS app belongs. */
  onAuthenticated: () => void;
  /** An OTP was sent; carry the normalised phone and the debug code onward. */
  onOtpRequested: (phone: string, otpDebug: string) => void;
  onForgotPassword: () => void;
  onRegister: () => void;
}

export function LoginScreen({
  api,
  subtitleKey,
  login,
  onAuthenticated,
  onOtpRequested,
  onForgotPassword,
  onRegister,
}: LoginScreenProps) {
  const { t } = useI18n();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const describe = (e: unknown) =>
    e instanceof RafeeqApiError ? (e.firstError() ?? e.message) : t('common.error');

  const onSubmit = async () => {
    setFormError(null);
    const phoneError = validators.phone(phone);
    if (phoneError) return setFormError(phoneError);
    if (!password) return setFormError(t('validation.required'));
    setLoading(true);
    try {
      await login({ phone: normalizeJordanPhone(phone)!, password });
      onAuthenticated();
    } catch (e) {
      setFormError(describe(e));
    } finally {
      setLoading(false);
    }
  };

  const onOtp = async () => {
    setFormError(null);
    const phoneError = validators.phone(phone);
    if (phoneError) return setFormError(phoneError);
    const normalized = normalizeJordanPhone(phone)!;
    setOtpLoading(true);
    try {
      const res = await api.auth.requestOtp(normalized);
      onOtpRequested(normalized, res.otp_debug ?? '');
    } catch (e) {
      setFormError(describe(e));
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <AuthShell title={t('auth.login')} subtitle={t(subtitleKey)}>
      {formError ? <Banner message={formError} variant="error" /> : null}
      <Input label={t('auth.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="07XXXXXXXX" />
      <Input label={t('auth.password')} value={password} onChangeText={setPassword} secureTextEntry />

      <Pressable onPress={onForgotPassword} hitSlop={8} accessibilityRole="button" style={s.forgot}>
        <Text role="label" style={s.forgotText}>{t('auth.forgotPassword')}</Text>
      </Pressable>

      <Button title={t('auth.login')} onPress={onSubmit} loading={loading} />

      <View style={s.divider}>
        <View style={s.line} />
        <Text role="label" tone="muted">{t('common.or')}</Text>
        <View style={s.line} />
      </View>

      <Pressable
        onPress={onOtp}
        disabled={otpLoading}
        accessibilityRole="button"
        accessibilityState={{ disabled: otpLoading, busy: otpLoading }}
        style={({ pressed }) => [s.secondary, pressed && s.pressed]}
      >
        <Icon name="message-square" size={18} color={theme.colors.primary} />
        <Text role="titleSm" tone="primary" align="center" style={s.strong}>
          {otpLoading ? t('common.loading') : t('auth.loginWithOtp')}
        </Text>
      </Pressable>

      <Pressable onPress={onRegister} hitSlop={8} accessibilityRole="button" style={s.bottomLink}>
        <Text role="body" tone="secondary" align="center" style={s.semibold}>{t('auth.noAccount')}</Text>
      </Pressable>
    </AuthShell>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    forgot: { alignSelf: 'flex-start', marginBottom: t.spacing.base, marginTop: 2 },
    forgotText: { fontFamily: t.fontFamily.bold, color: t.colors.accent },
    divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: t.spacing.lg },
    line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: t.colors.border },
    secondary: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 54,
      borderRadius: t.radius.card,
      borderWidth: 2,
      borderColor: t.colors.primary,
      backgroundColor: 'transparent',
    },
    strong: { fontFamily: t.fontFamily.bold },
    semibold: { fontFamily: t.fontFamily.semibold },
    pressed: { opacity: 0.7 },
    bottomLink: { alignItems: 'center', marginTop: t.spacing.xl },
  });
