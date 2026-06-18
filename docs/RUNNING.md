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

## 3) إرسال OTP عبر WhatsApp مجاناً (OpenWA) — للتجربة على رقم حقيقي

بدل رسائل SMS المدفوعة، يمكن إرسال رمز الـ OTP عبر **واتساب** باستخدام بوابة [OpenWA](https://github.com/rmyndharis/OpenWA) المجانية المفتوحة المصدر (تُستضاف ذاتياً). الدمج جاهز في الباك إند عبر تجريد `SmsGateway` — تشغّل OpenWA كخدمة منفصلة فقط.

**خطوات الإعداد:**
```bash
# 1) شغّل بوابة OpenWA (Docker) — تعمل على المنفذ 2785
git clone https://github.com/rmyndharis/OpenWA && cd OpenWA
cp .env.example .env          # ولّد API key داخلها
docker compose up -d
# لوحة التحكم + Swagger: http://localhost:2785/api/docs

# 2) أنشئ جلسة وامسح QR برقم واتساب رفيق الرسمي
curl -X POST http://localhost:2785/api/sessions -H "X-API-Key: KEY" -d '{"name":"rafeeq"}'
curl -X POST http://localhost:2785/api/sessions/rafeeq/start -H "X-API-Key: KEY"
curl http://localhost:2785/api/sessions/rafeeq/qr -H "X-API-Key: KEY"   # امسح الـ QR
```

**3) فعّل واتساب في `backend/.env`:**
```env
SMS_DRIVER=whatsapp
WHATSAPP_GATEWAY_URL=http://localhost:2785
WHATSAPP_API_KEY=نفس-المفتاح
WHATSAPP_SESSION=rafeeq
```

بعدها كل رمز OTP يُرسَل فعلياً عبر واتساب من الرقم اللي مسحت QR فيه، باسم رفيق. (الباك إند يحوّل الرقم تلقائياً لصيغة `9627XXXXXXXX@c.us`.)

> **ملاحظة أمانة:** OpenWA يؤتمت واتساب ويب (غير رسمي من واتساب) — ممتاز للتجربة/MVP لكن قد يُعرّض الرقم للحظر عند الاستخدام المكثّف. للإنتاج واسع النطاق يُفضّل **WhatsApp Business Cloud API** الرسمي؛ والتبديل سطر واحد في الـ binding بفضل تجريد `SmsGateway`.

## 4) مفتاح OpenAI (GPT) — جاهز عندك

ضعه في `backend/.env`:

```env
OPENAI_API_KEY=sk-...your-key...
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_VISION_MODEL=gpt-4o
```

- يُستخدم في: مساعد رفيق، وذكاء المسارات، و**التحقّق من إيصالات CliQ بالرؤية (Vision)**.
- بدون المفتاح يعمل النظام عبر `NullGptClient` (مراجعة يدوية للإيصالات) — لا يتعطّل.

## 5) رسالة الخطأ الواضحة
عند تعذّر الوصول للخادم تظهر الآن رسالة عربية واضحة بدل التعليق، مع مهلة 15 ثانية بدل 20.
تحقّق أولاً من: تشغيل الباك إند، صحّة `EXPO_PUBLIC_API_URL`/`NEXT_PUBLIC_API_URL`، ووصول الجهاز للشبكة نفسها.
