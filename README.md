<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:002045,100:006A65&height=210&section=header&text=Rafeeq%20%7C%20%D8%B1%D9%81%D9%8A%D9%82&fontColor=ffffff&fontSize=68&fontAlignY=38&desc=Smart%20University%20Mobility%20%26%20Services%20Platform&descSize=18&descAlignY=60" alt="Rafeeq" width="100%" />

<br/>

<a href="#"><img src="https://readme-typing-svg.demolab.com/?font=IBM+Plex+Sans+Arabic&size=22&duration=3200&pause=800&color=006A65&center=true&vCenter=true&width=720&lines=%D9%85%D9%86%D8%B5%D8%A9+%D8%A7%D9%84%D9%86%D9%82%D9%84+%D8%A7%D9%84%D8%AC%D8%A7%D9%85%D8%B9%D9%8A+%D8%A7%D9%84%D8%B0%D9%83%D9%8A+%D9%81%D9%8A+%D8%A7%D9%84%D8%A3%D8%B1%D8%AF%D9%86;Ride+%2B+Services+%2B+Safety+%2B+AI+in+one+platform;%D8%B7%D8%A7%D9%84%D8%A8+%D9%80+%D9%83%D8%A7%D8%A8%D8%AA%D9%86+%D9%80+%D8%A5%D8%AF%D8%A7%D8%B1%D8%A9" alt="tagline" /></a>

<br/><br/>

