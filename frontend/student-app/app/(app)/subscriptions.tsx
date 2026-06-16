import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Subscription, SubscriptionPlan } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Button } from '../../src/components/Button';
import { Banner } from '../../src/components/Banner';
import { api } from '../../src/lib/api';
import { theme } from '../../src/theme';

export default function Subscriptions() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([api.transport.listPlans(), api.transport.mySubscriptions()]);
      setPlans(p);
      setSubs(s);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.h1}>الاشتراكات</Text>
        {msg && <Banner message={msg.text} variant={msg.ok ? 'success' : 'error'} />}

        {subs.length > 0 && (
          <>
            <Text style={styles.section}>اشتراكاتي</Text>
            {subs.map((s) => (
              <View key={s.id} style={styles.card}>
                <View style={styles.row}>
                  <Text style={styles.cardTitle}>{s.plan?.name ?? 'اشتراك'}</Text>
                  <Text style={[styles.badge, { color: s.usable ? theme.colors.success : theme.colors.warning }]}>
                    {s.status_label}
                  </Text>
                </View>
                <Text style={styles.meta}>
                  {s.remaining_rides === null ? 'غير محدود' : `${s.remaining_rides} رحلة متبقية`}
                  {s.ends_at ? ` · ينتهي ${new Date(s.ends_at).toLocaleDateString('ar')}` : ''}
                </Text>
              </View>
            ))}
          </>
        )}

        <Text style={styles.section}>الخطط المتاحة</Text>
        {loading ? (
          <Text style={styles.meta}>جارٍ التحميل...</Text>
        ) : plans.length === 0 ? (
          <Text style={styles.meta}>لا توجد خطط متاحة حالياً</Text>
        ) : (
          plans.map((p) => (
            <View key={p.id} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.cardTitle}>{p.name}</Text>
                <Text style={styles.price}>{p.price_jod} د.أ</Text>
              </View>
              <Text style={styles.meta}>
                {p.type_label} · {p.unlimited ? 'غير محدود' : `${p.rides_count} رحلة`} · {p.duration_days} يوم
              </Text>
              <Button title="اشترك" onPress={() => subscribe(p.id)} loading={busy === p.id} style={styles.btn} />
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg },
  h1: { fontFamily: theme.fontFamily.extrabold, fontSize: 22, color: theme.colors.text, textAlign: 'right', marginBottom: theme.spacing.base },
  section: { fontFamily: theme.fontFamily.bold, fontSize: 16, color: theme.colors.text, textAlign: 'right', marginTop: theme.spacing.base, marginBottom: theme.spacing.sm },
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.base, marginBottom: theme.spacing.md },
  row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontFamily: theme.fontFamily.bold, fontSize: 16, color: theme.colors.text },
  price: { fontFamily: theme.fontFamily.extrabold, fontSize: 16, color: theme.colors.primary },
  badge: { fontFamily: theme.fontFamily.medium, fontSize: 13 },
  meta: { fontFamily: theme.fontFamily.regular, fontSize: 13, color: theme.colors.textSecondary, textAlign: 'right', marginTop: 4 },
  btn: { marginTop: theme.spacing.md },
});
