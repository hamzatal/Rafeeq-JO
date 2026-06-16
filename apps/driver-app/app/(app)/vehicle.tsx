import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { validators, validateForm } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { Banner } from '../../src/components/Banner';
import { useI18n } from '../../src/i18n';
import { useAuth } from '../../src/store/auth';
import { api } from '../../src/lib/api';
import { theme } from '../../src/theme';

export default function Vehicle() {
  const { t } = useI18n();
  const driver = useAuth((s) => s.driver);
  const refreshDriver = useAuth((s) => s.refreshDriver);

  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('');
  const [plate, setPlate] = useState('');
  const [seats, setSeats] = useState('4');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const onAdd = async () => {
    setError(null);
    setSuccess(null);
    const { valid, errors: e } = validateForm({
      make: () => validators.required(make),
      model: () => validators.required(model),
      year: () => validators.year(Number(year)),
      color: () => validators.required(color),
      plate: () => validators.plateNumber(plate),
    });
    setErrors(e);
    if (!valid) return;

    setLoading(true);
    try {
      await api.driver.addVehicle({
        make: make.trim(),
        model: model.trim(),
        year: Number(year),
        color: color.trim(),
        plate_number: plate.trim(),
        seats: Number(seats) || 4,
      });
      await refreshDriver();
      setSuccess('تمت إضافة المركبة بنجاح');
      setMake(''); setModel(''); setYear(''); setColor(''); setPlate(''); setSeats('4');
    } catch (err) {
      setError(err instanceof RafeeqApiError ? err.firstError() ?? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {driver?.vehicles?.length ? (
        <View style={styles.list}>
          {driver.vehicles.map((v) => (
            <View key={v.id} style={styles.vehicleCard}>
              <Text style={styles.vehicleTitle}>{v.make} {v.model} ({v.year})</Text>
              <Text style={styles.vehicleMeta}>{v.plate_number} · {v.color} · {v.seats} مقاعد</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={styles.section}>{t('driver.addVehicle')}</Text>
      <Banner message={error} variant="error" />
      <Banner message={success} variant="success" />

      <Input label={t('driver.make')} value={make} onChangeText={setMake} error={errors.make} />
      <Input label={t('driver.model')} value={model} onChangeText={setModel} error={errors.model} />
      <Input label={t('driver.year')} value={year} onChangeText={setYear} error={errors.year} keyboardType="number-pad" />
      <Input label={t('driver.color')} value={color} onChangeText={setColor} error={errors.color} />
      <Input label={t('driver.plate')} value={plate} onChangeText={setPlate} error={errors.plate} />
      <Input label={t('driver.seats')} value={seats} onChangeText={setSeats} keyboardType="number-pad" />
      <Button title={t('driver.addVehicle')} onPress={onAdd} loading={loading} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg },
  list: { marginBottom: theme.spacing.lg },
  vehicleCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.base, marginBottom: theme.spacing.sm },
  vehicleTitle: { fontFamily: theme.fontFamily.bold, fontSize: 15, color: theme.colors.text, textAlign: 'right' },
  vehicleMeta: { fontFamily: theme.fontFamily.regular, fontSize: 13, color: theme.colors.textSecondary, textAlign: 'right', marginTop: 2 },
  section: { fontFamily: theme.fontFamily.bold, fontSize: 16, color: theme.colors.text, textAlign: 'right', marginBottom: theme.spacing.base },
});
