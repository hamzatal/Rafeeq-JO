import { isValidJordanPhone } from './phone';

export type ValidationResult = string | null; // null = valid, string = error message

/** Composable, modern field validators (return Arabic error or null). */
export const validators = {
  required(value: string | null | undefined): ValidationResult {
    return value && value.trim().length > 0 ? null : 'هذا الحقل مطلوب';
  },

  minLength(value: string, min: number): ValidationResult {
    return (value ?? '').trim().length >= min ? null : `الحد الأدنى ${min} أحرف`;
  },

  maxLength(value: string, max: number): ValidationResult {
    return (value ?? '').length <= max ? null : `الحد الأقصى ${max} حرف`;
  },

  fullName(value: string): ValidationResult {
    const v = (value ?? '').trim();
    if (!v) return 'الاسم مطلوب';
    if (v.length < 3) return 'الاسم قصير جداً';
    if (!/^[\p{L} '.-]+$/u.test(v)) return 'الاسم يحتوي رموزاً غير صالحة';
    return null;
  },

  phone(value: string): ValidationResult {
    return isValidJordanPhone(value) ? null : 'رقم الهاتف غير صالح (مثال: 07XXXXXXXX)';
  },

  email(value: string): ValidationResult {
    if (!value) return null; // optional
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : 'البريد الإلكتروني غير صالح';
  },

  password(value: string): ValidationResult {
    if (!value) return 'كلمة المرور مطلوبة';
    if (value.length < 8) return 'كلمة المرور 8 أحرف على الأقل';
    if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return 'يجب أن تحتوي أحرفاً وأرقاماً';
    return null;
  },

  otp(value: string, length = 6): ValidationResult {
    return new RegExp(`^\\d{${length}}$`).test(value) ? null : `أدخل رمزاً من ${length} أرقام`;
  },

  plateNumber(value: string): ValidationResult {
    const v = (value ?? '').trim();
    return v.length >= 2 && v.length <= 30 ? null : 'رقم اللوحة غير صالح';
  },

  year(value: number): ValidationResult {
    const current = new Date().getFullYear();
    return value >= 1990 && value <= current + 1 ? null : 'سنة غير صالحة';
  },
};

/** Run a map of field->validator and return the first errors per field. */
export function validateForm<T extends Record<string, () => ValidationResult>>(
  rules: T,
): { valid: boolean; errors: Partial<Record<keyof T, string>> } {
  const errors: Partial<Record<keyof T, string>> = {};
  for (const key in rules) {
    const result = rules[key]();
    if (result) errors[key] = result;
  }
  return { valid: Object.keys(errors).length === 0, errors };
}
