'use client';

import { usePrefs } from './prefs';

/**
 * Dashboard-local translation dictionary for the admin shell and the
 * pages that ship bilingual copy. Page-body strings are migrated here
 * incrementally; anything missing falls back to the key's Arabic value.
 */
type Dict = Record<string, { ar: string; en: string }>;

const DICT: Dict = {
  // Brand / shell
  'brand.tagline': { ar: 'مركز القيادة', en: 'Command Center' },
  'shell.logout': { ar: 'تسجيل الخروج', en: 'Log out' },
  'shell.staff': { ar: 'موظف', en: 'Staff' },
  'shell.search': { ar: 'بحث في العمليات...', en: 'Search operations...' },
  'shell.notifications': { ar: 'الإشعارات', en: 'Notifications' },
  'shell.noNotifications': { ar: 'لا توجد إشعارات', en: 'No notifications' },
  'shell.markAllRead': { ar: 'تعليم الكل كمقروء', en: 'Mark all read' },
  'shell.language': { ar: 'اللغة', en: 'Language' },
  'shell.theme': { ar: 'المظهر', en: 'Theme' },

  // Nav groups
  'nav.group.operations': { ar: 'العمليات', en: 'Operations' },
  'nav.group.transport': { ar: 'النقل', en: 'Transport' },
  'nav.group.network': { ar: 'الشبكة', en: 'Network' },
  'nav.group.finance': { ar: 'المالية', en: 'Finance' },
  'nav.group.safety': { ar: 'السلامة والامتثال', en: 'Safety & Compliance' },
  'nav.group.admin': { ar: 'الإدارة', en: 'Administration' },

  // Nav links
  'nav.dashboard': { ar: 'مركز القيادة', en: 'Dashboard' },
  'nav.insights': { ar: 'الرؤى الذكية', en: 'AI Insights' },
  'nav.rideRequests': { ar: 'طلبات الرحلات', en: 'Ride Requests' },
  'nav.zones': { ar: 'المناطق', en: 'Zones' },
  'nav.universities': { ar: 'الجامعات', en: 'Universities' },
  'nav.routes': { ar: 'المسارات', en: 'Routes' },
  'nav.plans': { ar: 'خطط الاشتراك', en: 'Plans' },
  'nav.subscriptions': { ar: 'الاشتراكات', en: 'Subscriptions' },
  'nav.trips': { ar: 'مراقبة الرحلات', en: 'Trips' },
  'nav.drivers': { ar: 'الكباتن', en: 'Captains' },
  'nav.users': { ar: 'المستخدمون', en: 'Users' },
  'nav.payments': { ar: 'المدفوعات', en: 'Payments' },
  'nav.coupons': { ar: 'الكوبونات', en: 'Coupons' },
  'nav.withdrawals': { ar: 'سحوبات الكباتن', en: 'Withdrawals' },
  'nav.reports': { ar: 'التقارير المالية', en: 'Financial Reports' },
  'nav.cliq': { ar: 'إعدادات CliQ', en: 'CliQ Settings' },
  'nav.safety': { ar: 'مركز الأمان', en: 'Safety Center' },
  'nav.disputes': { ar: 'مركز النزاعات', en: 'Disputes' },
  'nav.support': { ar: 'الدعم', en: 'Support' },
  'nav.complaints': { ar: 'الشكاوى', en: 'Complaints' },
  'nav.security': { ar: 'الأمان (MFA)', en: 'Security (MFA)' },
  'nav.admins': { ar: 'فريق الإدارة', en: 'Admin Team' },
  'nav.profile': { ar: 'ملفي الشخصي', en: 'My Profile' },

  // Profile page
  'profile.title': { ar: 'ملفي الشخصي', en: 'My Profile' },
  'profile.account': { ar: 'بيانات الحساب', en: 'Account details' },
  'profile.fullName': { ar: 'الاسم الكامل', en: 'Full name' },
  'profile.email': { ar: 'البريد الإلكتروني', en: 'Email' },
  'profile.phone': { ar: 'رقم الهاتف', en: 'Phone' },
  'profile.save': { ar: 'حفظ التغييرات', en: 'Save changes' },
  'profile.saved': { ar: 'تم حفظ التغييرات.', en: 'Changes saved.' },
  'profile.password': { ar: 'تغيير كلمة المرور', en: 'Change password' },
  'profile.currentPassword': { ar: 'كلمة المرور الحالية', en: 'Current password' },
  'profile.newPassword': { ar: 'كلمة المرور الجديدة', en: 'New password' },
  'profile.confirmPassword': { ar: 'تأكيد كلمة المرور', en: 'Confirm password' },
  'profile.changePassword': { ar: 'تحديث كلمة المرور', en: 'Update password' },
  'profile.passwordChanged': { ar: 'تم تحديث كلمة المرور.', en: 'Password updated.' },
  'profile.passwordMismatch': { ar: 'كلمتا المرور غير متطابقتين.', en: 'Passwords do not match.' },

  // Wallet top-up
  'wallet.topup': { ar: 'شحن المحفظة', en: 'Top up wallet' },
  'wallet.topupFor': { ar: 'شحن محفظة', en: 'Top up wallet for' },
  'wallet.amountJod': { ar: 'المبلغ (دينار)', en: 'Amount (JOD)' },
  'wallet.reference': { ar: 'الرقم المرجعي (اختياري)', en: 'Reference (optional)' },
  'wallet.confirmCredit': { ar: 'اعتماد الشحن', en: 'Confirm top-up' },
  'wallet.credited': { ar: 'تم شحن الرصيد بنجاح.', en: 'Wallet credited successfully.' },
  'wallet.invalidAmount': { ar: 'أدخل مبلغاً صحيحاً.', en: 'Enter a valid amount.' },

  // Common
  'common.cancel': { ar: 'إلغاء', en: 'Cancel' },
  'common.save': { ar: 'حفظ', en: 'Save' },
  'common.error': { ar: 'حدث خطأ، حاول مجدداً.', en: 'Something went wrong, try again.' },
  'common.loading': { ar: 'جارٍ التحميل...', en: 'Loading...' },
};

export type Translate = (key: string, fallback?: string) => string;

export function useT(): { t: Translate; locale: 'ar' | 'en' } {
  const { locale } = usePrefs();
  const t: Translate = (key, fallback) => {
    const entry = DICT[key];
    if (!entry) return fallback ?? key;
    return entry[locale] ?? entry.ar;
  };
  return { t, locale };
}
