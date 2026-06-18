import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { Icon } from '../../src/components/Icon';
import { useI18n } from '../../src/i18n';
import { useTheme, type AppTheme } from '../../src/theme';

export default function Welcome() {
  const { t } = useI18n();
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  return (
    <Screen center>
      <View style={s.brandWrap}>
        <View style={s.logo}>
          <Icon name="shield" size={48} color={theme.colors.onPrimary} />
        </View>
        <Text style={s.title}>{t('guardian.portalTitle')}</Text>
        <Text style={s.subtitle}>{t('guardian.portalSubtitle')}</Text>
      </View>

      <View style={s.actions}>
        <Button title={t('guardian.login')} onPress={() => router.push('/(auth)/login')} />
      </View>
    </Screen>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    brandWrap: { alignItems: 'center', flex: 1, justifyContent: 'center' },
    logo: { width: 104, height: 104, borderRadius: 52, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: t.spacing.xl, borderWidth: 4, borderColor: t.colors.accent },
    title: { fontFamily: t.fontFamily.extrabold, fontSize: 26, color: t.colors.text, marginBottom: t.spacing.sm, textAlign: 'center' },
    subtitle: { fontFamily: t.fontFamily.regular, fontSize: 16, color: t.colors.textSecondary, textAlign: 'center', maxWidth: 300 },
    actions: { gap: t.spacing.base, paddingBottom: t.spacing.xl },
  });
