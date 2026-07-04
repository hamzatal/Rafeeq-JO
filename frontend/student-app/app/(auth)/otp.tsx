import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { validators } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { Banner } from '../../src/components/Banner';
import { AuthScaffold } from '../../src/components/AuthScaffold';
import { Icon } from '../../src/components/Icon';
import { useI18n } from '../../src/i18n';
import { useAuth } from '../../src/store/auth';
import { useTheme, type AppTheme } from '../../src/theme';

export default function Otp() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useLocalSearchParams<{ phone: string; purpose: string; debug?: string }>();
  const verifyOtp = useAuth((st) => st.verifyOtp);
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Dev (no SMS provider): the backend returns the real one-time code, which we
  // auto-fill so the tester can just press Verify.
  useEffect(() => {
    if (params.debug && !code) setCode(String(params.debug));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.debug]);

  const onVerify = async () => {
    setFormError(null);
    const err = validators.otp(code.trim());
    if (err) return setFormError(err);
    setLoading(true);
    try {
      const purpose = (params.purpose as 'register' | 'login') ?? 'register';
      await verifyOtp({ phone: params.phone, code: code.trim(), purpose });
      router.replace(purpose === 'register' ? '/(onboarding)/profile-setup' : '/(app)/home');
    } catch (e) {
      setFormError(e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScaffold title={t('auth.otpTitle')} subtitle={t('auth.otpSubtitle')} showBack>
      {/* Phone the code was sent to */}
      <View style={s.phoneChip}>
        <Icon name="smartphone" size={16} color={theme.colors.accent} />
        <Text style={s.phone}>{params.phone}</Text>
      </View>

      {params.debug ? (
        <View style={s.debugChip}>
          <Icon name="info" size={14} color={theme.colors.warning} />
          <Text style={s.debug}>{t('auth.testCode')}: {params.debug}</Text>
        </View>
      ) : null}

      {formError ? <Banner message={formError} variant="error" /> : null}

      <Input value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} placeholder="------" style={s.codeInput} />
      <Button title={t('auth.verify')} icon="check" onPress={onVerify} loading={loading} style={s.cta} />
    </AuthScaffold>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    phoneChip: { flexDirection: 'row-reverse', alignItems: 'center', alignSelf: 'flex-end', gap: 8, backgroundColor: t.colors.accentSoft, borderRadius: t.radius.full, paddingHorizontal: 14, paddingVertical: 8, marginBottom: t.spacing.md },
    phone: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.accent },
    debugChip: { flexDirection: 'row-reverse', alignItems: 'center', alignSelf: 'flex-end', gap: 6, backgroundColor: t.colors.warningSoft, borderRadius: t.radius.md, paddingHorizontal: 12, paddingVertical: 7, marginBottom: t.spacing.base },
    debug: { fontFamily: t.fontFamily.medium, fontSize: 13, color: t.colors.warning },
    codeInput: { textAlign: 'center', letterSpacing: 14, fontSize: 26, fontFamily: t.fontFamily.extrabold },
    cta: { marginTop: t.spacing.sm },
  });
