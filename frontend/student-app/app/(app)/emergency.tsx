import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { EmergencyContact, EmergencyRelation } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import {
  Badge,
  Banner,
  Button,
  Card,
  EmptyState,
  Icon,
  Input,
  ListState,
  listLabels,
  statusFromError,
  Text,
  useConfirm,
  useTheme,
  useToast,
  type AppTheme,
  type ListStatus,
} from '@rafeeq/ui';
import { useI18n } from '../../src/i18n';
import { api } from '../../src/lib/api';

/* ═══════════════════════════════════════════════════════════════════════════
   EMERGENCY CONTACTS — and the sentence this screen was missing.

   ── What moved out ─────────────────────────────────────────────────────────

   The SOS trigger. It was a red card here, behind a two-step arm-then-confirm
   flow, on a screen reachable only from the profile tab — so the control that
   matters when a student is frightened was three taps and a scroll away from the
   thing they were doing.

   It is now the red shield on `home`, present the whole time a ride is, which is
   what `docs/design/SCREENS.md` means by «زرّ استغاثة ظاهر دائماً». What stays here
   is the part that needs a form: who gets called.

   With the trigger went ~120 lines: the `arming` state, the confirm row, the
   `sending` flag, the primary-contact auto-dial, and a LOCAL 40-line
   `getCurrentLocation()` that reimplemented — differently — the one
   `@rafeeq/ui` has exported since phase 7. The home screen uses the shared one.

   ── What was added, because it was legally and practically absent ──────────

   The disclosure that this is not 911. `SCREENS.md` lists it as required on this
   screen and it was not here. A Rafeeq SOS pages our safety desk and texts a
   guardian; it does not dispatch an ambulance. A student who believes otherwise
   loses the minutes that matter, so the number is on the screen as a button.

   ── Three silent failures fixed ────────────────────────────────────────────

   `makePrimary` and `remove` both swallowed their error and did nothing else: a
   failed delete looked exactly like a successful one until the list reloaded
   unchanged.
   And `remove` had no confirmation at all — one tap next to «تعديل» deleted the
   person who gets called in an emergency.
   ═══════════════════════════════════════════════════════════════════════════ */

const RELATIONS: EmergencyRelation[] = ['parent', 'sibling', 'spouse', 'relative', 'friend', 'other'];

/** Jordan's unified emergency number. */
const EMERGENCY_NUMBER = '911';

