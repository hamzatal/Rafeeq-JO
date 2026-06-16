# تشغيل تطبيق الطالب (Expo) — Frontend

> التطبيق مبني بـ Expo (React Native + TypeScript) ويشتغل على **iOS + Android + Web** من نفس الكود.
> يعتمد على حزم مشتركة في `packages/` ضمن الـ monorepo (npm workspaces).

## المتطلبات
- Node.js 20+ و npm 10+.
- (اختياري للموبايل) تطبيق **Expo Go** على هاتفك، أو محاكي Android/iOS.

## 1) ثبّت الاعتمادات (من جذر المشروع)
```bash
npm install
```
> هذا يثبّت اعتمادات كل الـ workspaces (التطبيقات + الحزم المشتركة) دفعة واحدة.

## 2) تأكّد أن الـ Backend شغّال
لازم يكون الـ API شغّال على `http://localhost:8000` (انظر `local-setup.md`).
عنوان الـ API معرّف في `apps/student-app/app.json` تحت `extra.apiUrl`.

> **مهم للموبايل الحقيقي:** `localhost` يشير للهاتف نفسه. لتجربة على جهاز فعلي، غيّر `apiUrl`
> إلى IP جهازك على الشبكة (مثل `http://192.168.1.20:8000`)، وشغّل الـ backend بـ
> `php artisan serve --host=0.0.0.0`.

## 3) شغّل التطبيق
```bash
# من جذر المشروع
npm run student
# أو من داخل المجلد:
cd apps/student-app && npm start
```
ثم اختر:
- `w` لفتح نسخة الويب في المتصفح (الأسرع للتجربة).
- `a` لمحاكي Android، `i` لمحاكي iOS.
- أو امسح الـ QR بتطبيق Expo Go.

## التدفّق الجاهز حالياً
شاشة ترحيب → إنشاء حساب (اسم + هاتف) → إدخال رمز OTP (يظهر رمز التجربة على الشاشة في وضع التطوير) →
الدخول للرئيسية. كذلك تسجيل الدخول بكلمة المرور (للأدمن/الموظفين).

## البنية
```
apps/student-app/
├── app/                 شاشات (expo-router)
│   ├── _layout.tsx      تحميل الخطوط + providers + bootstrap
│   ├── index.tsx        بوابة التوجيه حسب حالة الدخول
│   ├── (auth)/          welcome / register / otp / login
│   └── (app)/           home (الخدمات)
└── src/
    ├── components/      Button / Input / Screen
    ├── lib/             api + secure token storage
    ├── store/           auth (zustand)
    ├── i18n.tsx         العربية/الإنجليزية + RTL
    └── theme.ts         ربط نظام تصميم رفيق
```

## ملاحظات
- نظام التصميم والأنواع وعميل الـ API في `packages/shared` و`packages/api-client` (يُعاد استخدامها في تطبيق الكابتن لاحقاً).
- التوكن يُحفظ بأمان (SecureStore على الموبايل، localStorage على الويب).
- اللغة الافتراضية عربية مع RTL.


---

## 🚗 تشغيل تطبيق الكابتن (driver-app)
نفس متطلبات تطبيق الطالب. من جذر المشروع:
```bash
npm install            # مرة واحدة (يثبّت كل التطبيقات)
npm run --workspace=apps/driver-app start
# أو: cd apps/driver-app && npm start
```
ثم `w` للويب أو امسح الـ QR.

### تدفّق الكابتن الجاهز
ترحيب → إنشاء حساب (يُسجّل كـ **كابتن**) → OTP → لوحة الكابتن:
- شريط حالة التوثيق (بانتظار / قيد المراجعة / معتمد / مرفوض / موقوف).
- **الوثائق:** رفع الهوية/الرخصة/دفتر المركبة/التأمين/صورة (صورة أو PDF) — تُخزّن على disk آمن في الـ backend.
- **المركبة:** إضافة مركبة مع فاليديشن.
- **إرسال للمراجعة:** يتحقق الـ backend من اكتمال الوثائق والمركبة قبل القبول.

### اعتماد الكابتن (للتجربة)
الاعتماد يتم من حساب إدارة عبر الـ API (لوحة الإدارة قيد الإنشاء):
`POST /api/v1/admin/drivers/{driver}/review` بالحقل `action=approve` (يتطلب صلاحية `drivers.approve`).
