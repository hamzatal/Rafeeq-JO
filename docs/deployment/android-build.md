# بناء تطبيقات الأندرويد (APK) عبر EAS

دليل عملي لبناء **APK** قابل للتثبيت على هاتفك لتجربة تطبيقات UniGo/رفيق (الطالب + الكابتن). لوحة الإدارة تُنشر كموقع (Vercel/سيرفر)، لا تحتاج APK.

## المتطلبات (مرة واحدة)
1. حساب Expo مجاني: <https://expo.dev>.
2. تثبيت الأدوات:
   ```bash
   npm install -g eas-cli
   eas login
   ```
3. الباك إند لازم يكون **واصلاً من الإنترنت** (سيرفر، أو نفق مؤقّت مثل `ngrok http 8000` / `cloudflared`).
4. **مفتاح Google Maps** مضبوط بالباك إند (`GOOGLE_MAPS_KEY`) لتظهر خريطة Google الحقيقية بدل OSM.

## ضبط عنوان الـ API
التطبيق يقرأ `apiUrl` من `app.json` → `expo.extra.apiUrl` (الافتراضي `http://localhost:8000` لا يعمل على جهاز حقيقي).
عدّلها لعنوان الباك إند الواصل قبل البناء، مثلاً:
```jsonc
// frontend/student-app/app.json  (و driver-app/app.json)
"extra": { "apiUrl": "https://api.example.com", "mapsKey": "" }
```

## أول مرة لكل تطبيق (ربط مشروع EAS)
```bash
cd frontend/student-app     # ثم كرّر لـ driver-app
eas init            # يربط المشروع + يضيف extra.eas.projectId في app.json
```

## بناء الـ APK (للتجربة)
```bash
cd frontend/student-app
eas build --platform android --profile preview
# انتظر البناء على سحابة Expo → بيطلع رابط APK بنهايته
```
- افتح الرابط على هاتف الأندرويد ونزّل الـAPK وثبّته (فعّل «تثبيت من مصادر غير معروفة»).
- كرّر لـ `frontend/driver-app`.

## بديل أسرع للمعاينة (بدون بناء)
```bash
cd frontend/student-app
npx expo start
```
امسح الـQR بتطبيق **Expo Go** — بس بعض الميزات الأصلية (الإشعارات/الخريطة) قد لا تعمل كاملة؛ للتجربة الكاملة استخدم بناء الـAPK أعلاه.

## بروفايلات البناء (`eas.json`)
| Profile | المخرج | الاستخدام |
|---------|--------|-----------|
| `development` | APK + dev client | تطوير مع hot reload |
| `preview` | **APK** | التجربة على جهازك (الأنسب لك الآن) |
| `production` | AAB (app-bundle) | الرفع على Google Play |

## للإطلاق على Google Play (لاحقاً)
```bash
eas build --platform android --profile production   # ينتج AAB
eas submit --platform android --profile production  # يرفع على Play (يتطلب حساب مطوّر)
```
> ملاحظة: لا تنشر على المتاجر قبل تثبيت الاسم النهائي قانونياً (راجع `business/BRAND_NAMING.md`) — لأن `package`/`bundleIdentifier` لا يتغيّران بعد النشر.
