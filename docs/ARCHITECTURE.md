# المرجع المعماري الشامل — رفيق (Rafeeq)

> مرجع واحد لكل ما هو مهم في المشروع. يُقرأ مع `PROGRESS.md` (الحالة الحيّة) و`ROADMAP.md` و`DESIGN.md` و`SECURITY.md`.

## 1) نظرة عامة
منصّة نقل وخدمات طلابية في الأردن. النموذج الأساسي: **تجميع باب-لباب حسب المنطقة (Zone Pooling)** — الطالب يطلب من بيته إلى جامعته، ومحرّك المطابقة يجمّع طلاب نفس المنطقة + الجامعة في رحلة واحدة لكابتن (سيارة خاصة، سعة 4 افتراضي / 7 أقصى) + اشتراكات مجدولة + رحلات Express.

## 2) التقنيات
- **Backend**: Laravel 11 (PHP 8.2)، Modular Monolith، namespace `Rafeeq\`. مال بالفلس (int)، مفاتيح UUID، Sanctum، RBAC، Audit.
- **Frontend (monorepo npm)**: `student-app` + `driver-app` (Expo RN + expo-router) · `admin-dashboard` (Next.js 14 + Tailwind) · `packages/shared` (تصميم + i18n + أنواع) · `packages/api-client` (عميل REST نوعي).
- DB: PostgreSQL + PostGIS (لاحقاً)؛ حالياً lat/lng decimal. Redis (cache/queue/broadcast). بثّ: Reverb. دفع: CliQ. AI: OpenAI. Push: FCM.

## 3) طبقات الـ Backend
`Core` (ApiResponse/BaseService/Repository/Exceptions/Middleware/RBAC/Audit) · `Shared` (Enums + Traits) · `Infrastructure` (SMS · Push/FCM · Gpt/OpenAI) · `Modules` (المجال) · بثّ Events.

### الموديولات (21)
| الموديول | الوظيفة |
|---|---|
| Auth · Users · Students · Drivers | الهوية + الملفات + توثيق الكباتن |
| Universities · Areas · PickupPoints · Routes · Zones | الكتالوج الجغرافي |
| Subscriptions | الخطط + اشتراكات الطلاب |
| RideRequests · Matching | طلب باب-لباب + محرّك التجميع + **تسعير Express/min-fill** |
| Trips | الرحلات + Trip OTP + التتبّع + بث Reverb |
| Wallet | محفظة مسبقة الدفع (فلس) |
| Payments | CliQ + **GPT Vision** + اعتماد تلقائي/يدوي + تفعيل الاشتراك/الشحن |
| Notifications | DB + FCM + **SMS fallback للحرج** + تفضيلات |
| Ratings | تقييم ثنائي + متوسط الكابتن |
| Support | تذاكر L1–L4 + تصعيد |
| Complaints | تصنيف خطورة + **تجميد فوري بالحرج** + تنبيه فريق السلامة |
| Safety | Risk Flags + Cancellation Logs + كشف احتيال + **SOS** |
| Parcels | توصيل طرود + **OTP مزدوج (استلام/تسليم)** + سلسلة عهدة |
| Rewards | نقاط + مستويات + كسب تلقائي بالرحلات |
| LostFound · Exchange | المفقودات (مطابقة) + التبادل الطلابي |

## 4) دورة المال ومكافحة الاحتيال (أولوية قصوى)
- كل الدفع عبر **CliQ** → محفظة مسبقة الدفع. الكابتن يتقاضى **من المنصة** (لا كاش) + حجز العمولة (config: 15%).
- **OTP صعود + OTP إنزال/تسليم** على الطرفين. تسجيل الإلغاءات + Risk Flags + SOS. الشكوى الحرجة → تجميد فوري + تحقيق.
- التسعير: أجرة أساس + رسوم Express + مضاعف ذروة **ضمن سقف عادل** عند نقص الركّاب (min-fill) + معاينة أرباح الكابتن.

## 5) عميل الـ API (نطاقات `RafeeqApi`)
auth · profile · driver · admin · catalog · transport · driverTrips · wallet · payments · notifications · ratings · rideRequests · support · complaints · parcels · rewards · lostFound · exchange. كلها نوعية، استجابة موحّدة `{data,meta,message}`، Accept-Language تلقائي.

## 6) نظام التصميم (DS v2) — راجع `DESIGN.md`
هوية أردنية: أخضر `#0B7A43` + ذهبي `#E6B23E` + أحمر `#CE1126`، فاتح/داكن. مكوّنات موحّدة + أيقونات Feather + Bottom Tabs. **تطبيق الطالب أُعيد تصميمه بالكامل**؛ الكابتن/الإدارة يرثان الهوية (إعادة تصميم شاشاتهما الكاملة قيد العمل).

## 7) التكاملات اليدوية (مفاتيح env — كلها اختيارية ويعمل النظام بدونها)
| التكامل | env | بدونها |
|---|---|---|
| OpenAI (Vision/AI) | `OPENAI_API_KEY` | مراجعة دفع يدوية |
| Firebase FCM | `FIREBASE_*` | إشعار داخل التطبيق فقط (log) |
| CliQ | `CLIQ_*` | تعليمات تحويل عامة |
| SMS | `SMS_*` | log |
| Reverb | `REVERB_*` + `extra.reverb*` | polling |
| الخرائط | `GOOGLE_MAPS_KEY`/`MAPBOX_TOKEN` | إحداثيات نصية |

## 8) التشغيل محلياً
- Backend: `cd backend && composer install && php artisan migrate:fresh --seed && php artisan serve`
- Frontend: `cd frontend && npm install` ثم `npm run student` / `npm run driver` / `npm run admin`
- CI (GitHub Actions): يشغّل إقلاع Laravel + `tsc` للتطبيقات الثلاثة عند كل push.

## 9) الحالة (~82%)
- ✅ **مكتمل**: كل backend القلب التشغيلي + الخدمات الإضافية + الدفع + الإشعارات + التقييم + الدعم/الشكاوى + الأمان/SOS + عميل API كامل + **تطبيق الطالب (تصميم كامل)** + CI + تدقيق أمني.
- ⏳ **متبقٍّ**: إعادة تصميم كاملة لتطبيق الكابتن ولوحة الإدارة + شاشات Auth/Onboarding + **طبقة AI** (مساعد/Fraud Monitor/Route Intelligence) + **خرائط فعلية** + صفحات إدارة (تحليلات/إعدادات/Audit UI) + صلابة الإطلاق (اختبارات/Docker/PostGIS/سياسات قانونية).
