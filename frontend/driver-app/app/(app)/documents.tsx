import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import type { DocumentType } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Banner } from '../../src/components/Banner';
import { useAuth } from '../../src/store/auth';
import { api } from '../../src/lib/api';
import { useTheme, type AppTheme } from '../../src/theme';

const DOCS: { type: DocumentType; label: string }[] = [
  { type: 'national_id', label: 'الهوية الوطنية' },
  { type: 'license', label: 'رخصة القيادة' },
  { type: 'photo', label: 'صورة شخصية' },
];

export default function Documents() {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const driver = useAuth((a) => a.driver);
  const refreshDriver = useAuth((a) => a.refreshDriver);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      setError(e instanceof RafeeqApiError ? e.firstError() ?? e.message : 'تعذّر الرفع');
    } finally {
      setUploading(null);
    }
  };

  return (
    <ScrollView style={s.safe} contentContainerStyle={s.content}>
      <Text style={s.hint}>ارفع الهوية ورخصة القيادة لاعتماد حسابك. الصيغ المقبولة: صورة أو PDF.</Text>
      <Banner message={error} variant="error" />

      {DOCS.map((doc) => {
        const existing = statusOf(doc.type);
        const badge = existing?.status === 'approved' ? { text: 'مقبولة', color: theme.colors.success }
          : existing?.status === 'rejected' ? { text: 'مرفوضة', color: theme.colors.danger }
          : existing ? { text: 'قيد المراجعة', color: theme.colors.warning }
          : { text: 'غير مرفوعة', color: theme.colors.textSecondary };

        return (
          <View key={doc.type} style={s.row}>
            <View style={s.rowInfo}>
              <Text style={s.rowLabel}>{doc.label}</Text>
              <Text style={[s.rowBadge, { color: badge.color }]}>{badge.text}</Text>
              {existing?.status === 'rejected' && existing.review_note ? <Text style={s.note}>{existing.review_note}</Text> : null}
            </View>
            <Pressable style={s.uploadBtn} onPress={() => pickAndUpload(doc.type)} disabled={uploading === doc.type}>
              <Text style={s.uploadText}>{uploading === doc.type ? '...' : existing ? 'تغيير' : 'رفع'}</Text>
            </Pressable>
          </View>
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
    row: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', backgroundColor: t.colors.card, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.border, padding: t.spacing.base, marginBottom: t.spacing.md },
    rowInfo: { flex: 1, alignItems: 'flex-end' },
    rowLabel: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.text },
    rowBadge: { fontFamily: t.fontFamily.medium, fontSize: 12, marginTop: 2 },
    note: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.danger, marginTop: 2, textAlign: 'right' },
    uploadBtn: { backgroundColor: t.colors.primary, paddingVertical: 8, paddingHorizontal: 16, borderRadius: t.radius.md, marginStart: t.spacing.md },
    uploadText: { color: t.colors.onPrimary, fontFamily: t.fontFamily.bold, fontSize: 13 },
  });
