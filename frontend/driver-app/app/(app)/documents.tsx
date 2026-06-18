import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import type { DocumentType } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Banner } from '../../src/components/Banner';
import { Card } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { useI18n } from '../../src/i18n';
import { useAuth } from '../../src/store/auth';
import { api } from '../../src/lib/api';
import { useTheme, type AppTheme } from '../../src/theme';

export default function Documents() {
  const { t } = useI18n();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const driver = useAuth((a) => a.driver);
  const refreshDriver = useAuth((a) => a.refreshDriver);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const DOCS: { type: DocumentType; label: string }[] = [
    { type: 'national_id', label: t('driver.docNationalId') },
    { type: 'license', label: t('driver.docLicense') },
    { type: 'photo', label: t('driver.docPhoto') },
  ];

  const statusOf = (type: DocumentType) => driver?.documents?.find((d) => d.type === type);

  const pickAndUpload = async (type: DocumentType) => {
    setError(null);
    const res = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.length) return;
    const asset = res.assets[0];
    const file = Platform.OS === 'web'
      ? (asset.file as Blob)
      : ({ uri: asset.uri, name: asset.name, type: asset.mimeType ?? 'application/octet-stream' } as unknown as Blob);

    setUploading(type);
    try {
      await api.driver.uploadDocument(type, file);
      await refreshDriver();
    } catch (e) {
      setError(e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('driver.uploadFailed'));
    } finally {
      setUploading(null);
    }
  };

  return (
    <ScrollView style={s.safe} contentContainerStyle={s.content}>
      <Text style={s.hint}>{t('driver.docsHint')}</Text>
      <Banner message={error} variant="error" />

      {DOCS.map((doc) => {
        const existing = statusOf(doc.type);
        const badge = existing?.status === 'approved' ? { text: t('driver.docApproved'), color: theme.colors.success, icon: 'check-circle' as const }
          : existing?.status === 'rejected' ? { text: t('driver.docRejected'), color: theme.colors.danger, icon: 'x-circle' as const }
          : existing ? { text: t('driver.docUnderReview'), color: theme.colors.warning, icon: 'clock' as const }
          : { text: t('driver.docNotUploaded'), color: theme.colors.muted, icon: 'upload-cloud' as const };

        return (
          <Card key={doc.type}>
            <View style={s.row}>
              <View style={s.rowInfo}>
                <Text style={s.rowLabel}>{doc.label}</Text>
                <View style={s.badgeRow}>
                  <Icon name={badge.icon} size={13} color={badge.color} />
                  <Text style={[s.rowBadge, { color: badge.color }]}>{badge.text}</Text>
                </View>
                {existing?.status === 'rejected' && existing.review_note ? <Text style={s.note}>{existing.review_note}</Text> : null}
              </View>
              <Pressable style={s.uploadBtn} onPress={() => pickAndUpload(doc.type)} disabled={uploading === doc.type}>
                <Text style={s.uploadText}>{uploading === doc.type ? '...' : existing ? t('driver.change') : t('driver.upload')}</Text>
              </Pressable>
            </View>
          </Card>
        );
      })}
    </ScrollView>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colors.background },
    content: { padding: t.spacing.lg },
    hint: { fontFamily: t.fontFamily.regular, fontSize: 14, color: t.colors.textSecondary, textAlign: 'right', marginBottom: t.spacing.base },
    row: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
    rowInfo: { flex: 1, alignItems: 'flex-end' },
    rowLabel: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.text },
    badgeRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 4 },
    rowBadge: { fontFamily: t.fontFamily.medium, fontSize: 12 },
    note: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.danger, marginTop: 4, textAlign: 'right' },
    uploadBtn: { backgroundColor: t.colors.primary, paddingVertical: 9, paddingHorizontal: 18, borderRadius: t.radius.md, marginStart: t.spacing.md },
    uploadText: { color: t.colors.onPrimary, fontFamily: t.fontFamily.bold, fontSize: 13 },
  });
