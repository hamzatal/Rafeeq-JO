import { useEffect, useMemo, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { EmergencyContact, EmergencyRelation } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { Banner } from '../../src/components/Banner';
import { Card, EmptyState, Badge } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { useI18n } from '../../src/i18n';
import { api } from '../../src/lib/api';
import { useTheme, type AppTheme } from '../../src/theme';

const RELATIONS: EmergencyRelation[] = ['parent', 'sibling', 'spouse', 'relative', 'friend', 'other'];

/**
 * Best-effort current location. Uses expo-location on native, the browser
 * geolocation API on web. Returns null silently if unavailable — an SOS must
 * still go out without coordinates.
 */
async function getCurrentLocation(): Promise<{ lat: number; lng: number } | null> {
  try {
    if (Platform.OS === 'web') {
      if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
      return await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 8000 },
        );
      });
    }
    // Native: load expo-location lazily so a missing module never crashes the screen.
    const Location = await import('expo-location');
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({});
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}

export default function Emergency() {
  const { t } = useI18n();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);

  // SOS state
  const [arming, setArming] = useState(false);
  const [sending, setSending] = useState(false);
  const [sosMsg, setSosMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Contact form state
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EmergencyContact | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relation, setRelation] = useState<EmergencyRelation>('parent');
  const [notifyOnSos, setNotifyOnSos] = useState(true);
  const [busy, setBusy] = useState(false);
  const [formMsg, setFormMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const primary = useMemo(() => contacts.find((c) => c.is_primary) ?? contacts[0] ?? null, [contacts]);

  const load = async () => {
    try {
      setContacts(await api.emergency.listContacts());
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setEditing(null);
    setName('');
    setPhone('');
    setRelation('parent');
    setNotifyOnSos(true);
    setFormMsg(null);
  };

  const openAdd = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (c: EmergencyContact) => {
    setEditing(c);
    setName(c.name);
    setPhone(c.phone);
    setRelation(c.relation ?? 'other');
    setNotifyOnSos(c.notify_on_sos);
    setFormMsg(null);
    setShowForm(true);
  };

  const triggerSos = async () => {
    setSending(true);
    setSosMsg(null);
    try {
      const loc = await getCurrentLocation();
      await api.emergency.triggerSos({ lat: loc?.lat ?? null, lng: loc?.lng ?? null });
      setSosMsg({ text: t('emergency.sosSent'), ok: true });
      setArming(false);
      // Offer to call the primary guardian immediately.
      if (primary) Linking.openURL(`tel:${primary.phone}`).catch(() => undefined);
    } catch (e) {
      setSosMsg({ text: e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('emergency.sosFailed'), ok: false });
    } finally {
      setSending(false);
    }
  };

  const submit = async () => {
    if (name.trim().length < 2 || phone.trim().length < 6) {
      setFormMsg({ text: t('emergency.invalid'), ok: false });
      return;
    }
    setBusy(true);
    setFormMsg(null);
    try {
      if (editing) {
        await api.emergency.updateContact(editing.id, { name, phone, relation, notify_on_sos: notifyOnSos });
        setFormMsg({ text: t('emergency.updated'), ok: true });
      } else {
        await api.emergency.addContact({ name, phone, relation, notify_on_sos: notifyOnSos });
        setFormMsg({ text: t('emergency.added'), ok: true });
      }
      resetForm();
      setShowForm(false);
      await load();
    } catch (e) {
      setFormMsg({ text: e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('emergency.saveFailed'), ok: false });
    } finally {
      setBusy(false);
    }
  };

  const makePrimary = async (c: EmergencyContact) => {
    try {
      await api.emergency.updateContact(c.id, { is_primary: true });
      await load();
    } catch {
      /* silent */
    }
  };

  const remove = async (c: EmergencyContact) => {
    try {
      await api.emergency.deleteContact(c.id);
      await load();
    } catch {
      /* silent */
    }
  };

  const relationLabel = (r: EmergencyRelation | null) =>
    r ? t(`emergency.relation.${r}`) : t('emergency.relation.other');

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.h1}>{t('emergency.title')}</Text>
          <Pressable onPress={() => (showForm ? (setShowForm(false), resetForm()) : openAdd())} style={s.addBtn}>
            <Icon name={showForm ? 'x' : 'plus'} size={18} color={theme.colors.onPrimary} />
          </Pressable>
        </View>

        <Text style={s.intro}>{t('emergency.intro')}</Text>
        {sosMsg && <Banner message={sosMsg.text} variant={sosMsg.ok ? 'success' : 'error'} />}

        {/* ── SOS panel ─────────────────────────────────────────────── */}
        <View style={s.sosCard}>
          <View style={s.sosIcon}>
            <Icon name="alert-triangle" size={30} color={theme.colors.onPrimary} />
          </View>
          <Text style={s.sosTitle}>{t('emergency.sosTitle')}</Text>
          <Text style={s.sosHint}>{t('emergency.sosHint')}</Text>

          {!arming ? (
            <Pressable onPress={() => setArming(true)} style={({ pressed }) => [s.sosBtn, pressed && s.pressed]}>
              <Text style={s.sosBtnText}>{t('emergency.sosButton')}</Text>
            </Pressable>
          ) : (
            <View style={s.confirmRow}>
              <Pressable
                onPress={triggerSos}
                disabled={sending}
                style={({ pressed }) => [s.confirmBtn, pressed && s.pressed, sending && s.disabled]}
              >
                <Text style={s.sosBtnText}>{sending ? t('emergency.sending') : t('emergency.confirmSend')}</Text>
              </Pressable>
              <Pressable onPress={() => setArming(false)} style={({ pressed }) => [s.cancelBtn, pressed && s.pressed]}>
                <Text style={s.cancelText}>{t('common.cancel')}</Text>
              </Pressable>
            </View>
          )}

          {primary && (
            <Pressable onPress={() => Linking.openURL(`tel:${primary.phone}`)} style={s.callPrimary}>
              <Icon name="phone-call" size={16} color={theme.colors.onPrimary} />
              <Text style={s.callPrimaryText}>{t('emergency.callPrimary')} {primary.name}</Text>
            </Pressable>
          )}
        </View>

        {/* ── Add / edit form ───────────────────────────────────────── */}
        {showForm && (
          <Card>
            <Text style={s.formTitle}>{editing ? t('emergency.editContact') : t('emergency.addContact')}</Text>
            {formMsg && <Banner message={formMsg.text} variant={formMsg.ok ? 'success' : 'error'} />}
            <Input label={t('emergency.name')} value={name} onChangeText={setName} />
            <Input
              label={t('emergency.phone')}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="07XXXXXXXX"
            />
            <Text style={s.fieldLabel}>{t('emergency.relationLabel')}</Text>
            <View style={s.chips}>
              {RELATIONS.map((r) => (
                <Pressable key={r} onPress={() => setRelation(r)} style={[s.chip, relation === r && s.chipActive]}>
                  <Text style={[s.chipText, relation === r && s.chipTextActive]}>{t(`emergency.relation.${r}`)}</Text>
                </Pressable>
              ))}
            </View>
            <View style={s.switchRow}>
              <Text style={s.switchLabel}>{t('emergency.notifyOnSos')}</Text>
              <Switch
                value={notifyOnSos}
                onValueChange={setNotifyOnSos}
                trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
                thumbColor={theme.colors.surface}
              />
            </View>
            <Button title={t('common.save')} onPress={submit} loading={busy} />
          </Card>
        )}

        {/* ── Contacts list ─────────────────────────────────────────── */}
        <Text style={s.section}>{t('emergency.contactsTitle')}</Text>
        {!loading && contacts.length === 0 ? (
          <EmptyState icon="users" title={t('emergency.noContacts')} hint={t('emergency.noContactsHint')} />
        ) : (
          contacts.map((c) => (
            <Card key={c.id}>
              <View style={s.row}>
                <Text style={s.cardTitle} numberOfLines={1}>{c.name}</Text>
                {c.is_primary && <Badge label={t('emergency.primary')} tone="success" />}
              </View>
              <Text style={s.meta}>{relationLabel(c.relation)} · {c.phone}</Text>
              {!c.notify_on_sos && <Text style={s.metaMuted}>{t('emergency.sosOff')}</Text>}
              <View style={s.actions}>
                <Pressable onPress={() => Linking.openURL(`tel:${c.phone}`)} style={s.actionBtn}>
                  <Icon name="phone" size={16} color={theme.colors.primary} />
                  <Text style={s.actionText}>{t('emergency.call')}</Text>
                </Pressable>
                <Pressable onPress={() => Linking.openURL(`sms:${c.phone}`)} style={s.actionBtn}>
                  <Icon name="message-square" size={16} color={theme.colors.primary} />
                  <Text style={s.actionText}>{t('emergency.sms')}</Text>
                </Pressable>
                {!c.is_primary && (
                  <Pressable onPress={() => makePrimary(c)} style={s.actionBtn}>
                    <Icon name="star" size={16} color={theme.colors.warning} />
                    <Text style={s.actionText}>{t('emergency.setPrimary')}</Text>
                  </Pressable>
                )}
                <Pressable onPress={() => openEdit(c)} style={s.actionBtn}>
                  <Icon name="edit-2" size={16} color={theme.colors.textSecondary} />
                  <Text style={s.actionText}>{t('common.edit')}</Text>
                </Pressable>
                <Pressable onPress={() => remove(c)} style={s.actionBtn}>
                  <Icon name="trash-2" size={16} color={theme.colors.danger} />
                  <Text style={[s.actionText, { color: theme.colors.danger }]}>{t('common.delete')}</Text>
                </Pressable>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colors.background },
    content: { padding: t.spacing.lg, paddingBottom: t.spacing['3xl'] },
    header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: t.spacing.sm },
    h1: { fontFamily: t.fontFamily.extrabold, fontSize: 26, color: t.colors.text, textAlign: 'right' },
    addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center' },
    intro: { fontFamily: t.fontFamily.regular, fontSize: 13, color: t.colors.textSecondary, textAlign: 'right', marginBottom: t.spacing.base, lineHeight: 20 },

    sosCard: { backgroundColor: t.colors.danger, borderRadius: t.radius.xl, padding: t.spacing.lg, alignItems: 'center', marginBottom: t.spacing.lg, ...t.shadow.md },
    sosIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: t.spacing.sm },
    sosTitle: { fontFamily: t.fontFamily.extrabold, fontSize: 20, color: t.colors.onPrimary, textAlign: 'center' },
    sosHint: { fontFamily: t.fontFamily.regular, fontSize: 13, color: t.colors.onPrimary, opacity: 0.9, textAlign: 'center', marginTop: 4, marginBottom: t.spacing.base, lineHeight: 19 },
    sosBtn: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: t.radius.lg, paddingVertical: 14, paddingHorizontal: 40, width: '100%', alignItems: 'center' },
    sosBtnText: { fontFamily: t.fontFamily.extrabold, fontSize: 16, color: t.colors.danger },
    confirmRow: { flexDirection: 'row-reverse', gap: t.spacing.sm, width: '100%' },
    confirmBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: t.radius.lg, paddingVertical: 14, alignItems: 'center' },
    cancelBtn: { flex: 1, borderRadius: t.radius.lg, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.7)' },
    cancelText: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.onPrimary },
    callPrimary: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginTop: t.spacing.base, paddingVertical: 8 },
    callPrimaryText: { fontFamily: t.fontFamily.bold, fontSize: 14, color: t.colors.onPrimary, textDecorationLine: 'underline' },
    pressed: { opacity: 0.85 },
    disabled: { opacity: 0.6 },

    formTitle: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.text, textAlign: 'right', marginBottom: t.spacing.sm },
    fieldLabel: { fontFamily: t.fontFamily.medium, fontSize: 14, color: t.colors.text, textAlign: 'right', marginBottom: t.spacing.xs },
    chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: t.spacing.sm, marginBottom: t.spacing.base },
    chip: { paddingHorizontal: t.spacing.base, paddingVertical: 6, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.border, backgroundColor: t.colors.surface },
    chipActive: { borderColor: t.colors.primary, backgroundColor: t.colors.primarySoft },
    chipText: { fontFamily: t.fontFamily.medium, fontSize: 12, color: t.colors.text },
    chipTextActive: { color: t.colors.primary, fontFamily: t.fontFamily.bold },
    switchRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: t.spacing.base },
    switchLabel: { fontFamily: t.fontFamily.medium, fontSize: 14, color: t.colors.text, textAlign: 'right', flex: 1 },

    section: { fontFamily: t.fontFamily.bold, fontSize: 17, color: t.colors.text, textAlign: 'right', marginTop: t.spacing.base, marginBottom: t.spacing.base },
    row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.text, flex: 1, textAlign: 'right' },
    meta: { fontFamily: t.fontFamily.regular, fontSize: 13, color: t.colors.textSecondary, textAlign: 'right', marginTop: 2 },
    metaMuted: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.muted, textAlign: 'right', marginTop: 2 },
    actions: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: t.spacing.base, marginTop: t.spacing.md, borderTopWidth: 1, borderTopColor: t.colors.border, paddingTop: t.spacing.md },
    actionBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5 },
    actionText: { fontFamily: t.fontFamily.medium, fontSize: 12, color: t.colors.text },
  });
