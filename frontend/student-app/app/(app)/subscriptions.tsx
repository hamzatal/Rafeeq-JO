import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { Subscription, SubscriptionPlan } from '@rafeeq/shared';
import { EmptyState, SectionTitle } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { useI18n } from '../../src/i18n';
import { api } from '../../src/lib/api';
import { useTheme, type AppTheme } from '../../src/theme';

export default function Subscriptions() {
  const { t } = useI18n();
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, sub] = await Promise.all([api.transport.listPlans(), api.transport.mySubscriptions()]);
      setPlans(p);
      setSubs(sub);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Subscribing now goes through a real checkout (subscribe → pay) instead of
  // silently creating an unpaid subscription.
  const goCheckout = (p: SubscriptionPlan) => {
    router.push({
      pathname: '/(app)/checkout',
      params: {
        planId: p.id,
        name: p.name,
        price: String(p.price_jod),
        includes: p.unlimited ? t('common.unlimited') : `${p.rides_count} ${t('subscriptions.rideWord')}`,
      },
    });
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.h1}>{t('subscriptions.title')}</Text>

        {subs.length > 0 && (
          <>
            <SectionTitle title={t('subscriptions.mine')} />
            {subs.map((sub) => (
              <View key={sub.id} style={s.premium}>
                <View style={s.premiumTop}>
                  <View style={{ flex: 1 }}>
                    <View style={[s.activePill, !sub.usable && s.warnPill]}>
                      <Icon name={sub.usable ? 'check-circle' : 'clock'} size={13} color={theme.colors.primary} />
                      <Text style={s.activePillText}>{sub.status_label}</Text>
                    </View>
                    <Text style={s.premiumTitle} numberOfLines={1}>{sub.plan?.name ?? t('subscriptions.defaultName')}</Text>
                  </View>
                  <View style={s.premiumIcon}>
                    <Icon name="navigation" size={22} color={theme.colors.primary} />
                  </View>
                </View>
                <View style={s.premiumStats}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.pStatLabel}>{t('subscriptions.rideUnit')}</Text>
                    <Text style={s.pStatValue}>{sub.remaining_rides === null ? '∞' : sub.remaining_rides}</Text>
                  </View>
                  <View style={s.pDivider} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.pStatLabel}>{t('subscriptions.endsAt')}</Text>
                    <Text style={s.pStatValueSm}>{sub.ends_at ? new Date(sub.ends_at).toLocaleDateString('ar', { day: 'numeric', month: 'short' }) : '—'}</Text>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}

        <SectionTitle title={t('subscriptions.available')} />
        {loading ? (
          <Text style={s.meta}>{t('common.loading')}</Text>
        ) : plans.length === 0 ? (
          <EmptyState icon="calendar" title={t('subscriptions.none')} />
        ) : (
          plans.map((p) => (
            <View key={p.id} style={s.planCard}>
              <View style={s.planAccent} />
              <View style={s.planBody}>
                <View style={s.planHead}>
                  <Text style={s.planName} numberOfLines={1}>{p.name}</Text>
                  <View style={s.priceChip}>
                    <Text style={s.priceVal}>{p.price_jod}</Text>
                    <Text style={s.priceCur}>{t('subscriptions.currency')}</Text>
                  </View>
                </View>
                <View style={s.planMetaRow}>
                  <View style={s.metaTag}>
                    <Icon name="tag" size={12} color={theme.colors.textSecondary} />
                    <Text style={s.metaTagText}>{p.type_label}</Text>
                  </View>
                  <View style={s.metaTag}>
                    <Icon name="navigation" size={12} color={theme.colors.textSecondary} />
                    <Text style={s.metaTagText}>{p.unlimited ? t('common.unlimited') : `${p.rides_count} ${t('subscriptions.rideWord')}`}</Text>
                  </View>
                  <View style={s.metaTag}>
                    <Icon name="calendar" size={12} color={theme.colors.textSecondary} />
                    <Text style={s.metaTagText}>{p.duration_days} {t('subscriptions.dayUnit')}</Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => goCheckout(p)}
                  style={({ pressed }) => [s.subBtn, pressed && { opacity: 0.85 }]}
                >
                  <Text style={s.subBtnText}>{t('subscriptions.subscribe')}</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colors.background },
    content: { padding: t.spacing.lg, paddingBottom: t.spacing['3xl'] },
    h1: { fontFamily: t.fontFamily.extrabold, fontSize: 26, color: t.colors.text, textAlign: 'right', marginBottom: t.spacing.base },
    meta: { fontFamily: t.fontFamily.regular, fontSize: 13, color: t.colors.textSecondary, textAlign: 'right', marginTop: 4 },

    // Active premium subscription card
    premium: { backgroundColor: t.colors.primary, borderRadius: t.radius.xl, padding: t.spacing.lg, marginBottom: t.spacing.base, ...t.shadow.md },
    premiumTop: { flexDirection: 'row-reverse', alignItems: 'flex-start', marginBottom: t.spacing.md },
    activePill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, alignSelf: 'flex-end', backgroundColor: t.colors.accent, paddingHorizontal: 10, paddingVertical: 3, borderRadius: t.radius.full, marginBottom: 8 },
    warnPill: { backgroundColor: t.colors.warning },
    activePillText: { fontFamily: t.fontFamily.bold, fontSize: 11, color: t.colors.primary },
    premiumTitle: { fontFamily: t.fontFamily.extrabold, fontSize: 18, color: t.colors.onPrimary, textAlign: 'right' },
    premiumIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: t.colors.accent, alignItems: 'center', justifyContent: 'center', marginLeft: t.spacing.md },
    premiumStats: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: t.radius.lg, padding: t.spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
    pStatLabel: { fontFamily: t.fontFamily.regular, fontSize: 11, color: 'rgba(255,255,255,0.65)', textAlign: 'right' },
    pStatValue: { fontFamily: t.fontFamily.extrabold, fontSize: 20, color: t.colors.accent, textAlign: 'right', marginTop: 2 },
    pStatValueSm: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.onPrimary, textAlign: 'right', marginTop: 2 },
    pDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.12)', marginHorizontal: t.spacing.md },

    // Available plan card
    planCard: { flexDirection: 'row-reverse', backgroundColor: t.colors.card, borderRadius: t.radius.xl, borderWidth: 1, borderColor: t.colors.border, overflow: 'hidden', marginBottom: t.spacing.base, ...t.shadow.sm },
    planAccent: { width: 5, backgroundColor: t.colors.accent },
    planBody: { flex: 1, padding: t.spacing.base },
    planHead: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: t.spacing.sm },
    planName: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.text, flex: 1, textAlign: 'right' },
    priceChip: { flexDirection: 'row-reverse', alignItems: 'flex-end', gap: 3, backgroundColor: t.colors.primarySoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: t.radius.lg },
    priceVal: { fontFamily: t.fontFamily.extrabold, fontSize: 18, color: t.colors.primary },
    priceCur: { fontFamily: t.fontFamily.medium, fontSize: 11, color: t.colors.primary, marginBottom: 2 },
    planMetaRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginBottom: t.spacing.md },
    metaTag: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: t.colors.background, paddingHorizontal: 8, paddingVertical: 4, borderRadius: t.radius.full },
    metaTagText: { fontFamily: t.fontFamily.medium, fontSize: 11, color: t.colors.textSecondary },
    subBtn: { backgroundColor: t.colors.primary, height: 46, borderRadius: t.radius.lg, alignItems: 'center', justifyContent: 'center' },
    subBtnText: { fontFamily: t.fontFamily.extrabold, fontSize: 15, color: t.colors.onPrimary },
  });
