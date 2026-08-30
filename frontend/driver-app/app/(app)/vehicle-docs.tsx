import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { validateForm, validators, type DocumentType } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import {
  Banner,
  Button,
  Card,
  Icon,
  Input,
  isPicked,
  pickImage,
  Sheet,
  Text,
  useConfirm,
  useTheme,
  useToast,
  type AppTheme,
  type IconName,
} from '@rafeeq/ui';
import { useI18n } from '../../src/i18n';
import { useAuth } from '../../src/store/auth';
import { api } from '../../src/lib/api';

/* ═══════════════════════════════════════════════════════════════════════════
   مركبتي ووثائقي — one screen, per design screen 31.

   ── Why these two were always one thing ────────────────────────────────────

   `documents.tsx` already modelled the vehicle as step 4 of 4 in its own progress
   bar, and then linked out to `vehicle.tsx` to collect it. So the screen knew the
   vehicle was part of the same task and still handed it to another route — which had
   no header, no title and no way back except the gesture, because it was only ever
   meant to be pushed.

   The vehicle had THREE inbound links (documents, profile, settings) and the
   dashboard added a fourth for pending captains. Four doors, one form.

   ── What is new here, from roadmap 9.5 ─────────────────────────────────────

   Editing and DELETING a vehicle. There was no way to correct a typo in a plate
   number: the only operation was `addVehicle`, so a captain who mistyped their plate
   had a permanent second vehicle in their profile and a trip that would not start
   because the plate on file did not match the car.
   ═══════════════════════════════════════════════════════════════════════════ */

const DOC_ICON: Partial<Record<DocumentType, IconName>> = {
  national_id: 'credit-card',
  license: 'file-text',
  photo: 'user',
};

const EMPTY_FORM = { make: '', model: '', year: '', color: '', plate: '', seats: '4' };

