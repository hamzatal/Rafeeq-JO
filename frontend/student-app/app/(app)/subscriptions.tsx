import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Subscription, SubscriptionPlan } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Button } from '../../src/components/Button';
import { Banner } from '../../src/components/Banner';
import { api } from '../../src/lib/api';
import { useTheme, type AppTheme } from '../../src/theme';

export default function Subscriptions() {
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
      setMsg({ text: 'تم إنشاء الاشتراك. أكمل الدفع لتفعيله.', ok: true });
      await load();
    } catch (e) {
      setMsg({ text: e instanceof RafeeqApiError ? e.firstError() ?? e.message : 'فشل', ok: false });
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.h1}>الاشتراكات</Text>
        {msg && <Banner message={msg.text} variant={msg.ok ? 'success' : 'error'} />}

        {subs.length > 0 && (
          <>
            <Text style={s.section}>اشتراكاتي</Text>
            {subs.map((sub) => (
              <View key={sub.id} style={s.card}>
                <View style={s.row}>
                  <Text style={s.cardTitle}>{sub.plan?.name ?? 'اشتراك'}</Text>
                  <Text style={[s.badge, { color: sub.usable ? theme.colors.success : theme.colors.warning }]}>{sub.status_label}</Text>
                </View>
                <Text style={s.meta}>
                  {sub.remaining_rides === null ? 'غير محدود' : `${sub.remaining_rides} رحلة متبقية`}
                  {sub.ends_at ? ` · ينتهي ${new Date(sub.ends_at).toLocaleDateString('ar')}` : ''}
                </Text>
              </View>
            ))}
          </>
        )}

        <Text style={s.section}>الخطط المتاحة</Text>
        {loading ? (
          <Text style={s.meta}>جارٍ التحميل...</Text>
        ) : plans.length === 0 ? (
          <Text style={s.meta}>لا توجد خطط متاحة حالياً</Text>
        ) : (
          plans.map((p) => (
            <View key={p.id} style={s.card}>
              <View style={s.row}>
                <Text style={s.cardTitle}>{p.name}</Text>
                <Text style={s.price}>{p.price_jod} د.أ</Text>
              </View>
              <Text style={s.meta}>{p.type_label} · {p.unlimited ? 'غير محدود' : `${p.rides_count} رحلة`} · {p.duration_days} يوم</Text>
              <Button title="اشترك" onPress={() => subscribe(p.id)} loading={busy === p.id} style={s.btn} />
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
    content: { padding: t.spacing.lg },
    h1: { fontFamily: t.fontFamily.extrabold, fontSize: 22, color: t.colors.text, textAlign: 'right', marginBottom: t.spacing.base },
    section: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.text, textAlign: 'right', marginTop: t.spacing.base, marginBottom: t.spacing.sm },
    card: { backgroundColor: t.colors.card, borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.colors.border, padding: t.spacing.base, marginBottom: t.spacing.md },
    row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.text },
    price: { fontFamily: t.fontFamily.extrabold, fontSize: 16, color: t.colors.primary },
    badge: { fontFamily: t.fontFamily.medium, fontSize: 13 },
    meta: { fontFamily: t.fontFamily.regular, fontSize: 13, color: t.colors.textSecondary, textAlign: 'right', marginTop: 4 },
    btn: { marginTop: t.spacing.md },
  });
