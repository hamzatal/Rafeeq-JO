# تشغيل تطبيق الطالب (Expo) — Frontend

> التطبيق مبني بـ Expo (React Native + TypeScript) ويشتغل على **iOS + Android + Web** من نفس الكود.
> يعتمد على حزم مشتركة في `frontend/packages/` ضمن workspace الـ frontend (npm workspaces).

## المتطلبات
- Node.js 20+ و npm 10+.
- (اختياري للموبايل) تطبيق **Expo Go** على هاتفك، أو محاكي Android/iOS.

## 1) ثبّت الاعتمادات (من مجلد frontend)
```bash
cd frontend
npm install
```
> هذا يثبّت اعتمادات كل الـ workspaces (التطبيقات + الحزم المشتركة) دفعة واحدة.

## 2) تأكّد أن الـ Backend شغّال
لازم يكون الـ API شغّال على `http://localhost:8000` (انظر `local-setup.md`).
عنوان الـ API معرّف في `frontend/student-app/app.json` تحت `extra.apiUrl`.

> **مهم للموبايل الحقيقي:** `localhost` يشير للهاتف نفسه. لتجربة على جهاز فعلي، غيّر `apiUrl`
> إلى IP جهازك على الشبكة (مثل `http://192.168.1.20:8000`)، وشغّل الـ backend بـ
> `php artisan serve --host=0.0.0.0`.

## 3) شغّل التطبيق
```bash
# من مجلد frontend
cd frontend
npm run student
# أو من داخل مجلد التطبيق:
cd frontend/student-app && npm start
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
frontend/student-app/
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
- نظام التصميم والأنواع وعميل الـ API في `frontend/packages/shared` و`frontend/packages/api-client` (مُعاد استخدامها في تطبيق الكابتن).
- التوكن يُحفظ بأمان (SecureStore على الموبايل، localStorage على الويب).
- اللغة الافتراضية عربية مع RTL.


---

## 🚗 تشغيل تطبيق الكابتن (driver-app)
نفس متطلبات تطبيق الطالب. من مجلد frontend:
```bash
cd frontend
npm install            # مرة واحدة (يثبّت كل التطبيقات)
npm run driver
# أو: cd frontend/driver-app && npm start
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


---

## 🛠️ تشغيل لوحة الإدارة (admin-dashboard — Next.js)
```bash
cd frontend
npm install              # مرة واحدة
cp admin-dashboard/.env.local.example admin-dashboard/.env.local   # عنوان الـ API
npm run admin            # على http://localhost:3000
```
سجّل الدخول بحساب الأدمن المزروع:
- الهاتف: `0790000000` · كلمة المرور: `Rafeeq@2026` (أو ما ضبطته في `SEED_ADMIN_PASSWORD`).

### المتوفّر في اللوحة
- **الرئيسية:** نظرة عامة.
- **الكباتن:** قائمة + فلترة بالحالة → صفحة مراجعة: عرض الوثائق (تنزيل آمن)، قبول/رفض كل وثيقة، واعتماد/رفض/إيقاف الكابتن.
- **المستخدمون:** قائمة + فلترة بالنوع + بحث.

> دورة التوثيق الكاملة صارت تعمل بصرياً: الكابتن يرفع وثائقه ويرسل للمراجعة → الأدمن يفتح اللوحة، يراجع، يقبل الوثائق، ويعتمد الكابتن → حالة الكابتن في تطبيقه تتحدّث إلى "معتمد".
