# تشغيل منصّة رفيق وربط التطبيقات بالخادم

> هذا الدليل يحلّ خطأ **"Network Error / تعذّر الاتصال بالخادم"** عند تسجيل الدخول.
> السبب أن التطبيقات كانت تتّصل بـ `http://localhost:8000` وهو غير قابل للوصول من جهاز/متصفّح آخر.

## 1) تشغيل الباك إند (Laravel API)

المتطلّبات (حسب ستاك المشروع): **PHP 8.2+** و**PostgreSQL 16** و**Redis** (الكاش/الطابور/الجلسات/البثّ).

```bash
cd backend
cp .env.example .env
php artisan key:generate
# عدّل .env: بيانات PostgreSQL + Redis + مفتاح OpenAI (انظر أدناه)
php artisan migrate --force
php artisan db:seed --force        # ينشئ الأدوار + حساب أدمن + جامعات + مناطق
php artisan serve --host=0.0.0.0 --port=8000
```

- حساب الأدمن المزروع: الهاتف `+962790000000`، وكلمة المرور من `SEED_ADMIN_PASSWORD` في `.env`.
- صحّة الـ API: `GET http://<HOST>:8000/api/v1/ping` يجب أن يرجع `pong`.
- شغّل عامل الجدولة في الإنتاج: `php artisan schedule:work` (أو cron).

## 2) ربط التطبيقات بعنوان الخادم الصحيح

استبدل `<HOST>` بعنوان IP للجهاز المضيف على الشبكة (وليس `localhost`)، أو دومين الإنتاج.

| التطبيق | المتغيّر | الملف |
|--------|----------|------|
| student-app / driver-app / guardian-app (Expo) | `EXPO_PUBLIC_API_URL` | `.env` في مجلد كل تطبيق |
| admin-dashboard (Next.js) | `NEXT_PUBLIC_API_URL` | `.env.local` |

```bash
# مثال لكل تطبيق Expo
echo "EXPO_PUBLIC_API_URL=http://192.168.1.50:8000" > frontend/student-app/.env

# لوحة الإدارة
echo "NEXT_PUBLIC_API_URL=http://192.168.1.50:8000" > frontend/admin-dashboard/.env.local
```

ملاحظات مهمّة:
- على **محاكي Android** استخدم `http://10.0.2.2:8000`.
- على **جهاز حقيقي** استخدم IP جهازك على نفس شبكة الواي‑فاي (مثل `http://192.168.x.x:8000`).
- على **الويب (متصفّح نفس الجهاز)** يكفي `http://localhost:8000`.
- بعد تعديل `.env` لتطبيقات Expo، أعد تشغيل الحزمة: `npx expo start -c`.

## 3) مفتاح OpenAI (GPT) — جاهز عندك

ضعه في `backend/.env`:

```env
OPENAI_API_KEY=sk-...your-key...
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_VISION_MODEL=gpt-4o
```

- يُستخدم في: مساعد رفيق، وذكاء المسارات، و**التحقّق من إيصالات CliQ بالرؤية (Vision)**.
- بدون المفتاح يعمل النظام عبر `NullGptClient` (مراجعة يدوية للإيصالات) — لا يتعطّل.

## 4) رسالة الخطأ الواضحة
عند تعذّر الوصول للخادم تظهر الآن رسالة عربية واضحة بدل التعليق، مع مهلة 15 ثانية بدل 20.
تحقّق أولاً من: تشغيل الباك إند، صحّة `EXPO_PUBLIC_API_URL`/`NEXT_PUBLIC_API_URL`، ووصول الجهاز للشبكة نفسها.
