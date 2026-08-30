import { bareJod } from '@rafeeq/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { Subscription, SubscriptionPlan } from '@rafeeq/shared';
import { EmptyState, ErrorState, Icon, ListSkeleton, Num, SectionTitle, useTheme, type AppTheme } from '@rafeeq/ui';
import { useI18n } from '../../src/i18n';
import { api } from '../../src/lib/api';

export default function Subscriptions() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [p, sub] = await Promise.all([api.transport.listPlans(), api.transport.mySubscriptions()]);
      setPlans(p);
      setSubs(sub);
    } catch {
      setLoadError(true);
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
        priceFils: String(p.price_fils),
        includes: `${p.rides_count} ${t('subscriptions.rideWord')}`,
      },
    });
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.h1}>{t('subscriptions.title')}</Text>
        <Text style={s.optional}>{t('subscriptions.planIsOptional')}</Text>

        {/*
          Paying per ride is an OPTION on this screen, not the absence of one.

          Booking used to require an active plan on the route, so this screen was the
          turnstile and «no plan» was simply the state of not being allowed in. That
          rule is gone (see `TripService::book`), which means the honest thing is to
          put the alternative on the same screen, in the same shape as the plans, so a
          student who needs three rides can see that buying a week is not the only door.

          It sits ABOVE the plans deliberately: it is the default, and the plans are
          the upsell.
        */}
        <Pressable
          onPress={() => router.push('/(app)/home')}
          accessibilityRole="button"
          accessibilityLabel={t('subscriptions.noPlanCta')}
          style={({ pressed }) => [s.noPlanCard, pressed && { opacity: 0.9 }]}
        >
          <View style={s.noPlanHead}>
            <View style={s.noPlanIcon}>
              <Icon name="credit-card" size={20} color={theme.colors.primary} />
            </View>
            <Text style={s.noPlanTitle}>{t('subscriptions.noPlanTitle')}</Text>
          </View>
          <Text style={s.noPlanBody}>{t('subscriptions.noPlanBody')}</Text>
          <View style={s.noPlanCta}>
            <Text style={s.noPlanCtaText}>{t('subscriptions.noPlanCta')}</Text>
            <Icon name="chevron-left" size={16} color={theme.colors.primary} />
          </View>
        </Pressable>

        {subs.length > 0 && (
          <>
            <SectionTitle title={t('subscriptions.mine')} />
            {subs.map((sub) => (
              <View key={sub.id} style={s.premium}>
                <View style={s.premiumTop}>
                  <View style={{ flex: 1 }}>
                    <View style={[s.activePill, !sub.usable && s.warnPill]}>
                      <Icon name={sub.usable ? 'circle-check' : 'clock'} size={13} color={theme.colors.primary} />
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
                    <Num style={s.pStatValue} value={sub.remaining_rides} />
                  </View>
                  <View style={s.pDivider} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.pStatLabel}>{t('subscriptions.endsAt')}</Text>
                    <Text style={s.pStatValueSm}>{sub.ends_at ? new Date(sub.ends_at).toLocaleDateString(locale, { day: 'numeric', month: 'short' }) : '—'}</Text>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}

        <SectionTitle title={t('subscriptions.available')} />
        {loading ? (
          <ListSkeleton rows={3} />
        ) : loadError ? (
          <ErrorState title={t('common.error')} message={t('common.loadFailed')} retryLabel={t('common.retry')} onRetry={() => void load()} />
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
                    <Text style={s.priceVal}>{bareJod(p.price_fils)}</Text>
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
                    <Text style={s.metaTagText}>{p.rides_count} {t('subscriptions.rideWord')}</Text>
                  </View>
                  <View style={s.metaTag}>
                    <Icon name="calendar" size={12} color={theme.colors.textSecondary} />
                    <Text style={s.metaTagText}>{p.duration_days} {t('subscriptions.dayUnit')}</Text>
                  </View>
                  {/* The number that makes a plan comparable to the fare on the ride
                      card. «23 dinars for 12 rides» is not a comparison anyone can do
                      in their head; «1.375 per ride» is. */}
                  <View style={[s.metaTag, s.metaTagAccent]}>
                    <Icon name="tag" size={12} color={theme.colors.primary} />
                    <Text style={[s.metaTagText, s.metaTagTextAccent]}>
                      {bareJod(p.price_per_ride_fils)} {t('subscriptions.currency')} {t('subscriptions.perRide')}
                    </Text>
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
    h1: { fontFamily: t.fontFamily.bold, fontSize: 26, color: t.colors.text, textAlign: 'right', marginBottom: t.spacing.base },
    meta: { fontFamily: t.fontFamily.regular, fontSize: 13, color: t.colors.textSecondary, textAlign: 'right', marginTop: 4 },

    // Active premium subscription card
    premium: { backgroundColor: t.colors.primary, borderRadius: t.radius.sheet, padding: t.spacing.lg, marginBottom: t.spacing.base, ...t.shadow.md },
    premiumTop: { flexDirection: 'row-reverse', alignItems: 'flex-start', marginBottom: t.spacing.md },
    activePill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, alignSelf: 'flex-end', backgroundColor: t.colors.accent, paddingHorizontal: 10, paddingVertical: 3, borderRadius: t.radius.pill, marginBottom: 8 },
    warnPill: { backgroundColor: t.colors.warning },
    activePillText: { fontFamily: t.fontFamily.bold, fontSize: 11, color: t.colors.primary },
    premiumTitle: { fontFamily: t.fontFamily.bold, fontSize: 18, color: t.colors.onPrimary, textAlign: 'right' },
    premiumIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: t.colors.accent, alignItems: 'center', justifyContent: 'center', marginLeft: t.spacing.md },
    premiumStats: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: t.radius.card, padding: t.spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
    pStatLabel: { fontFamily: t.fontFamily.regular, fontSize: 11, color: 'rgba(255,255,255,0.65)', textAlign: 'right' },
    pStatValue: { fontFamily: t.fontFamily.bold, fontSize: 20, color: t.colors.accent, textAlign: 'right', marginTop: 2 },
    pStatValueSm: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.onPrimary, textAlign: 'right', marginTop: 2 },
    pDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.12)', marginHorizontal: t.spacing.md },

    // Available plan card
    planCard: { flexDirection: 'row-reverse', backgroundColor: t.colors.card, borderRadius: t.radius.sheet, borderWidth: 1, borderColor: t.colors.border, overflow: 'hidden', marginBottom: t.spacing.base, ...t.shadow.sm },
    planAccent: { width: 5, backgroundColor: t.colors.accent },
    planBody: { flex: 1, padding: t.spacing.base },
    planHead: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: t.spacing.sm },
    planName: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.text, flex: 1, textAlign: 'right' },
    priceChip: { flexDirection: 'row-reverse', alignItems: 'flex-end', gap: 3, backgroundColor: t.colors.primarySoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: t.radius.card },
    priceVal: { fontFamily: t.fontFamily.bold, fontSize: 18, color: t.colors.primary },
    priceCur: { fontFamily: t.fontFamily.medium, fontSize: 11, color: t.colors.primary, marginBottom: 2 },
    planMetaRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginBottom: t.spacing.md },
    metaTag: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: t.colors.background, paddingHorizontal: 8, paddingVertical: 4, borderRadius: t.radius.pill },
    metaTagText: { fontFamily: t.fontFamily.medium, fontSize: 11, color: t.colors.textSecondary },
    metaTagAccent: { backgroundColor: t.colors.primarySoft },
    metaTagTextAccent: { color: t.colors.primary },
    subBtn: { backgroundColor: t.colors.primary, height: 46, borderRadius: t.radius.card, alignItems: 'center', justifyContent: 'center' },

    optional: { ...t.type.body, color: t.colors.textSecondary, textAlign: 'right', marginBottom: t.spacing.base },
    noPlanCard: { backgroundColor: t.colors.card, borderRadius: t.radius.sheet, borderWidth: 1, borderColor: t.colors.primarySoft, borderStyle: 'dashed', padding: t.spacing.base, marginBottom: t.spacing.lg },
    noPlanHead: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.md },
    noPlanIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    noPlanTitle: { ...t.type.titleMd, flex: 1, color: t.colors.text, textAlign: 'right' },
    noPlanBody: { ...t.type.body, color: t.colors.textSecondary, textAlign: 'right', marginTop: t.spacing.sm },
    noPlanCta: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, alignSelf: 'flex-end', marginTop: t.spacing.sm },
    noPlanCtaText: { ...t.type.body, fontFamily: t.fontFamily.bold, color: t.colors.primary },
    subBtnText: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.onPrimary },
  });
