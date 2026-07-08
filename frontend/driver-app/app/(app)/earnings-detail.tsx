import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import type { EarningsSummary } from '@rafeeq/shared';
import { Icon } from '../../src/components/Icon';
import { EmptyState } from '../../src/components/ui';
import { useI18n } from '../../src/i18n';
import { useTheme, type AppTheme } from '../../src/theme';
import { api } from '../../src/lib/api';

const jod = (fils: number) => (fils / 1000).toFixed(2);

type Tab = 'daily' | 'weekly';

export default function EarningsDetail() {
  const { t, locale } = useI18n();
  const theme = useTheme();
  const router = useRouter();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [data, setData] = useState<EarningsSummary | null>(null);
  const [tab, setTab] = useState<Tab>('daily');

  const load = useCallback(async () => {
    try {
      setData(await api.payouts.earningsSummary());
    } catch {
      /* silent */
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const buckets = useMemo(() => {
    if (!data) return [] as { label: string; earnings_fils: number; trips: number }[];
    if (tab === 'daily') {
      return data.daily.map((d) => ({
        label: new Date(d.date + 'T00:00:00').toLocaleDateString(locale, { weekday: 'short' }),
        earnings_fils: d.earnings_fils,
        trips: d.trips,
      }));
    }
    return data.weekly.map((w) => ({
      label: new Date(w.week_start + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
      earnings_fils: w.earnings_fils,
      trips: w.trips,
    }));
  }, [data, tab, locale]);

  const maxFils = Math.max(1, ...buckets.map((b) => b.earnings_fils));
  const hasAny = (data?.totals.all_time_fils ?? 0) > 0;

  const totals: { key: keyof EarningsSummary['totals']; tripsKey: keyof EarningsSummary['totals']; labelKey: string; navy?: boolean }[] = [
    { key: 'today_fils', tripsKey: 'today_trips', labelKey: 'driver.totalToday', navy: true },
    { key: 'week_fils', tripsKey: 'week_trips', labelKey: 'driver.totalWeek' },
    { key: 'month_fils', tripsKey: 'month_trips', labelKey: 'driver.totalMonth' },
    { key: 'all_time_fils', tripsKey: 'all_time_trips', labelKey: 'driver.totalAllTime' },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Pressable hitSlop={8} onPress={() => router.back()} style={s.headerBtn}>
          <Icon name={locale === 'ar' ? 'chevron-right' : 'chevron-left'} size={24} color={theme.colors.primary} />
        </Pressable>
        <Text style={s.brand}>{t('driver.earningsDetails')}</Text>
        <View style={s.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Totals grid */}
        <View style={s.grid}>
          {totals.map((tot) => (
            <View key={tot.key} style={[s.totalCard, tot.navy && s.totalCardNavy]}>
              <Text style={[s.totalLabel, tot.navy && s.totalLabelOn]}>{t(tot.labelKey)}</Text>
              <Text style={[s.totalValue, tot.navy && s.totalValueOn]}>
                {data ? jod(data.totals[tot.key]) : '0.00'} <Text style={s.cur}>د.أ</Text>
              </Text>
              <Text style={[s.totalTrips, tot.navy && s.totalLabelOn]}>
                {data ? data.totals[tot.tripsKey] : 0} {t('driver.tripsShort')}
              </Text>
            </View>
          ))}
        </View>

        {!hasAny ? (
          <EmptyState icon="navigation" title={t('driver.noEarningsYet')} />
        ) : (
          <>
            {/* Tabs */}
            <View style={s.tabs}>
              {(['daily', 'weekly'] as Tab[]).map((tb) => (
                <Pressable key={tb} onPress={() => setTab(tb)} style={[s.tab, tab === tb && s.tabActive]}>
                  <Text style={[s.tabText, tab === tb && s.tabTextActive]}>
                    {t(tb === 'daily' ? 'driver.tabDaily' : 'driver.tabWeekly')}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Bar chart */}
            <View style={s.chartCard}>
              <View style={s.chart}>
                {buckets.map((b, i) => {
                  const h = Math.round((b.earnings_fils / maxFils) * 120);
                  return (
                    <View key={i} style={s.barCol}>
                      <Text style={s.barValue}>{b.earnings_fils > 0 ? jod(b.earnings_fils) : ''}</Text>
                      <View style={[s.bar, { height: Math.max(4, h) }, b.earnings_fils === 0 && s.barEmpty]} />
                      <Text style={s.barLabel} numberOfLines={1}>{b.label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Detailed rows */}
            {buckets
              .slice()
              .reverse()
              .map((b, i) => (
                <View key={i} style={s.row}>
                  <View style={s.rowIcon}>
                    <Icon name="navigation" size={16} color={theme.colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowLabel}>{tab === 'weekly' ? `${t('driver.weekOf')} ${b.label}` : b.label}</Text>
                    <Text style={s.rowMeta}>{b.trips} {t('driver.tripsShort')}</Text>
                  </View>
                  <Text style={s.rowValue}>{jod(b.earnings_fils)} د.أ</Text>
                </View>
              ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colors.background },
    header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: t.spacing.lg, paddingVertical: t.spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.colors.hairline },
    headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    brand: { fontFamily: t.fontFamily.extrabold, fontSize: 20, color: t.colors.primary },
    content: { padding: t.spacing.lg, paddingBottom: t.spacing['3xl'] },

    grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: t.spacing.md },
    totalCard: { flexGrow: 1, flexBasis: '46%', backgroundColor: t.colors.surface, borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.colors.hairline, padding: t.spacing.base, ...t.shadow.sm },
    totalCardNavy: { backgroundColor: t.colors.primary, borderColor: t.colors.primary },
    totalLabel: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary, textAlign: 'right' },
    totalLabelOn: { color: 'rgba(255,255,255,0.75)' },
    totalValue: { fontFamily: t.fontFamily.extrabold, fontSize: 22, color: t.colors.text, textAlign: 'right', marginTop: 4 },
    totalValueOn: { color: '#FFFFFF' },
    cur: { fontFamily: t.fontFamily.bold, fontSize: 12, color: t.colors.textSecondary },
    totalTrips: { fontFamily: t.fontFamily.regular, fontSize: 11, color: t.colors.muted, textAlign: 'right', marginTop: 2 },

    tabs: { flexDirection: 'row-reverse', backgroundColor: t.colors.surfaceAlt, borderRadius: t.radius.md, padding: 4, marginTop: t.spacing.lg, gap: 4 },
    tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: t.radius.sm },
    tabActive: { backgroundColor: t.colors.surface, ...t.shadow.sm },
    tabText: { fontFamily: t.fontFamily.medium, fontSize: 13, color: t.colors.textSecondary },
    tabTextActive: { fontFamily: t.fontFamily.bold, color: t.colors.primary },

    chartCard: { backgroundColor: t.colors.surface, borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.colors.hairline, padding: t.spacing.md, marginTop: t.spacing.md },
    chart: { flexDirection: 'row-reverse', alignItems: 'flex-end', justifyContent: 'space-between', height: 170, paddingTop: t.spacing.sm },
    barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
    bar: { width: '58%', backgroundColor: t.colors.accent, borderRadius: 6 },
    barEmpty: { backgroundColor: t.colors.hairline },
    barValue: { fontFamily: t.fontFamily.medium, fontSize: 9, color: t.colors.textSecondary },
    barLabel: { fontFamily: t.fontFamily.regular, fontSize: 10, color: t.colors.muted, marginTop: 2 },

    row: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: t.colors.surface, borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.colors.hairline, padding: t.spacing.md, marginTop: t.spacing.sm },
    rowIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.colors.accent + '1A', alignItems: 'center', justifyContent: 'center', marginLeft: t.spacing.md },
    rowLabel: { fontFamily: t.fontFamily.bold, fontSize: 14, color: t.colors.text, textAlign: 'right' },
    rowMeta: { fontFamily: t.fontFamily.regular, fontSize: 11, color: t.colors.muted, textAlign: 'right', marginTop: 2 },
    rowValue: { fontFamily: t.fontFamily.extrabold, fontSize: 15, color: t.colors.accent },
  });
