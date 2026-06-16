import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import type { DocumentType } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Banner } from '../../src/components/Banner';
import { useAuth } from '../../src/store/auth';
import { api } from '../../src/lib/api';
import { theme } from '../../src/theme';

const DOCS: { type: DocumentType; label: string }[] = [
  { type: 'national_id', label: 'الهوية الوطنية' },
  { type: 'license', label: 'رخصة القيادة' },
  { type: 'vehicle_registration', label: 'دفتر المركبة' },
  { type: 'insurance', label: 'التأمين' },
  { type: 'photo', label: 'صورة شخصية' },
];

export default function Documents() {
  const driver = useAuth((s) => s.driver);
  const refreshDriver = useAuth((s) => s.refreshDriver);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const statusOf = (type: DocumentType) =>
    driver?.documents?.find((d) => d.type === type);

  const pickAndUpload = async (type: DocumentType) => {
    setError(null);
    const res = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.length) return;

    const asset = res.assets[0];
    const file =
      Platform.OS === 'web'
        ? (asset.file as Blob)
        : ({ uri: asset.uri, name: asset.name, type: asset.mimeType ?? 'application/octet-stream' } as unknown as Blob);

    setUploading(type);
    try {
      await api.driver.uploadDocument(type, file);
      await refreshDriver();
    } catch (e) {
      setError(e instanceof RafeeqApiError ? e.firstError() ?? e.message : 'تعذّر الرفع');
    } finally {
      setUploading(null);
    }
  };

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.content}>
      <Text style={styles.hint}>ارفع وثائقك الرسمية ليتم اعتماد حسابك. الصيغ المقبولة: صورة أو PDF.</Text>
      <Banner message={error} variant="error" />

      {DOCS.map((doc) => {
        const existing = statusOf(doc.type);
        const badge =
          existing?.status === 'approved' ? { text: 'مقبولة', color: theme.colors.success }
          : existing?.status === 'rejected' ? { text: 'مرفوضة', color: theme.colors.danger }
          : existing ? { text: 'قيد المراجعة', color: theme.colors.warning }
          : { text: 'غير مرفوعة', color: theme.colors.textSecondary };

        return (
          <View key={doc.type} style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowLabel}>{doc.label}</Text>
              <Text style={[styles.rowBadge, { color: badge.color }]}>{badge.text}</Text>
              {existing?.status === 'rejected' && existing.review_note ? (
                <Text style={styles.note}>{existing.review_note}</Text>
              ) : null}
            </View>
            <Pressable
              style={styles.uploadBtn}
              onPress={() => pickAndUpload(doc.type)}
              disabled={uploading === doc.type}
            >
              <Text style={styles.uploadText}>{uploading === doc.type ? '...' : existing ? 'تغيير' : 'رفع'}</Text>
            </Pressable>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg },
  hint: { fontFamily: theme.fontFamily.regular, fontSize: 14, color: theme.colors.textSecondary, textAlign: 'right', marginBottom: theme.spacing.base },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.base,
    marginBottom: theme.spacing.md,
  },
  rowInfo: { flex: 1, alignItems: 'flex-end' },
  rowLabel: { fontFamily: theme.fontFamily.bold, fontSize: 15, color: theme.colors.text },
  rowBadge: { fontFamily: theme.fontFamily.medium, fontSize: 12, marginTop: 2 },
  note: { fontFamily: theme.fontFamily.regular, fontSize: 12, color: theme.colors.danger, marginTop: 2, textAlign: 'right' },
  uploadBtn: { backgroundColor: theme.colors.primary, paddingVertical: 8, paddingHorizontal: 16, borderRadius: theme.radius.md, marginStart: theme.spacing.md },
  uploadText: { color: theme.colors.onPrimary, fontFamily: theme.fontFamily.bold, fontSize: 13 },
});
