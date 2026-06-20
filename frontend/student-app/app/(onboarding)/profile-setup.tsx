import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import type { University } from '@rafeeq/shared';
import { useI18n } from '../../src/i18n';
import { api } from '../../src/lib/api';
import { useTheme, type AppTheme } from '../../src/theme';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { Chip, Skeleton } from '../../src/components/kit';

export default function ProfileSetup() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [universities, setUniversities] = useState<University[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [studentNumber, setStudentNumber] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.catalog.listUniversities().then(setUniversities).catch(() => setUniversities([]));
  }, []);

  const uniName = (u: University) => (locale === 'ar' ? u.name_ar : u.name_en) || u.name_ar;

  const goHome = () => router.replace('/(app)/home');

  const finish = async () => {
    setSaving(true);
    try {
      if (selected) {
        await api.student.updateProfile({
          university_id: selected,
          student_number: studentNumber.trim() || undefined,
        });
      }
    } catch {
      /* non-blocking — the student can set this later from settings */
    } finally {
      setSaving(false);
      goHome();
    }
  };

  return (
    <View style={s.root}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <Text style={s.title}>{t('onboarding.setupTitle')}</Text>
          <Text style={s.body}>{t('onboarding.setupBody')}</Text>

          <Text style={s.label}>{t('onboarding.chooseUniversity')}</Text>
          {universities === null ? (
            <View style={s.chips}>
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} width={120} height={40} radius={999} />)}
            </View>
          ) : universities.length === 0 ? (
            <Text style={s.empty}>{t('onboarding.noUniversities')}</Text>
          ) : (
            <View style={s.chips}>
              {universities.map((u) => (
                <Chip key={u.id} label={uniName(u)} selected={selected === u.id} onPress={() => setSelected(u.id)} />
              ))}
            </View>
          )}

          <View style={{ height: theme.spacing.lg }} />
          <Input
            label={t('onboarding.studentNumberOptional')}
            value={studentNumber}
            onChangeText={setStudentNumber}
            keyboardType="number-pad"
          />
        </ScrollView>

        <View style={s.footer}>
          <Button title={t('onboarding.finish')} onPress={finish} loading={saving} disabled={!selected} />
          <Button title={t('onboarding.skip')} variant="ghost" onPress={goHome} style={{ marginTop: theme.spacing.sm }} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: t.colors.background },
    safe: { flex: 1, paddingHorizontal: t.spacing.lg },
    content: { paddingTop: t.spacing.xl, paddingBottom: t.spacing.lg },
    title: { fontFamily: t.fontFamily.extrabold, fontSize: 26, color: t.colors.text, textAlign: 'right' },
    body: { fontFamily: t.fontFamily.regular, fontSize: 15, lineHeight: 24, color: t.colors.textSecondary, textAlign: 'right', marginTop: 8, marginBottom: t.spacing.xl },
    label: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.text, textAlign: 'right', marginBottom: t.spacing.md },
    chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: t.spacing.sm },
    empty: { fontFamily: t.fontFamily.regular, fontSize: 14, color: t.colors.muted, textAlign: 'right' },
    footer: { paddingVertical: t.spacing.base },
  });
