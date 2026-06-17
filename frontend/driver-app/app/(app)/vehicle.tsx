import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { validators, validateForm } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { Banner } from '../../src/components/Banner';
import { useI18n } from '../../src/i18n';
import { useAuth } from '../../src/store/auth';
import { api } from '../../src/lib/api';
import { useTheme, type AppTheme } from '../../src/theme';

export default function Vehicle() {
  const { t } = useI18n();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const driver = useAuth((a) => a.driver);
  const refreshDriver = useAuth((a) => a.refreshDriver);

  const [form, setForm] = useState({ make: '', model: '', year: '', color: '', plate: '', seats: '4' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const onAdd = async () => {
    setError(null); setSuccess(null);
    const { valid, errors: e } = validateForm({
      make: () => validators.required(form.make),
      model: () => validators.required(form.model),
      year: () => validators.year(Number(form.year)),
      color: () => validators.required(form.color),
      plate: () => validators.plateNumber(form.plate),
    });
    setErrors(e);
    if (!valid) return;
    setLoading(true);
    try {
      await api.driver.addVehicle({
        make: form.make.trim(), model: form.model.trim(), year: Number(form.year),
        color: form.color.trim(), plate_number: form.plate.trim(), seats: Number(form.seats) || 4,
      });
      await refreshDriver();
      setSuccess('تمت إضافة المركبة بنجاح');
      setForm({ make: '', model: '', year: '', color: '', plate: '', seats: '4' });
    } catch (err) {
      setError(err instanceof RafeeqApiError ? err.firstError() ?? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={s.safe} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      {driver?.vehicles?.length ? (
        <View style={s.list}>
          {driver.vehicles.map((v) => (
            <View key={v.id} style={s.vehicleCard}>
              <Text style={s.vehicleTitle}>{v.make} {v.model} ({v.year})</Text>
              <Text style={s.vehicleMeta}>{v.plate_number} · {v.color} · {v.seats} مقاعد</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={s.section}>{t('driver.addVehicle')}</Text>
      <Banner message={error} variant="error" />
      <Banner message={success} variant="success" />
      <Input label={t('driver.make')} value={form.make} onChangeText={(v) => set('make', v)} error={errors.make} />
      <Input label={t('driver.model')} value={form.model} onChangeText={(v) => set('model', v)} error={errors.model} />
      <Input label={t('driver.year')} value={form.year} onChangeText={(v) => set('year', v)} error={errors.year} keyboardType="number-pad" />
      <Input label={t('driver.color')} value={form.color} onChangeText={(v) => set('color', v)} error={errors.color} />
      <Input label={t('driver.plate')} value={form.plate} onChangeText={(v) => set('plate', v)} error={errors.plate} />
      <Input label={t('driver.seats')} value={form.seats} onChangeText={(v) => set('seats', v)} keyboardType="number-pad" />
      <Button title={t('driver.addVehicle')} onPress={onAdd} loading={loading} />
    </ScrollView>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colors.background },
    content: { padding: t.spacing.lg },
    list: { marginBottom: t.spacing.lg },
    vehicleCard: { backgroundColor: t.colors.card, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.border, padding: t.spacing.base, marginBottom: t.spacing.sm },
    vehicleTitle: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.text, textAlign: 'right' },
    vehicleMeta: { fontFamily: t.fontFamily.regular, fontSize: 13, color: t.colors.textSecondary, textAlign: 'right', marginTop: 2 },
    section: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.text, textAlign: 'right', marginBottom: t.spacing.base },
  });