export default function Emergency() {
  const { t } = useI18n();
  const theme = useTheme();
  const toast = useToast();
  const confirm = useConfirm();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  /*
   * `status` replaced a bare `loading` boolean: two states for three outcomes meant
   * a failed fetch borrowed the empty state, and «لا توجد جهات اتصال طوارئ» is a
   * dangerous lie to tell someone who has three.
   */
  const [status, setStatus] = useState<ListStatus>({ kind: 'loading' });

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EmergencyContact | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relation, setRelation] = useState<EmergencyRelation>('parent');
  const [notifyOnSos, setNotifyOnSos] = useState(true);
  const [busy, setBusy] = useState(false);
  const [formMsg, setFormMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus({ kind: 'loading' });
    try {
      setContacts(await api.emergency.listContacts());
      setStatus({ kind: 'ready' });
    } catch (e) {
      setStatus(statusFromError(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setEditing(null);
    setName('');
    setPhone('');
    setRelation('parent');
    setNotifyOnSos(true);
    setFormMsg(null);
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

  const message = (e: unknown, fallback: string) =>
    e instanceof RafeeqApiError ? (e.firstError() ?? e.message) : fallback;

  const submit = async () => {
    if (name.trim().length < 2 || phone.trim().length < 6) {
      setFormMsg(t('emergency.invalid'));
      return;
    }
    setBusy(true);
    setFormMsg(null);
    try {
      const payload = { name, phone, relation, notify_on_sos: notifyOnSos };
      if (editing) await api.emergency.updateContact(editing.id, payload);
      else await api.emergency.addContact(payload);
      toast.success(t(editing ? 'emergency.updated' : 'emergency.added'));
      resetForm();
      setShowForm(false);
      await load();
    } catch (e) {
      setFormMsg(message(e, t('emergency.saveFailed')));
    } finally {
      setBusy(false);
    }
  };

  const makePrimary = async (c: EmergencyContact) => {
    try {
      await api.emergency.updateContact(c.id, { is_primary: true });
      toast.success(t('emergency.primarySet'));
      await load();
    } catch (e) {
      toast.error(message(e, t('emergency.saveFailed')));
    }
  };

  const remove = async (c: EmergencyContact) => {
    const ok = await confirm({
      title: t('emergency.deleteConfirmTitle'),
      message: t('emergency.deleteConfirmMsg'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await api.emergency.deleteContact(c.id);
      toast.success(t('emergency.deleted'));
      await load();
    } catch (e) {
      toast.error(message(e, t('emergency.deleteFailed')));
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text role="display">{t('emergency.title')}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('a11y.toggleForm')}
            onPress={() => (showForm ? (setShowForm(false), resetForm()) : (resetForm(), setShowForm(true)))}
            style={s.addBtn}
          >
            <Icon name={showForm ? 'x' : 'plus'} size={18} color={theme.colors.onPrimary} />
          </Pressable>
        </View>

        {/* ── The 911 disclosure, above everything it could be mistaken for ── */}
        <View style={s.notice}>
          <View style={s.noticeHead}>
            <Icon name="triangle-alert" size={20} color={theme.colors.danger} />
            <Text role="titleSm" tone="danger" style={s.flex}>
              {t('emergency.notNineOneOne')}
            </Text>
          </View>
          <Text role="body" tone="secondary">{t('emergency.notNineOneOneHint')}</Text>
          <Pressable
            onPress={() => void Linking.openURL(`tel:${EMERGENCY_NUMBER}`)}
            accessibilityRole="button"
            accessibilityLabel={t('emergency.callNineOneOne')}
            style={({ pressed }) => [s.callNow, pressed && s.pressed]}
          >
            <Icon name="phone-call" size={18} color={theme.colors.onPrimary} />
            <Text role="titleSm" tone="inverse">{t('emergency.callNineOneOne')}</Text>
          </Pressable>
        </View>

        <Text role="body" tone="secondary">{t('emergency.intro')}</Text>

        {showForm ? (
          <Card>
            <Text role="titleMd" style={s.formTitle}>
              {t(editing ? 'emergency.editContact' : 'emergency.addContact')}
            </Text>
            <Banner message={formMsg} variant="error" />
            <Input label={t('emergency.name')} value={name} onChangeText={setName} />
            <Input
              label={t('emergency.phone')}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="07XXXXXXXX"
            />
            <Text role="titleSm" style={s.fieldLabel}>{t('emergency.relationLabel')}</Text>
            <View style={s.chips}>
              {RELATIONS.map((r) => (
                <Pressable
                  key={r}
                  onPress={() => setRelation(r)}
                  accessibilityRole="radio"
                  accessibilityLabel={t(`emergency.relation.${r}`)}
                  accessibilityState={{ selected: relation === r }}
                  style={[s.chip, relation === r && s.chipOn]}
                >
                  <Text role="label" tone={relation === r ? 'primary' : 'default'}>
                    {t(`emergency.relation.${r}`)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={s.switchRow}>
              <Text role="titleSm" style={s.flex}>{t('emergency.notifyOnSos')}</Text>
              <Switch
                value={notifyOnSos}
                onValueChange={setNotifyOnSos}
                accessibilityLabel={t('emergency.notifyOnSos')}
                trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
                thumbColor={theme.colors.surface}
              />
            </View>
            <Button title={t('common.save')} onPress={submit} loading={busy} />
          </Card>
        ) : null}

        <Text role="titleMd" style={s.section}>{t('emergency.contactsTitle')}</Text>
        {status.kind !== 'ready' ? (
          <ListState status={status} onRetry={load} labels={listLabels(t)} />
        ) : contacts.length === 0 ? (
          <EmptyState icon="users" title={t('emergency.noContacts')} hint={t('emergency.noContactsHint')} />
        ) : (
          contacts.map((c) => (
            <Card key={c.id}>
              <View style={s.row}>
                <Text role="titleSm" numberOfLines={1} style={s.flex}>{c.name}</Text>
                {c.is_primary ? <Badge label={t('emergency.primary')} tone="success" /> : null}
              </View>
              <Text role="body" tone="secondary">
                {t(`emergency.relation.${c.relation ?? 'other'}`)} · {c.phone}
              </Text>
              {!c.notify_on_sos ? <Text role="caption" tone="muted">{t('emergency.sosOff')}</Text> : null}
              <View style={s.actions}>
                <Action icon="phone" label={t('emergency.call')} color={theme.colors.primary} onPress={() => void Linking.openURL(`tel:${c.phone}`)} />
                <Action icon="message-square" label={t('emergency.sms')} color={theme.colors.primary} onPress={() => void Linking.openURL(`sms:${c.phone}`)} />
                {!c.is_primary ? (
                  <Action icon="star" label={t('emergency.setPrimary')} color={theme.colors.warning} onPress={() => void makePrimary(c)} />
                ) : null}
                <Action icon="pencil" label={t('common.edit')} color={theme.colors.textSecondary} onPress={() => openEdit(c)} />
                <Action icon="trash-2" label={t('common.delete')} color={theme.colors.danger} tone="danger" onPress={() => void remove(c)} />
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Action({
  icon,
  label,
  color,
  tone,
  onPress,
}: {
  icon: 'phone' | 'message-square' | 'star' | 'pencil' | 'trash-2';
  label: string;
  color: string;
  tone?: 'danger';
  onPress: () => void;
}) {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={s.actionBtn} hitSlop={6}>
      <Icon name={icon} size={16} color={color} />
      <Text role="label" tone={tone ?? 'default'}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colors.background },
    content: { padding: t.spacing.lg, paddingBottom: t.spacing['3xl'], gap: t.spacing.md },
    flex: { flex: 1 },
    pressed: { opacity: 0.85 },
    header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
    addBtn: { width: 40, height: 40, borderRadius: t.radius.pill, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center' },

    notice: {
      backgroundColor: t.colors.dangerSoft, borderWidth: 1, borderColor: t.colors.danger,
      borderRadius: t.radius.card, padding: t.spacing.md, gap: t.spacing.sm,
    },
    noticeHead: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.sm },
    callNow: {
      flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: t.spacing.sm,
      backgroundColor: t.colors.danger, borderRadius: t.radius.control, paddingVertical: t.spacing.md,
    },

    formTitle: { marginBottom: t.spacing.sm },
    fieldLabel: { marginBottom: t.spacing.xs },
    chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: t.spacing.sm, marginBottom: t.spacing.base },
    chip: { paddingHorizontal: t.spacing.base, paddingVertical: 6, borderRadius: t.radius.control, borderWidth: 1, borderColor: t.colors.border, backgroundColor: t.colors.surface },
    chipOn: { borderColor: t.colors.primary, backgroundColor: t.colors.primarySoft },
    switchRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: t.spacing.base },

    section: { marginTop: t.spacing.base },
    row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', gap: t.spacing.sm },
    actions: {
      flexDirection: 'row-reverse', flexWrap: 'wrap', gap: t.spacing.base, marginTop: t.spacing.md,
      borderTopWidth: 1, borderTopColor: t.colors.border, paddingTop: t.spacing.md,
    },
    actionBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5 },
  });
