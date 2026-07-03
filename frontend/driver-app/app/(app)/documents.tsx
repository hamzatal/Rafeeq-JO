import { useMemo, useRef, useState, useEffect } from 'react';
import { Animated, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import type { DocumentType } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/ui';
import { Sheet } from '../../src/components/kit';
import { Icon, type IconName } from '../../src/components/Icon';
import { useToast } from '../../src/components/Feedback';
import { useI18n } from '../../src/i18n';
import { useAuth } from '../../src/store/auth';
import { api } from '../../src/lib/api';
import { useTheme, type AppTheme } from '../../src/theme';

const DOC_ICON: Partial<Record<DocumentType, IconName>> = {
  national_id: 'credit-card',
  license: 'file-text',
  photo: 'user',
};

export default function Documents() {
  const { t } = useI18n();
  const theme = useTheme();
  const router = useRouter();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const toast = useToast();
  const driver = useAuth((a) => a.driver);
  const refreshDriver = useAuth((a) => a.refreshDriver);

  const [uploading, setUploading] = useState<DocumentType | null>(null);
  const [pickerFor, setPickerFor] = useState<DocumentType | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const DOCS: { type: DocumentType; label: string }[] = [
    { type: 'national_id', label: t('driver.docNationalId') },
    { type: 'license', label: t('driver.docLicense') },
    { type: 'photo', label: t('driver.docPhoto') },
  ];

  const statusOf = (type: DocumentType) => driver?.documents?.find((d) => d.type === type);
  const uploadedCount = DOCS.filter((d) => statusOf(d.type)).length;
  const hasVehicle = (driver?.vehicles?.length ?? 0) > 0;
  const totalSteps = DOCS.length + 1;
  const doneSteps = uploadedCount + (hasVehicle ? 1 : 0);
  const progress = doneSteps / totalSteps;
  const status = driver?.status ?? 'pending';
  const allDone = uploadedCount === DOCS.length && hasVehicle;
  const canSubmit = (status === 'pending' || status === 'rejected') && allDone;

  // Animated progress bar.
  const bar = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(bar, { toValue: progress, duration: 500, useNativeDriver: false }).start();
  }, [progress, bar]);

  const doUpload = async (type: DocumentType, asset: ImagePicker.ImagePickerAsset) => {
    let file: Blob;
    if (Platform.OS === 'web') {
      // On web the picker sometimes omits `.file`; rebuild a proper File from the URI
      // so the backend receives a named multipart file (avoids 422 "file is required").
      const maybe = (asset as unknown as { file?: File }).file;
      if (maybe instanceof File) {
        file = maybe;
      } else {
        const blob = await (await fetch(asset.uri)).blob();
        const mime = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
        const ext = mime === 'image/png' ? 'png' : 'jpg';
        file = new File([blob], asset.fileName ?? `${type}.${ext}`, { type: mime });
      }
    } else {
      file = { uri: asset.uri, name: asset.fileName ?? `${type}.jpg`, type: asset.mimeType ?? 'image/jpeg' } as unknown as Blob;
    }
    setUploading(type);
    setPreviews((p) => ({ ...p, [type]: asset.uri }));
    try {
      await api.driver.uploadDocument(type, file);
      await refreshDriver();
      toast.success(t('driver.uploaded'));
    } catch (e) {
      toast.error(e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('driver.uploadFailed'));
    } finally {
      setUploading(null);
    }
  };

  const pickFrom = async (source: 'camera' | 'gallery') => {
    const type = pickerFor;
    setPickerFor(null);
    if (!type) return;
    try {
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return toast.error(t('driver.camPermission'));
        const res = await ImagePicker.launchCameraAsync({ quality: 0.7 });
        if (!res.canceled && res.assets[0]) await doUpload(type, res.assets[0]);
      } else {
        const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
        if (!res.canceled && res.assets[0]) await doUpload(type, res.assets[0]);
      }
    } catch {
      toast.error(t('driver.uploadFailed'));
    }
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      await api.driver.submitForReview();
      await refreshDriver();
      toast.success(t('driver.statusUnderReview'));
    } catch (e) {
      toast.error(e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const barWidth = bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <>
      <ScrollView style={s.safe} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>{t('driver.verifyAccount')}</Text>
        <Text style={s.intro}>{t('driver.verifyIntro')}</Text>

        {/* Progress */}
        <View style={s.progressWrap}>
          <View style={s.progressHead}>
            <Text style={s.progressText}>{doneSteps} / {totalSteps}</Text>
            {status === 'approved' && <Text style={s.verified}>{t('driver.accountVerified')}</Text>}
          </View>
          <View style={s.progressTrack}>
            <Animated.View style={[s.progressFill, { width: barWidth }]} />
          </View>
        </View>

        {/* Documents */}
        <Text style={s.section}>{t('driver.requiredDocs')}</Text>
        {DOCS.map((doc) => {
          const existing = statusOf(doc.type);
          const preview = previews[doc.type];
          const badge = existing?.status === 'approved' ? { text: t('driver.docApproved'), color: theme.colors.success, icon: 'check-circle' as IconName }
            : existing?.status === 'rejected' ? { text: t('driver.docRejected'), color: theme.colors.danger, icon: 'x-circle' as IconName }
            : existing ? { text: t('driver.docUnderReview'), color: theme.colors.warning, icon: 'clock' as IconName }
            : { text: t('driver.docNotUploaded'), color: theme.colors.muted, icon: 'upload-cloud' as IconName };
          return (
            <Card key={doc.type} style={{ marginBottom: theme.spacing.sm }}>
              <View style={s.row}>
                <View style={s.thumb}>
                  {preview ? (
                    <Image source={{ uri: preview }} style={s.thumbImg} />
                  ) : (
                    <Icon name={existing ? 'check' : (DOC_ICON[doc.type] ?? 'file-text')} size={22} color={existing ? theme.colors.success : theme.colors.muted} />
                  )}
                </View>
                <View style={s.rowInfo}>
                  <Text style={s.rowLabel}>{doc.label}</Text>
                  <View style={s.badgeRow}>
                    <Icon name={badge.icon} size={13} color={badge.color} />
                    <Text style={[s.rowBadge, { color: badge.color }]}>{badge.text}</Text>
                  </View>
                  {existing?.status === 'rejected' && existing.review_note ? <Text style={s.note}>{existing.review_note}</Text> : null}
                </View>
                <Pressable style={s.uploadBtn} onPress={() => setPickerFor(doc.type)} disabled={uploading === doc.type}>
                  <Icon name="camera" size={15} color={theme.colors.onPrimary} />
                  <Text style={s.uploadText}>{uploading === doc.type ? '...' : existing ? t('driver.change') : t('driver.upload')}</Text>
                </Pressable>
              </View>
            </Card>
          );
        })}

        {/* Vehicle */}
        <Text style={s.section}>{t('driver.vehicle')}</Text>
        <Pressable onPress={() => router.push('/(app)/vehicle')}>
          <Card>
            <View style={s.row}>
              <View style={[s.thumb, hasVehicle && { backgroundColor: theme.colors.successSoft }]}>
                <Icon name={hasVehicle ? 'check' : 'truck'} size={22} color={hasVehicle ? theme.colors.success : theme.colors.muted} />
              </View>
              <View style={s.rowInfo}>
                <Text style={s.rowLabel}>{hasVehicle ? t('driver.vehicleReady') : t('driver.noVehicle')}</Text>
                {!hasVehicle && <Text style={[s.rowBadge, { color: theme.colors.primary, marginTop: 4 }]}>{t('driver.addVehicleCta')}</Text>}
              </View>
              <Icon name="chevron-left" size={20} color={theme.colors.muted} />
            </View>
          </Card>
        </Pressable>

        {/* Bottom guidance / submit */}
        <View style={{ marginTop: theme.spacing.lg }}>
          {status === 'approved' ? null : status === 'under_review' ? (
            <View style={s.infoBox}>
              <Icon name="clock" size={16} color={theme.colors.warning} />
              <Text style={s.infoText}>{t('driver.statusUnderReview')}</Text>
            </View>
          ) : canSubmit ? (
            <Button title={t('driver.readyToSubmit')} variant="positive" icon="send" onPress={submit} loading={submitting} />
          ) : (
            <View style={s.infoBox}>
              <Icon name="info" size={16} color={theme.colors.textSecondary} />
              <Text style={s.infoText}>{t('driver.completeDocsFirst')}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Camera / gallery chooser */}
      <Sheet visible={pickerFor !== null} onClose={() => setPickerFor(null)} title={t('driver.chooseSource')}>
        <Pressable style={s.sourceRow} onPress={() => pickFrom('camera')}>
          <View style={s.sourceIcon}><Icon name="camera" size={22} color={theme.colors.primary} /></View>
          <Text style={s.sourceText}>{t('driver.takePhoto')}</Text>
        </Pressable>
        <Pressable style={s.sourceRow} onPress={() => pickFrom('gallery')}>
          <View style={s.sourceIcon}><Icon name="image" size={22} color={theme.colors.primary} /></View>
          <Text style={s.sourceText}>{t('driver.fromGallery')}</Text>
        </Pressable>
      </Sheet>
    </>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colors.background },
    content: { padding: t.spacing.lg, paddingBottom: t.spacing['3xl'] },
    title: { fontFamily: t.fontFamily.extrabold, fontSize: 24, color: t.colors.text, textAlign: 'right' },
    intro: { fontFamily: t.fontFamily.regular, fontSize: 14, color: t.colors.textSecondary, textAlign: 'right', marginTop: 4, marginBottom: t.spacing.lg, lineHeight: 22 },

    progressWrap: { marginBottom: t.spacing.lg },
    progressHead: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    progressText: { fontFamily: t.fontFamily.extrabold, fontSize: 15, color: t.colors.text },
    verified: { fontFamily: t.fontFamily.bold, fontSize: 13, color: t.colors.success },
    progressTrack: { height: 8, borderRadius: 4, backgroundColor: t.colors.hairline, overflow: 'hidden' },
    progressFill: { height: 8, borderRadius: 4, backgroundColor: t.colors.accent },

    section: { fontFamily: t.fontFamily.bold, fontSize: 14, color: t.colors.textSecondary, textAlign: 'right', marginTop: t.spacing.base, marginBottom: t.spacing.sm },
    row: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.md },
    thumb: { width: 52, height: 52, borderRadius: t.radius.md, backgroundColor: t.colors.hairline, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    thumbImg: { width: 52, height: 52 },
    rowInfo: { flex: 1, alignItems: 'flex-end' },
    rowLabel: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.text, textAlign: 'right' },
    badgeRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 4 },
    rowBadge: { fontFamily: t.fontFamily.medium, fontSize: 12 },
    note: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.danger, marginTop: 4, textAlign: 'right' },
    uploadBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, backgroundColor: t.colors.primary, paddingVertical: 9, paddingHorizontal: 14, borderRadius: t.radius.md },
    uploadText: { color: t.colors.onPrimary, fontFamily: t.fontFamily.bold, fontSize: 13 },

    infoBox: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, backgroundColor: t.colors.hairline, borderRadius: t.radius.md, padding: t.spacing.md },
    infoText: { flex: 1, fontFamily: t.fontFamily.medium, fontSize: 13, color: t.colors.textSecondary, textAlign: 'right' },

    sourceRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.md, paddingVertical: t.spacing.md },
    sourceIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: t.colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
    sourceText: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.text },
  });
