import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Subscription, SubscriptionPlan } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Button } from '../../src/components/Button';
import { Banner } from '../../src/components/Banner';
import { Card, EmptyState, SectionTitle, Badge } from '../../src/components/ui';
import { useI18n } from '../../src/i18n';
import { api } from '../../src/lib/api';
import { useTheme, type AppTheme } from '../../src/theme';

export default function Subscriptions() {
  const { t } = useI18n();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

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

  const subscribe = async (planId: string) => {
    setMsg(null);
    setBusy(planId);
    try {
      await api.transport.subscribe(planId);
      setMsg({ text: t('subscriptions.created'), ok: true });
      await load();
    } catch (e) {
      setMsg({ text: e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('subscriptions.failed'), ok: false });
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.h1}>{t('subscriptions.title')}</Text>
        {msg && <Banner message={msg.text} variant={msg.ok ? 'success' : 'error'} />}

        {subs.length > 0 && (
          <>
            <SectionTitle title={t('subscriptions.mine')} />
            {subs.map((sub) => (
              <Card key={sub.id}>
                <View style={s.row}>
                  <Text style={s.cardTitle}>{sub.plan?.name ?? t('subscriptions.defaultName')}</Text>
                  <Badge label={sub.status_label} tone={sub.usable ? 'success' : 'warning'} />
                </View>
                <Text style={s.meta}>
                  {sub.remaining_rides === null ? t('common.unlimited') : `${sub.remaining_rides} ${t('subscriptions.rideUnit')}`}
                  {sub.ends_at ? ` · ${t('subscriptions.endsAt')} ${new Date(sub.ends_at).toLocaleDateString()}` : ''}
                </Text>
              </Card>
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
            <Card key={p.id}>
              <View style={s.row}>
                <Text style={s.cardTitle}>{p.name}</Text>
                <Text style={s.price}>{p.price_jod} {t('subscriptions.currency')}</Text>
              </View>
              <Text style={s.meta}>
                {p.type_label} · {p.unlimited ? t('common.unlimited') : `${p.rides_count} ${t('subscriptions.rideWord')}`} · {p.duration_days} {t('subscriptions.dayUnit')}
              </Text>
              <Button title={t('subscriptions.subscribe')} onPress={() => subscribe(p.id)} loading={busy === p.id} style={s.btn} />
            </Card>
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
    row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.text, flex: 1, textAlign: 'right' },
    price: { fontFamily: t.fontFamily.extrabold, fontSize: 16, color: t.colors.primary },
    meta: { fontFamily: t.fontFamily.regular, fontSize: 13, color: t.colors.textSecondary, textAlign: 'right', marginTop: 4 },
    btn: { marginTop: t.spacing.md },
  });
