import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { RewardSummary } from '@rafeeq/shared';
import { Screen } from '../../src/components/Screen';
import { useI18n } from '../../src/i18n';
import { api } from '../../src/lib/api';
import { useTheme, type AppTheme } from '../../src/theme';

export default function Rewards() {
  const { t } = useI18n();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const [summary, setSummary] = useState<RewardSummary | null>(null);

  useEffect(() => {
    api.rewards.summary().then(setSummary).catch(() => undefined);
  }, []);

  const toNext = summary?.next_tier_at != null ? Math.max(0, summary.next_tier_at - summary.lifetime_points) : null;

  return (
    <Screen scroll>
      <Text style={s.h1}>{t('rewards.title')}</Text>

      <View style={s.card}>
        <Text style={s.pts}>{summary?.points ?? 0}</Text>
        <Text style={s.ptsLabel}>{t('rewards.points')}</Text>
        <View style={s.tierPill}>
          <Text style={s.tierText}>{summary?.tier_label ?? '—'}</Text>
        </View>
      </View>

      <View style={s.row}>
        <Text style={s.metaLabel}>{t('rewards.lifetime')}</Text>
        <Text style={s.metaValue}>{summary?.lifetime_points ?? 0}</Text>
      </View>
      {summary?.next_tier_label && toNext != null && (
        <View style={s.row}>
          <Text style={s.metaLabel}>{t('rewards.nextTier')}: {summary.next_tier_label}</Text>
          <Text style={s.metaValue}>{toNext} {t('rewards.pointsToNext')}</Text>
        </View>
      )}
    </Screen>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    h1: { fontFamily: t.fontFamily.extrabold, fontSize: 24, color: t.colors.text, textAlign: 'right', marginBottom: t.spacing.base },
    card: { backgroundColor: t.colors.primary, borderRadius: t.radius.lg, padding: t.spacing.xl, alignItems: 'center', marginBottom: t.spacing.lg },
    pts: { fontFamily: t.fontFamily.extrabold, fontSize: 48, color: t.colors.onPrimary },
    ptsLabel: { fontFamily: t.fontFamily.medium, fontSize: 14, color: t.colors.onPrimary, opacity: 0.9 },
    tierPill: { marginTop: t.spacing.base, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: t.spacing.lg, paddingVertical: 6, borderRadius: 999 },
    tierText: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.onPrimary },
    row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: t.spacing.sm, borderBottomWidth: 1, borderBottomColor: t.colors.border },
    metaLabel: { fontFamily: t.fontFamily.medium, fontSize: 14, color: t.colors.textSecondary },
    metaValue: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.text },
  });