![Status](https://img.shields.io/badge/status-active%20development-2ea44f?style=for-the-badge)
![Backend Tests](https://img.shields.io/badge/backend%20tests-192%20passing-2ea44f?style=for-the-badge&logo=php&logoColor=white)
![PHPStan](https://img.shields.io/badge/PHPStan-level%205-8892BF?style=for-the-badge)
![License](https://img.shields.io/badge/license-Proprietary-002045?style=for-the-badge)

![Laravel](https://img.shields.io/badge/Laravel-12-FF2D20?style=flat-square&logo=laravel&logoColor=white)
![PHP](https://img.shields.io/badge/PHP-8.4-777BB4?style=flat-square&logo=php&logoColor=white)
![Expo](https://img.shields.io/badge/Expo-React%20Native-000020?style=flat-square&logo=expo&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-Admin-000000?style=flat-square&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-PostGIS-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-cache%2Fqueue-DC382D?style=flat-square&logo=redis&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT%20%2B%20Vision-412991?style=flat-square&logo=openai&logoColor=white)

</div>

---

## 🎯 ما هو رفيق؟ · What is Rafeeq?

**رفيق** منصّة متكاملة للنقل الجامعي والخدمات الطلابية في الأردن، مدعومة بالذكاء الاصطناعي.
ليست مجرد تطبيق حجز — بل **شبكة نقل + منصّة خدمات + نظام أمان + مساعد ذكي** في مكان واحد.

Rafeeq is an AI-powered platform for **campus mobility & student services** in Jordan —
pooled rides priced fairly by distance, a captain earnings system, safety controls,
in-app services, and a GPT-powered assistant.

<div align="center">

|  |  |  |
|:--:|:--:|:--:|
| 🚗 **رحلات مُجمّعة** | 💳 **محفظة + CliQ** | 🛡️ **أمان وتتبّع حيّ** |
| تسعير عادل بالمسافة والزون | شحن ودفع واشتراكات | SOS · كود صعود/نزول · مكافحة احتيال |
| 🧭 **مساعد رفيق (AI)** | 📊 **أرباح الكابتن** | 📣 **مساحات إعلانية** |
| اقتراحات ودعم عبر GPT | معاينة + تجميع يومي/أسبوعي | تُدار كلياً من لوحة التحكم |

</div>

---

## 🧩 المنصّة تتكوّن من · The three apps + core

| التطبيق | الوصف | التقنية | المنصّات |
|---------|--------|---------|----------|
| 📱 `frontend/student-app` | تطبيق الطالب | Expo (React Native + TS) | iOS · Android · Web |
| 🚕 `frontend/driver-app` | تطبيق الكابتن | Expo (React Native + TS) | iOS · Android · Web |
| 🖥️ `frontend/admin-dashboard` | لوحة الإدارة | Next.js + TS + Tailwind | Web |
| ⚙️ `backend` | الـ API والمنطق | Laravel 12 · PHP 8.4 | REST + WebSockets |
| 🎨 `frontend/packages/shared` | التصميم والأنواع المشتركة | TypeScript | — |
| 🔌 `frontend/packages/api-client` | عميل API موحّد | TypeScript | — |

---

## 🏗️ المعمارية · Architecture

```mermaid
flowchart TD
    subgraph Clients
        S["📱 Student App<br/>(Expo)"]
        D["🚕 Driver App<br/>(Expo)"]
        A["🖥️ Admin Dashboard<br/>(Next.js)"]
    end

    S & D & A -->|"@rafeeq/api-client<br/>REST + WebSockets"| API

    subgraph Backend["⚙️ Laravel 12 · Modular Monolith"]
        API["API Gateway<br/>(Sanctum · RBAC · Rate limit)"]
        MOD["Modules: Trips · Matching · Pricing · Wallet<br/>Payouts · Ads · Safety · Ratings · AI · …"]
        API --> MOD
    end

    MOD --> PG[("🐘 PostgreSQL<br/>+ PostGIS")]
    MOD --> RD[("🧰 Redis<br/>cache · queue · realtime")]
    MOD --> GPT["🤖 OpenAI<br/>GPT + Vision"]
    MOD --> CLIQ["💳 CliQ Payments"]
    MOD --> FCM["🔔 Firebase FCM"]
    MOD --> MAPS["🗺️ Maps"]
```

> **القرار المعماري:** *Modular Monolith* — أسرع للإطلاق، أرخص تشغيلياً، وقابل للتقسيم إلى خدمات لاحقاً.
> المصادقة **stateless Bearer tokens** (Sanctum) لكل العملاء لتفادي تعقيد CSRF.

---

## 💸 نموذج التسعير · Pricing model

```mermaid
flowchart LR
    R["طلب رحلة<br/>pickup → جامعة"] --> Z{"داخل منطقة<br/>مُغطّاة؟"}
    Z -->|"نعم + سعر موحّد"| M["🎯 سعر ثابت عادل<br/>(zone ↔ university)"]
    Z -->|"لا"| DPQ["📏 تسعير بالمسافة (GPS)<br/>فتح + كم + دقيقة + تعرفة ليلية"]
    M & DPQ --> C["🧮 عمولة المنصّة (%)"]
    C --> CAP["🚕 صافي أرباح الكابتن"]
```

- **مصفوفة موحّدة (منطقة↔جامعة):** سعر ثابت متوقّع للطالب داخل منطقته.
- **تسعير بالمسافة:** عند عدم توفّر سعر موحّد — عادل ومبني على GPS.
- **العمولة وكل المفاتيح** قابلة للضبط من لوحة التحكم بلا نشر كود.

---

## 🚀 التشغيل المحلي · Getting started

```bash
# 1) قواعد البيانات
docker compose up -d

# 2) الـ Backend  (Laravel 12 · PHP 8.4)
cd backend
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate --seed
php artisan serve
#   الجودة: composer test  ·  composer stan  ·  ./vendor/bin/pint

# 3) الـ Frontend  (workspace واحد تحت frontend/)
cd frontend
npm install
npm run student   # تطبيق الطالب
npm run driver    # تطبيق الكابتن
npm run admin     # لوحة الإدارة
#   التحقق: npm run typecheck --workspace=admin-dashboard
```

---

## 🗂️ بنية المشروع · Project structure

```
Rafeeq-JO/
├── backend/                 ⚙️  Laravel 12 modular monolith
│   ├── Core/                    نواة مشتركة (Http · Audit · Support · Permissions)
│   ├── Modules/                 وحدات المجال (Trips · Pricing · Wallet · Ads · …)
│   ├── Infrastructure/          تكاملات خارجية (Gpt · Maps · Sms · Push)
│   └── tests/                   194 اختبار (Feature + Unit + عقود التكامل)
├── frontend/
│   ├── student-app/         📱  Expo
│   ├── driver-app/          🚕  Expo
│   ├── admin-dashboard/     🖥️  Next.js
│   └── packages/            🎨  shared (theme/i18n/types) + api-client
└── docs/                    📚  توثيق مرقّم نظيف (00–12)
```

---

## 📚 التوثيق · Documentation

| # | الملف | الوصف |
|---|------|-------|
| 00 | [الرؤية](docs/00-VISION.md) | فكرة المشروع ومزاياه (غير تقني). |
| 01 | [الخطة الرئيسية](docs/01-MASTER-PLAN.md) | **مصدر التخطيط والحالة الوحيد.** |
| 02 | [التسعير والمناطق](docs/02-PRICING-ZONES.md) | محرّك التسعير بالمسافة + العمولة. |
| 03 | [نظام التصميم (Stitch)](docs/03-DESIGN-SYSTEM.md) | **الهوية الوحيدة المعتمدة.** |
| 04 | [المزايا](docs/04-FEATURES.md) | كتالوج المزايا + الإعلانات + AI. |
| 05–09 | [المعمارية](docs/05-ARCHITECTURE.md) · [قاعدة البيانات](docs/06-DATABASE.md) · [الأمان](docs/07-SECURITY.md) · [النشر](docs/08-DEPLOYMENT.md) · [العلامة](docs/09-BRAND-NAMING.md) | مراجع تقنية. |
| 10 | [مطابقة شاشات Stitch](docs/10-STITCH-SCREENS.md) | خريطة كل شاشة مقابل التصميم. |
| 11 | [اصطلاح الكوميت](docs/11-COMMIT-CONVENTION.md) | **الترقيم والصيغة الرسمية.** |
| 12 | [عقد التكامل](docs/12-INTEGRATION-CONTRACT.md) | ضمان تطابق الفرونت↔الباك إند. |

---

## 🛣️ خطة التنفيذ · Roadmap

| المرحلة | الوصف | الحالة |
|:---:|---|:---:|
| 0 | التأسيس والترتيب | ✅ 100% |
| 1 | أساس تصميم Stitch | ✅ 100% |
| 2 | إعادة بناء شاشات التطبيقات الثلاثة | ✅ 100% |
| 3 | التسعير بالمسافة + الزون + العمولة | ✅ 100% |
| 4 | الأمان (طبقة التطبيق) | ✅ 100% |
| 5 | التكامل والصحّة (عقود حيّة) | ✅ 100% |
| 6 | AI (GPT) + مزايا + إعلانات | 🔄 جارية |
| 7 | صلابة الإطلاق (نشر/قانوني) | ⏳ |

> التفاصيل الحيّة خطوة بخطوة في [docs/01-MASTER-PLAN.md](docs/01-MASTER-PLAN.md).

---

## 🤝 المساهمة · Contributing

- اصطلاح الكوميت (إلزامي): [`docs/11-COMMIT-CONVENTION.md`](docs/11-COMMIT-CONVENTION.md) — صيغة `[RFQ-<n>] type(scope): summary` بترقيم تسلسلي صارم.
- قبل أي دمج: `composer test` + `composer stan` (backend) و `npm run typecheck` (frontend) — كلها خضراء.

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:006A65,100:002045&height=110&section=footer" width="100%" alt="footer" />

**© رفيق Rafeeq — جميع الحقوق محفوظة · All rights reserved.**

</div>
