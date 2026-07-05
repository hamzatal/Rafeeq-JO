import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { RewardRedemptionOption, RewardSummary } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Screen } from '../../src/components/Screen';
import { Banner } from '../../src/components/Banner';
import { useI18n } from '../../src/i18n';
import { api } from '../../src/lib/api';
import { useTheme, type AppTheme } from '../../src/theme';

export default function Rewards() {
  const { t } = useI18n();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const [summary, setSummary] = useState<RewardSummary | null>(null);
  const [options, setOptions] = useState<RewardRedemptionOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const load = () => {
    api.rewards.summary().then(setSummary).catch(() => undefined);
    api.rewards.options().then(setOptions).catch(() => undefined);
  };

  useEffect(() => load(), []);

  const redeem = async (points: number) => {
    setMsg(null);
    setBusy(true);
    try {
      const r = await api.rewards.redeemToWallet(points);
      setMsg({ text: `${t('rewards.redeemed')} +${(r.credited_fils / 1000).toFixed(2)} ${t('subscriptions.currency')}`, ok: true });
      load();
    } catch (e) {
      setMsg({ text: e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('rewards.insufficient'), ok: false });
    } finally {
      setBusy(false);
    }
  };

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

      {msg && <View style={{ marginTop: theme.spacing.base }}><Banner message={msg.text} variant={msg.ok ? 'success' : 'error'} /></View>}

      {options.length > 0 && (
        <View style={{ marginTop: theme.spacing.lg }}>
          <Text style={s.section}>{t('rewards.redeemToWallet')}</Text>
          <View style={s.optsWrap}>
            {options.map((o) => {
              const affordable = (summary?.points ?? 0) >= o.points;
              return (
                <Pressable
                  key={o.points}
                  disabled={busy || !affordable}
                  onPress={() => redeem(o.points)}
                  style={[s.opt, !affordable && s.optDisabled]}
                >
                  <Text style={s.optPoints}>{o.points}</Text>
                  <Text style={s.optReward}>{(o.credit_fils / 1000).toFixed(0)} {t('subscriptions.currency')}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </Screen>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    h1: { fontFamily: t.fontFamily.extrabold, fontSize: 24, color: t.colors.text, textAlign: 'right', marginBottom: t.spacing.base },
    card: { backgroundColor: t.colors.ink, borderRadius: t.radius.lg, padding: t.spacing.xl, alignItems: 'center', marginBottom: t.spacing.lg },
    pts: { fontFamily: t.fontFamily.extrabold, fontSize: 48, color: t.colors.onInk },
    ptsLabel: { fontFamily: t.fontFamily.medium, fontSize: 14, color: t.colors.onInk, opacity: 0.9 },
    tierPill: { marginTop: t.spacing.base, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: t.spacing.lg, paddingVertical: 6, borderRadius: 999 },
    tierText: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.onInk },
    row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: t.spacing.sm, borderBottomWidth: 1, borderBottomColor: t.colors.border },
    metaLabel: { fontFamily: t.fontFamily.medium, fontSize: 14, color: t.colors.textSecondary },
    metaValue: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.text },
    section: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.text, textAlign: 'right', marginBottom: t.spacing.sm },
    optsWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: t.spacing.sm },
    opt: { backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.primary, borderRadius: t.radius.md, paddingVertical: t.spacing.base, paddingHorizontal: t.spacing.lg, alignItems: 'center', minWidth: 90 },
    optDisabled: { opacity: 0.4, borderColor: t.colors.border },
    optPoints: { fontFamily: t.fontFamily.extrabold, fontSize: 18, color: t.colors.primary },
    optReward: { fontFamily: t.fontFamily.medium, fontSize: 12, color: t.colors.textSecondary, marginTop: 2 },
  });
