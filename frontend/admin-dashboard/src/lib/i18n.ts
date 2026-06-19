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
  'common.viewAll': { ar: 'عرض الكل', en: 'View all' },
  'common.none': { ar: 'لا يوجد', en: 'None' },

  // Dashboard home
  'home.title': { ar: 'نظرة عامة على الأسطول', en: 'Fleet overview' },
  'home.welcome': { ar: 'أهلاً', en: 'Welcome' },
  'home.subtitle': { ar: 'مراقبة الأداء والمقاييس الرئيسية لحظياً.', en: 'Real-time performance & key metrics.' },
  'home.lastUpdate': { ar: 'آخر تحديث', en: 'Last updated' },
  'home.kpi.rides': { ar: 'الرحلات المدفوعة (الشهر)', en: 'Paid rides (month)' },
  'home.kpi.commission': { ar: 'إيراد المنصة — عمولة', en: 'Platform revenue — commission' },
  'home.kpi.gross': { ar: 'إجمالي الأجور المحصّلة', en: 'Total fares collected' },
  'home.kpi.disputes': { ar: 'نزاعات مفتوحة عالية الخطورة', en: 'High-risk open disputes' },
  'home.trend.sinceMonth': { ar: 'منذ بداية الشهر', en: 'Since start of month' },
  'home.trend.netCommission': { ar: 'صافي عمولة المنصة', en: 'Net platform commission' },
  'home.trend.grossValue': { ar: 'إجمالي قيمة الرحلات', en: 'Gross ride value' },
  'home.trend.needsReview': { ar: 'تتطلب مراجعة فورية', en: 'Needs immediate review' },
  'home.trend.none': { ar: 'لا يوجد حالياً', en: 'None right now' },
  'home.commissionByZone': { ar: 'عمولة المنصة حسب المنطقة', en: 'Platform commission by zone' },
  'home.fullReports': { ar: 'التقارير الكاملة', en: 'Full reports' },
  'home.noData': { ar: 'لا توجد بيانات للفترة الحالية', en: 'No data for the current period' },
  'home.general': { ar: 'عام', en: 'General' },
  'home.quickAccess': { ar: 'وصول سريع', en: 'Quick access' },
  'home.recentDisputes': { ar: 'أحدث النزاعات المفتوحة', en: 'Latest open disputes' },
  'home.noDisputes': { ar: 'لا توجد نزاعات مفتوحة 🎉', en: 'No open disputes 🎉' },
  'home.account': { ar: 'الحساب', en: 'Account' },
  'home.type': { ar: 'النوع', en: 'Type' },
  'home.severity': { ar: 'الخطورة', en: 'Severity' },
  'home.riskScore': { ar: 'درجة الخطر', en: 'Risk score' },

  // Coupons
  'coupons.title': { ar: 'الكوبونات والخصومات', en: 'Coupons & discounts' },
  'coupons.create': { ar: 'إنشاء كوبون', en: 'Create coupon' },
  'coupons.codeValueRequired': { ar: 'الرمز والقيمة مطلوبان', en: 'Code and value are required' },
  'coupons.saveFailed': { ar: 'فشل الحفظ', en: 'Save failed' },
  'coupons.codePlaceholder': { ar: 'الرمز (WELCOME)', en: 'Code (WELCOME)' },
  'coupons.percentage': { ar: 'نسبة مئوية %', en: 'Percentage %' },
  'coupons.fixed': { ar: 'مبلغ ثابت (د.أ)', en: 'Fixed amount (JOD)' },
  'coupons.percentValue': { ar: 'النسبة %', en: 'Percent %' },
  'coupons.jodValue': { ar: 'القيمة د.أ', en: 'Value (JOD)' },
  'coupons.maxDiscount': { ar: 'حد أقصى للخصم (د.أ)', en: 'Max discount (JOD)' },
  'coupons.minAmount': { ar: 'حد أدنى للمبلغ (د.أ)', en: 'Min amount (JOD)' },
  'coupons.usageLimit': { ar: 'حد الاستخدام الكلي', en: 'Total usage limit' },
  'coupons.perUserLimit': { ar: 'حد لكل مستخدم', en: 'Per-user limit' },
  'coupons.expiry': { ar: 'تاريخ الانتهاء', en: 'Expiry date' },
  'coupons.descPlaceholder': { ar: 'الوصف (اختياري)', en: 'Description (optional)' },
  'coupons.firstOnly': { ar: 'لأول عملية فقط', en: 'First order only' },
  'coupons.colCode': { ar: 'الرمز', en: 'Code' },
  'coupons.colValue': { ar: 'القيمة', en: 'Value' },
  'coupons.colScope': { ar: 'النطاق', en: 'Scope' },
  'coupons.colUsage': { ar: 'الاستخدام', en: 'Usage' },
  'coupons.colExpiry': { ar: 'ينتهي', en: 'Expires' },
  'coupons.colStatus': { ar: 'الحالة', en: 'Status' },
  'coupons.active': { ar: 'فعّال', en: 'Active' },
  'coupons.inactive': { ar: 'متوقف', en: 'Inactive' },
  'coupons.delete': { ar: 'حذف', en: 'Delete' },
  'coupons.deleteConfirm': { ar: 'حذف الكوبون؟', en: 'Delete coupon?' },
  'coupons.none': { ar: 'لا توجد كوبونات', en: 'No coupons' },
  'coupons.scope.any': { ar: 'كل العمليات', en: 'All operations' },
  'coupons.scope.subscription': { ar: 'الاشتراكات', en: 'Subscriptions' },
  'coupons.scope.wallet_topup': { ar: 'شحن المحفظة', en: 'Wallet top-up' },
  'coupons.scope.ride': { ar: 'الرحلات', en: 'Rides' },

  // Admin team management
  'admins.title': { ar: 'فريق الإدارة', en: 'Admin Team' },
  'admins.add': { ar: 'إضافة موظف', en: 'Add staff' },
  'admins.role': { ar: 'الدور', en: 'Role' },
  'admins.created': { ar: 'تم إنشاء حساب الموظف.', en: 'Staff account created.' },
  'admins.updated': { ar: 'تم تحديث الحساب.', en: 'Account updated.' },
  'admins.password': { ar: 'كلمة المرور', en: 'Password' },
  'admins.newPassword': { ar: 'كلمة مرور جديدة (اختياري)', en: 'New password (optional)' },
  'admins.status': { ar: 'الحالة', en: 'Status' },
  'admins.edit': { ar: 'تعديل', en: 'Edit' },
  'admins.noAccess': {
    ar: 'هذه الصفحة متاحة للإدارة العليا فقط.',
    en: 'This page is available to top-level admins only.',
  },

  // CliQ settings
  'cliq.title': { ar: 'إعدادات CliQ', en: 'CliQ Settings' },
  'cliq.intro': {
    ar: 'منصة الدفع الحالية هي CliQ. عدّل الاسم المستعار وبيانات المستفيد عند الحاجة.',
    en: 'CliQ is the current payment method. Update the alias and beneficiary details when needed.',
  },
  'cliq.alias': { ar: 'الاسم المستعار (Alias)', en: 'CliQ Alias' },
  'cliq.beneficiary': { ar: 'اسم المستفيد', en: 'Beneficiary name' },
  'cliq.bank': { ar: 'اسم البنك', en: 'Bank name' },
  'cliq.save': { ar: 'حفظ إعدادات CliQ', en: 'Save CliQ settings' },
  'cliq.saved': { ar: 'تم تحديث إعدادات CliQ.', en: 'CliQ settings updated.' },
  'cliq.recentTopups': { ar: 'طلبات الشحن الأخيرة', en: 'Recent top-up requests' },
  'cliq.noTopups': { ar: 'لا توجد طلبات حالياً', en: 'No requests right now' },
  'cliq.number': { ar: 'الرقم المرجعي', en: 'Reference' },
  'cliq.amount': { ar: 'المبلغ', en: 'Amount' },
  'cliq.payer': { ar: 'الدافع', en: 'Payer' },
  'cliq.status': { ar: 'الحالة', en: 'Status' },
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
