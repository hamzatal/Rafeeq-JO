import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { DocumentStatus } from '@rafeeq/shared';
import { useI18n } from '../../src/i18n';
import { useAuth } from '../../src/store/auth';
import { useTheme, type AppTheme } from '../../src/theme';
import { Icon, type IconName } from '../../src/components/Icon';

const DOC_ICON: Record<string, IconName> = {
  license: 'credit-card',
  driving_license: 'credit-card',
  vehicle_insurance: 'shield',
  insurance: 'shield',
  national_id: 'user',
  photo: 'camera',
};

export default function Profile() {
  const { t } = useI18n();
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const user = useAuth((a) => a.user);
  const driver = useAuth((a) => a.driver);

  const vehicle = driver?.vehicles?.[0];
  const docs = driver?.documents ?? [];
  const initial = (user?.full_name ?? 'ر').charAt(0);

  const docTone = (st: DocumentStatus) =>
    st === 'approved' ? theme.colors.success : st === 'rejected' ? theme.colors.danger : theme.colors.warning;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header — avatar (right) · Rafeeq · bell (left) per Stitch _24 */}
      <View style={s.header}>
        <View style={s.avatarSm}>
          <Text style={s.avatarSmText}>{initial}</Text>
        </View>
        <Text style={s.brand}>رفيق</Text>
        <Pressable hitSlop={8} style={s.headerBtn}>
          <Icon name="bell" size={24} color={theme.colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Profile hero — avatar (right) + verified badge, name/pill to the left */}
        <View style={s.profileCard}>
          <View style={s.profileBlob} pointerEvents="none" />
          <View style={s.avatarLg}>
            <Text style={s.avatarLgText}>{initial}</Text>
            <View style={s.verifiedBadge}>
              <Icon name="check" size={12} color="#FFFFFF" />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.name} numberOfLines={1}>{user?.full_name ?? '—'}</Text>
            <View style={s.verifiedPill}>
              <Icon name="check-circle" size={12} color={theme.colors.accent} />
              <Text style={s.verifiedText}>{t('driver.verifiedCaptain')}</Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <View style={s.statHead}>
              <Icon name="star" size={16} color={theme.colors.accent} />
              <Text style={s.statLabel}>{t('driver.overallRating')}</Text>
            </View>
            <Text style={s.statValue}>
              {driver?.rating_avg?.toFixed(1) ?? '—'} <Text style={s.statMax}>/ 5.0</Text>
            </Text>
          </View>
          <View style={s.statCard}>
            <View style={s.statHead}>
              <Icon name="navigation" size={16} color={theme.colors.primary} />
              <Text style={s.statLabel}>{t('driver.totalTrips')}</Text>
            </View>
            <Text style={s.statValue}>{driver?.total_trips?.toLocaleString('en-US') ?? '0'}</Text>
          </View>
        </View>

        {/* Vehicle details */}
        <Text style={s.section}>{t('driver.vehicleDetails')}</Text>
        <Pressable onPress={() => router.push('/(app)/vehicle')} style={s.vehicleCard}>
          <View style={s.vehicleTop}>
            <View style={s.vehicleBadge}>
              <Icon name="truck" size={14} color={theme.colors.primary} />
              <Text style={s.vehicleBadgeText}>
                {vehicle ? `${vehicle.make} ${vehicle.model} ${vehicle.year}` : t('driver.addVehicle')}
              </Text>
            </View>
          </View>
          <View style={s.vehicleMeta}>
            <View style={{ flex: 1 }}>
              <Text style={s.vehicleMetaLabel}>{t('driver.plateNumber')}</Text>
              <Text style={s.vehicleMetaValue}>{vehicle?.plate_number ?? '—'}</Text>
            </View>
            <View style={s.vehicleDivider} />
            <View style={{ flex: 1 }}>
              <Text style={s.vehicleMetaLabel}>{t('driver.color')}</Text>
              <Text style={s.vehicleMetaValue}>{vehicle?.color ?? '—'}</Text>
            </View>
          </View>
        </Pressable>

        {/* Official documents */}
        <Text style={s.section}>{t('driver.officialDocs')}</Text>
        <Pressable onPress={() => router.push('/(app)/documents')} style={s.docsCard}>
          {docs.length === 0 ? (
            <Text style={s.docEmpty}>{t('driver.docNotUploaded')}</Text>
          ) : (
            docs.map((d, i) => {
              const tone = docTone(d.status);
              return (
                <View key={d.id} style={[s.docRow, i > 0 && s.docRowBorder]}>
                  <View style={[s.docStatus, { backgroundColor: tone + '1A' }]}>
                    <View style={[s.docDot, { backgroundColor: tone }]} />
                    <Text style={[s.docStatusText, { color: tone }]}>{d.status_label}</Text>
                  </View>
                  <Text style={s.docName}>{d.type_label}</Text>
                  <View style={s.docIcon}>
                    <Icon name={DOC_ICON[d.type] ?? 'file-text'} size={20} color={theme.colors.primary} />
                  </View>
                </View>
              );
            })
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colors.background },
    header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: t.spacing.lg, paddingVertical: t.spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.colors.hairline },
    headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    brand: { fontFamily: t.fontFamily.extrabold, fontSize: 24, lineHeight: 32, color: t.colors.primary },
    avatarSm: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.colors.surfaceHighest, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.colors.border },
    avatarSmText: { fontFamily: t.fontFamily.extrabold, fontSize: 16, color: t.colors.primary },
    content: { padding: t.spacing.lg, paddingBottom: t.spacing['3xl'] },

    profileCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.lg, backgroundColor: t.colors.surface, borderRadius: t.radius.xl, borderWidth: 1, borderColor: t.colors.surfaceHighest, padding: t.spacing.lg, overflow: 'hidden', ...t.shadow.sm },
    profileBlob: { position: 'absolute', top: -40, right: -40, width: 128, height: 128, borderRadius: 64, backgroundColor: t.colors.accentBright, opacity: 0.1 },
    name: { fontFamily: t.fontFamily.extrabold, fontSize: 24, lineHeight: 32, color: t.colors.primary, textAlign: 'right' },
    verifiedPill: { flexDirection: 'row-reverse', alignItems: 'center', alignSelf: 'flex-end', gap: 5, backgroundColor: t.colors.surfaceAlt, borderWidth: 1, borderColor: t.colors.accentSoft, borderRadius: t.radius.full, paddingHorizontal: 10, paddingVertical: 4, marginTop: 6 },
    verifiedText: { fontFamily: t.fontFamily.medium, fontSize: 14, color: t.colors.accent },
    avatarLg: { width: 80, height: 80, borderRadius: 40, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: t.colors.surface, ...t.shadow.md },
    avatarLgText: { fontFamily: t.fontFamily.extrabold, fontSize: 32, color: t.colors.onPrimary },
    verifiedBadge: { position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: t.colors.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: t.colors.surface },

    statsRow: { flexDirection: 'row-reverse', gap: t.spacing.md, marginTop: t.spacing.md },
    statCard: { flex: 1, backgroundColor: t.colors.surface, borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.colors.hairline, padding: t.spacing.base, ...t.shadow.sm },
    statHead: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
    statLabel: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary },
    statValue: { fontFamily: t.fontFamily.extrabold, fontSize: 32, lineHeight: 40, color: t.colors.primary, textAlign: 'right', marginTop: 6 },
    statMax: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary },

    section: { fontFamily: t.fontFamily.medium, fontSize: 14, color: t.colors.textSecondary, textAlign: 'right', marginTop: t.spacing.lg, marginBottom: t.spacing.sm },

    vehicleCard: { backgroundColor: t.colors.surface, borderRadius: t.radius.xl, borderWidth: 1, borderColor: t.colors.hairline, overflow: 'hidden', ...t.shadow.sm },
    vehicleTop: { height: 110, backgroundColor: t.colors.surfaceAlt, alignItems: 'flex-start', justifyContent: 'flex-end', padding: t.spacing.md },
    vehicleBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: t.colors.surface, borderRadius: t.radius.md, paddingHorizontal: 12, paddingVertical: 7, ...t.shadow.sm },
    vehicleBadgeText: { fontFamily: t.fontFamily.bold, fontSize: 13, color: t.colors.primary },
    vehicleMeta: { flexDirection: 'row-reverse', alignItems: 'center', padding: t.spacing.base },
    vehicleMetaLabel: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary, textAlign: 'right' },
    vehicleMetaValue: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.text, textAlign: 'right', marginTop: 2, letterSpacing: 1 },
    vehicleDivider: { width: StyleSheet.hairlineWidth, height: 34, backgroundColor: t.colors.border, marginHorizontal: t.spacing.base },

    docsCard: { backgroundColor: t.colors.surface, borderRadius: t.radius.xl, borderWidth: 1, borderColor: t.colors.hairline, paddingHorizontal: t.spacing.base, ...t.shadow.sm },
    docEmpty: { fontFamily: t.fontFamily.regular, fontSize: 13, color: t.colors.muted, textAlign: 'center', paddingVertical: t.spacing.base },
    docRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.md, paddingVertical: t.spacing.base },
    docRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.colors.hairline },
    docIcon: { width: 44, height: 44, borderRadius: t.radius.md, backgroundColor: t.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    docName: { flex: 1, fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.text, textAlign: 'right' },
    docStatus: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: t.radius.full },
    docDot: { width: 6, height: 6, borderRadius: 3 },
    docStatusText: { fontFamily: t.fontFamily.semibold, fontSize: 11 },
  });
