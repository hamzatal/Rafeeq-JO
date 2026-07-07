# إعداد OTP عبر WhatsApp Cloud API الرسمي (Meta)

> القناة المعتمدة لإرسال رموز التحقق في رفيق. رسمية، موثوقة، وفيها طبقة مجانية كافية للتجربة الحقيقية.
> البديل التطويري: `SMS_DRIVER=log` (يكتب الرمز في اللوق) — التطبيق يعمل بدون أي مفاتيح.

---

## لماذا الرسمي؟
- لا حاجة لتشغيل سيرفر OpenWA على جهازك (تم استبعاده).
- موثوق ولا يُحظر الرقم. **محادثات الخدمة: 1000 مجانية/شهر** + رسائل الـ authentication بسعر زهيد للأردن.
- التبديل للمزوّد لاحقاً (زين الأردن مثلاً) يبقى تغيير سطر واحد بفضل واجهة `SmsGateway`.

## الخطوات (مرة واحدة)
1. أنشئ تطبيقاً على [Meta for Developers](https://developers.facebook.com/) ← أضف منتج **WhatsApp**.
2. احصل على:
   - **Phone Number ID** (معرّف رقم الواتساب) → `WHATSAPP_CLOUD_PHONE_NUMBER_ID`
   - **Permanent Access Token** (توكن دائم عبر System User) → `WHATSAPP_CLOUD_ACCESS_TOKEN`
3. أنشئ قالب رسالة من فئة **Authentication** باسم `rafeeq_otp` (أو غيّر الاسم في الإعداد):
   - النوع: Authentication · يحتوي **معامل واحد** للرمز + زر **Copy code** (افتراضي).
   - اللغة: العربية (`ar`). انتظر اعتماد Meta للقالب.
4. عبّئ `backend/.env`:
   ```env
   SMS_DRIVER=whatsapp_cloud
   WHATSAPP_CLOUD_PHONE_NUMBER_ID=xxxxxxxxxxxxxxx
   WHATSAPP_CLOUD_ACCESS_TOKEN=EAA...
   WHATSAPP_CLOUD_TEMPLATE=rafeeq_otp
   WHATSAPP_CLOUD_TEMPLATE_LANG=ar
   WHATSAPP_CLOUD_TEMPLATE_BUTTON=true
   ```
5. شغّل `php artisan config:clear` ثم جرّب التسجيل من التطبيق — يصلك الرمز على واتساب.

## كيف يعمل داخلياً
- `Infrastructure/Sms/WhatsAppCloudSmsGateway` يرسل:
  `POST https://graph.facebook.com/{version}/{phone_number_id}/messages` بـ `Authorization: Bearer`.
- وضع **template** (افتراضي): قالب authentication + الرمز كمعامل body (والزر يكرّره) — يصل للمستخدم خارج نافذة 24 ساعة (مطلوب للـ OTP).
- وضع **text**: نص حرّ — فقط داخل نافذة محادثة مفتوحة.
- الرمز يُستخرج من رسالة الـ OTP تلقائياً (`\d{4,8}`).

## الصلابة (Resilience)
- إن لم تُضبط المفاتيح → استثناء واضح `WHATSAPP_CLOUD_NOT_CONFIGURED` (لا يُسقط الخادم).
- عند فشل Meta → يُسجَّل الخطأ ويُرجَع للمستخدم "تعذّر الإرسال، حاول لاحقاً".
- الرقم يُطبَّع تلقائياً (07/00962/+962 → 9627XXXXXXXX). الأرقام تُخفّى في اللوق.

## التوسّع المستقبلي
لتفعيل مزوّد SMS أردني (زين/أمنية/مجمّع محلي) لاسم مرسل "رفيق": فعّل `SMS_DRIVER=http` واضبط `SMS_BASE_URL`/`SMS_API_KEY` (`HttpSmsGateway`)، أو أضف بوابة جديدة وسطر ربط واحد في `InfrastructureServiceProvider`.

## الاختبارات
`tests/Feature/WhatsAppCloudOtpTest.php` (4): إرسال القالب باستخراج الرمز + Bearer، وضع النص، استثناء عند غياب الإعداد، استثناء عند خطأ Meta.