export default function VehicleAndDocuments() {
  const { t } = useI18n();
  const theme = useTheme();
  const router = useRouter();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const toast = useToast();
  const confirm = useConfirm();
  const driver = useAuth((a) => a.driver);
  const refreshDriver = useAuth((a) => a.refreshDriver);

  const [uploading, setUploading] = useState<DocumentType | null>(null);
  const [pickerFor, setPickerFor] = useState<DocumentType | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const DOCS: { type: DocumentType; label: string }[] = [
    { type: 'national_id', label: t('driver.docNationalId') },
    { type: 'license', label: t('driver.docLicense') },
    { type: 'photo', label: t('driver.docPhoto') },
  ];

  const statusOf = (type: DocumentType) => driver?.documents?.find((d) => d.type === type);
  const uploadedCount = DOCS.filter((d) => statusOf(d.type)).length;
  const vehicles = driver?.vehicles ?? [];
  const hasVehicle = vehicles.length > 0;
  const totalSteps = DOCS.length + 1;
  const doneSteps = uploadedCount + (hasVehicle ? 1 : 0);
  const progress = doneSteps / totalSteps;
  const status = driver?.status ?? 'pending';
  const canSubmit = (status === 'pending' || status === 'rejected') && uploadedCount === DOCS.length && hasVehicle;

  const bar = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(bar, { toValue: progress, duration: 500, useNativeDriver: false }).start();
  }, [progress, bar]);
  const barWidth = bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  /*
   * One picker for the whole app.
   *
   * This screen used to carry 48 lines of bespoke `expo-image-picker` handling — a
   * STATIC import, its own camera-permission request, its own web/native Blob
   * construction — while `invoices.tsx` used the shared `pickProof()` two files away.
   * Two image-picking code paths in one app, and only one of them asked for camera
   * permission or handled the web case.
   */
  const upload = async (type: DocumentType, source: 'camera' | 'gallery') => {
    setPickerFor(null);
    const picked = await pickImage({ source, quality: 0.7, name: type });
    /*
     * A refused permission is not the same as a cancellation, and this used to say
     * nothing for either. `pickImage` reports which, so the captain finds out that the
     * OS is blocking the camera rather than concluding the button is broken.
     */
    if (!isPicked(picked)) {
      if (picked === 'permission-denied') toast.error(t('driver.camPermission'));
      else if (picked === 'unavailable') toast.error(t('driver.uploadFailed'));

      return;
    }

    setUploading(type);
    setPreviews((p) => ({ ...p, [type]: picked.uri }));
    try {
      await api.driver.uploadDocument(type, picked.file);
      await refreshDriver();
      toast.success(t('driver.uploaded'));
    } catch (e) {
      toast.error(e instanceof RafeeqApiError ? (e.firstError() ?? e.message) : t('driver.uploadFailed'));
    } finally {
      setUploading(null);
    }
  };

  const submitForReview = async () => {
    setSubmitting(true);
    try {
      await api.driver.submitForReview();
      await refreshDriver();
      toast.success(t('driver.statusUnderReview'));
    } catch (e) {
      toast.error(e instanceof RafeeqApiError ? (e.firstError() ?? e.message) : t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const openForm = (id?: string) => {
    const existing = id ? vehicles.find((v) => v.id === id) : undefined;
    setEditingId(existing?.id ?? null);
    setForm(
      existing
        ? {
            make: existing.make ?? '',
            model: existing.model ?? '',
            year: String(existing.year ?? ''),
            color: existing.color ?? '',
            plate: existing.plate_number ?? '',
            seats: String(existing.seats ?? 4),
          }
        : { ...EMPTY_FORM },
    );
    setErrors({});
    setFormError(null);
    setShowForm(true);
  };

  const saveVehicle = async () => {
    setFormError(null);
    const { valid, errors: e } = validateForm({
      make: () => validators.required(form.make),
      model: () => validators.required(form.model),
      year: () => validators.year(Number(form.year)),
      color: () => validators.required(form.color),
      plate: () => validators.plateNumber(form.plate),
    });
    setErrors(e);
    if (!valid) return;

    const payload = {
      make: form.make.trim(),
      model: form.model.trim(),
      year: Number(form.year),
      color: form.color.trim(),
      plate_number: form.plate.trim(),
      seats: Number(form.seats) || 4,
    };

    setSaving(true);
    try {
      if (editingId) await api.driver.updateVehicle(editingId, payload);
      else await api.driver.addVehicle(payload);
      await refreshDriver();
      toast.success(t(editingId ? 'driver.vehicleUpdated' : 'driver.vehicleAdded'));
      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof RafeeqApiError ? (err.firstError() ?? err.message) : t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const removeVehicle = async (id: string, label: string) => {
    const ok = await confirm({
      title: t('driver.deleteVehicleTitle'),
      message: `${t('driver.deleteVehicleMsg')} ${label}`,
      confirmLabel: t('driver.deleteVehicle'),
      cancelLabel: t('common.cancel'),
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await api.driver.deleteVehicle(id);
      await refreshDriver();
      toast.success(t('driver.vehicleDeleted'));
    } catch (e) {
      toast.error(e instanceof RafeeqApiError ? (e.firstError() ?? e.message) : t('common.error'));
    }
  };

  return (
    <>
      <ScrollView style={s.safe} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.back')}
            style={s.backBtn}
          >
            <Icon name="chevron-right" size={24} color={theme.colors.primary} />
          </Pressable>
          <Text role="titleLg" tone="primary">{t('driver.vehicleAndDocs')}</Text>
          <View style={s.backBtn} />
        </View>

        <Text role="body" tone="secondary" style={s.intro}>{t('driver.verifyIntro')}</Text>

        {/* Progress — the vehicle IS the fourth step, which is why it lives here. */}
        <View style={s.progressWrap}>
          <View style={s.progressHead}>
            <Text role="titleSm">{doneSteps} / {totalSteps}</Text>
            {status === 'approved' ? <Text role="label" tone="success">{t('driver.accountVerified')}</Text> : null}
          </View>
          <View style={s.progressTrack}>
            <Animated.View style={[s.progressFill, { width: barWidth }]} />
          </View>
        </View>

        {/* ── The vehicle ───────────────────────────────────────────────────── */}
        <View style={s.sectionRow}>
          <Text role="titleSm" tone="secondary">{t('driver.vehicle')}</Text>
          <Pressable onPress={() => openForm()} hitSlop={8} accessibilityRole="button" style={s.addBtn}>
            <Icon name="plus" size={14} color={theme.colors.primary} />
            <Text role="label" tone="primary">{t('driver.addVehicle')}</Text>
          </Pressable>
        </View>

        {vehicles.length === 0 ? (
          <Pressable onPress={() => openForm()} accessibilityRole="button">
            <Card>
              <View style={s.row}>
                <View style={s.thumb}>
                  <Icon name="truck" size={22} color={theme.colors.muted} />
                </View>
                <View style={s.rowInfo}>
                  <Text role="titleSm">{t('driver.noVehicle')}</Text>
                  <Text role="label" tone="primary" style={s.gap4}>{t('driver.addVehicleCta')}</Text>
                </View>
                <Icon name="chevron-left" size={20} color={theme.colors.muted} />
              </View>
            </Card>
          </Pressable>
        ) : (
          vehicles.map((v) => (
            <Card key={v.id} style={s.cardGap}>
              <View style={s.row}>
                <View style={[s.thumb, s.thumbOk]}>
                  <Icon name="truck" size={22} color={theme.colors.success} />
                </View>
                <View style={s.rowInfo}>
                  <Text role="titleSm">{v.make} {v.model} ({v.year})</Text>
                  <Text role="body" tone="secondary" style={s.gap2}>
                    {v.plate_number} · {v.color} · {v.seats} {t('driver.seatsWord')}
                  </Text>
                </View>
              </View>
              {/*
                Editing and deleting, which did not exist. The only operation was
                `addVehicle`, so a mistyped plate was permanent — and a trip will not
                start with a car whose plate is not the authorised one.
              */}
              <View style={s.vehicleActions}>
                <Pressable
                  onPress={() => openForm(v.id)}
                  accessibilityRole="button"
                  accessibilityLabel={t('driver.editVehicle')}
                  style={({ pressed }) => [s.vehicleAction, pressed && s.pressed]}
                >
                  <Icon name="pencil" size={15} color={theme.colors.primary} />
                  <Text role="label" tone="primary">{t('driver.editVehicle')}</Text>
                </Pressable>
                <Pressable
                  onPress={() => void removeVehicle(v.id, `${v.make} ${v.model}`)}
                  accessibilityRole="button"
                  accessibilityLabel={t('driver.deleteVehicle')}
                  style={({ pressed }) => [s.vehicleAction, s.vehicleActionDanger, pressed && s.pressed]}
                >
                  <Icon name="trash-2" size={15} color={theme.colors.danger} />
                  <Text role="label" tone="danger">{t('driver.deleteVehicle')}</Text>
                </Pressable>
              </View>
            </Card>
          ))
        )}

        {/* ── The documents ─────────────────────────────────────────────────── */}
        <Text role="titleSm" tone="secondary" style={s.section}>{t('driver.requiredDocs')}</Text>
        {DOCS.map((doc) => {
          const existing = statusOf(doc.type);
          const preview = previews[doc.type];
          const badge =
            existing?.status === 'approved'
              ? { text: t('driver.docApproved'), tone: 'success' as const, icon: 'circle-check' as IconName }
              : existing?.status === 'rejected'
                ? { text: t('driver.docRejected'), tone: 'danger' as const, icon: 'circle-x' as IconName }
                : existing
                  ? { text: t('driver.docUnderReview'), tone: 'warning' as const, icon: 'clock' as IconName }
                  : { text: t('driver.docNotUploaded'), tone: 'muted' as const, icon: 'cloud-upload' as IconName };
          const badgeColor = {
            success: theme.colors.success,
            danger: theme.colors.danger,
            warning: theme.colors.warning,
            muted: theme.colors.muted,
          }[badge.tone];

          return (
            <Card key={doc.type} style={s.cardGap}>
              <View style={s.row}>
                <View style={s.thumb}>
                  {preview ? (
                    <Image source={{ uri: preview }} style={s.thumbImg} accessibilityIgnoresInvertColors />
                  ) : (
                    <Icon
                      name={existing ? 'check' : (DOC_ICON[doc.type] ?? 'file-text')}
                      size={22}
                      color={existing ? theme.colors.success : theme.colors.muted}
                    />
                  )}
                </View>
                <View style={s.rowInfo}>
                  <Text role="titleSm">{doc.label}</Text>
                  <View style={s.badgeRow}>
                    <Icon name={badge.icon} size={13} color={badgeColor} />
                    <Text role="label" tone={badge.tone}>{badge.text}</Text>
                  </View>
                  {existing?.status === 'rejected' && existing.review_note ? (
                    <Text role="label" tone="danger" style={s.gap4}>{existing.review_note}</Text>
                  ) : null}
                </View>
                <Pressable
                  style={s.uploadBtn}
                  onPress={() => setPickerFor(doc.type)}
                  disabled={uploading === doc.type}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: uploading === doc.type, busy: uploading === doc.type }}
                >
                  <Icon name="camera" size={15} color={theme.colors.onPrimary} />
                  <Text role="label" tone="inverse">
                    {uploading === doc.type ? t('common.loading') : existing ? t('driver.change') : t('driver.upload')}
                  </Text>
                </Pressable>
              </View>
            </Card>
          );
        })}

        {/* Privacy note — the documents are the most sensitive thing a captain gives us. */}
        <View style={s.infoBox}>
          <Icon name="lock" size={16} color={theme.colors.textSecondary} />
          <Text role="label" tone="secondary" style={s.flex}>{t('driver.docsPrivacyNote')}</Text>
        </View>

        <View style={s.footer}>
          {status === 'approved' ? null : status === 'under_review' ? (
            <View style={s.infoBox}>
              <Icon name="clock" size={16} color={theme.colors.warning} />
              <Text role="label" tone="secondary" style={s.flex}>{t('driver.statusUnderReview')}</Text>
            </View>
          ) : canSubmit ? (
            <Button title={t('driver.readyToSubmit')} variant="positive" icon="send" onPress={submitForReview} loading={submitting} />
          ) : (
            <View style={s.infoBox}>
              <Icon name="info" size={16} color={theme.colors.textSecondary} />
              <Text role="label" tone="secondary" style={s.flex}>{t('driver.completeDocsFirst')}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Camera / gallery chooser */}
      <Sheet visible={pickerFor !== null} onClose={() => setPickerFor(null)} title={t('driver.chooseSource')}>
        {(['camera', 'gallery'] as const).map((source) => (
          <Pressable
            key={source}
            style={s.sourceRow}
            accessibilityRole="button"
            onPress={() => void upload(pickerFor!, source)}
          >
            <View style={s.sourceIcon}>
              <Icon name={source === 'camera' ? 'camera' : 'image'} size={22} color={theme.colors.primary} />
            </View>
            <Text role="titleMd">{t(source === 'camera' ? 'driver.takePhoto' : 'driver.fromGallery')}</Text>
          </Pressable>
        ))}
      </Sheet>

      {/* Add / edit the vehicle — a sheet, so the form no longer needs its own route. */}
      <Sheet
        visible={showForm}
        onClose={() => setShowForm(false)}
        title={t(editingId ? 'driver.editVehicle' : 'driver.addVehicle')}
      >
        <Banner message={formError} variant="error" />
        <Input label={t('driver.make')} value={form.make} onChangeText={(v) => setForm((p) => ({ ...p, make: v }))} error={errors.make} />
        <Input label={t('driver.model')} value={form.model} onChangeText={(v) => setForm((p) => ({ ...p, model: v }))} error={errors.model} />
        <Input label={t('driver.year')} value={form.year} onChangeText={(v) => setForm((p) => ({ ...p, year: v }))} error={errors.year} keyboardType="number-pad" />
        <Input label={t('driver.color')} value={form.color} onChangeText={(v) => setForm((p) => ({ ...p, color: v }))} error={errors.color} />
        <Input label={t('driver.plate')} value={form.plate} onChangeText={(v) => setForm((p) => ({ ...p, plate: v }))} error={errors.plate} />
        <Input label={t('driver.seats')} value={form.seats} onChangeText={(v) => setForm((p) => ({ ...p, seats: v }))} keyboardType="number-pad" />
        <Button title={t('common.save')} onPress={saveVehicle} loading={saving} />
      </Sheet>
    </>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colors.background },
    content: { padding: t.spacing.lg, paddingBottom: t.spacing['3xl'] },
    header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: t.spacing.sm },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    intro: { marginBottom: t.spacing.lg },
    flex: { flex: 1 },
    gap2: { marginTop: 2 },
    gap4: { marginTop: 4 },
    cardGap: { marginBottom: t.spacing.sm },

    progressWrap: { marginBottom: t.spacing.lg },
    progressHead: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    progressTrack: { height: 8, borderRadius: 4, backgroundColor: t.colors.hairline, overflow: 'hidden' },
    progressFill: { height: 8, borderRadius: 4, backgroundColor: t.colors.accent },

    section: { marginTop: t.spacing.base, marginBottom: t.spacing.sm },
    sectionRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginTop: t.spacing.base, marginBottom: t.spacing.sm },
    addBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: t.radius.pill, backgroundColor: t.colors.primarySoft },

    row: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.md },
    rowInfo: { flex: 1, alignItems: 'flex-end' },
    thumb: { width: 52, height: 52, borderRadius: t.radius.control, backgroundColor: t.colors.hairline, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    thumbOk: { backgroundColor: t.colors.successSoft },
    thumbImg: { width: 52, height: 52 },
    badgeRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 4 },
    uploadBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, backgroundColor: t.colors.primary, paddingVertical: 9, paddingHorizontal: 14, borderRadius: t.radius.control, minHeight: 44 },

    vehicleActions: { flexDirection: 'row-reverse', gap: t.spacing.sm, marginTop: t.spacing.md, paddingTop: t.spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.colors.hairline },
    vehicleAction: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, borderRadius: t.radius.control, borderWidth: 1, borderColor: t.colors.primary },
    vehicleActionDanger: { borderColor: t.colors.danger },

    infoBox: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, backgroundColor: t.colors.hairline, borderRadius: t.radius.control, padding: t.spacing.md, marginTop: t.spacing.md },
    footer: { marginTop: t.spacing.lg },

    sourceRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.md, paddingVertical: t.spacing.md },
    sourceIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: t.colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
    pressed: { opacity: 0.85 },
  });
