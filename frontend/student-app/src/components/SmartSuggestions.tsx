import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { SmartSuggestions as SmartSuggestionsModel } from '@rafeeq/shared';
import { api } from '../lib/api';
import { useTheme, type AppTheme } from '../theme';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './kit';

/**
 * AI-powered, context-aware ride suggestions (time of day + saved addresses +
 * university). Shows a friendly headline and tappable chips that jump straight
 * into the ride-request flow. Renders nothing until loaded so it never flashes
 * an empty gap.
 */
export function SmartSuggestions() {
  const theme = useTheme();
  const router = useRouter();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const [data, setData] = useState<SmartSuggestionsModel | null>(null);

  useEffect(() => {
    let alive = true;
    api.assistant
      .suggestions()
      .then((d) => alive && setData(d))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  if (!data || data.suggestions.length === 0) return null;

  return (
    <View style={s.wrap}>
      <View style={s.headlineRow}>
        <View style={s.sparkle}>
          <Icon name="zap" size={12} color={theme.colors.accent} />
        </View>
        <Text style={s.headline} numberOfLines={1}>{data.headline}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
        {data.suggestions.map((sug) => (
          <PressableScale key={sug.id} onPress={() => router.push('/(app)/ride-request')} style={s.chip} scaleTo={0.96}>
            <View style={s.chipIcon}>
              <Icon name={(sug.icon as IconName) ?? 'navigation'} size={16} color={theme.colors.primary} />
            </View>
            <View style={s.chipText}>
              <Text style={s.chipTitle} numberOfLines={1}>{sug.title}</Text>
              {!!sug.subtitle && <Text style={s.chipSub} numberOfLines={1}>{sug.subtitle}</Text>}
            </View>
          </PressableScale>
        ))}
      </ScrollView>
    </View>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    wrap: { marginBottom: t.spacing.md },
    headlineRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: t.spacing.sm, paddingHorizontal: 2 },
    sparkle: { width: 20, height: 20, borderRadius: 10, backgroundColor: t.colors.accent + '1A', alignItems: 'center', justifyContent: 'center' },
    headline: { flex: 1, fontFamily: t.fontFamily.bold, fontSize: 14, color: t.colors.text, textAlign: 'right' },
    row: { flexDirection: 'row-reverse', gap: t.spacing.sm, paddingHorizontal: 2 },
    chip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, backgroundColor: t.colors.surface, borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.colors.hairline, paddingVertical: 8, paddingHorizontal: 12, ...t.shadow.sm },
    chipIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: t.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    chipText: { maxWidth: 150 },
    chipTitle: { fontFamily: t.fontFamily.bold, fontSize: 13, color: t.colors.text, textAlign: 'right' },
    chipSub: { fontFamily: t.fontFamily.regular, fontSize: 10, color: t.colors.muted, textAlign: 'right', marginTop: 1 },
  });
