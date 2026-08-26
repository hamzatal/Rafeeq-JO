<!-- مولَّد آلياً — لا تحرّره يدوياً. -->
<!-- المصدر: backend/Core/Retention/RetentionPolicy.php -->
<!-- التوليد: php artisan rafeeq:retention-report --markdown > docs/legal/data-retention-ar.md -->

# مدّة الاحتفاظ بالبيانات — رفيق

> هذه الوثيقة **مولَّدة من الكود**، لا مكتوبة بجانبه.
>
> النسخة السابقة كُتبت يدوياً وانحرفت: وعدت باثني عشر شهراً لرموز دخول تُحذف
> بعد يوم واحد، وبأربعة وعشرين شهراً لتذاكر تُحفظ اثني عشر. الوعد الذي لا يستطيع
> الكود إظهاره ليس وعداً — فصار الجدول أدناه يُقرأ من `RetentionPolicy` مباشرة،
> ويؤكّده `rafeeq:retention-report` على الأرقام الحقيقية في قاعدة البيانات.

## ما نحذفه، ومتى، ولماذا

| البيان | الجدول | المدّة | السبب |
|---|---|---|---|
| `otp_codes` | `otp_codes` | **1 يوم** | A login code is useful for minutes. Keeping it for a day is already generous, and keeping it longer only creates something worth stealing. The privacy notice previously claimed 12 months, which was both wrong and worse than the truth. |
| `trip_tracking` | `trip_tracking` | **30 يوم** | The GPS trail of a completed trip is evidence in a dispute, and the dispute window is 30 days. After that it is a movement history with no purpose, which is exactly the kind of data that should not exist. |
| `driver_locations` | `driver_locations` | **7 يوم** | This is a worker's location OUTSIDE any trip — collected for the ghost-trip watch. It had no pruning at all, so the table was an indefinite movement log of every captain. Seven days covers the fraud review window and nothing beyond it. |
| `chat_messages` | `chat_messages` | **30 يوم** | In-trip chat is operational context for a dispute, on the same window as the tracking it accompanies. |
| `ai_messages` | `ai_messages` | **30 يوم** | Assistant transcripts are a convenience, not a record. They carry whatever the user typed, so the shortest defensible window applies. |
| `rafeeq_notifications` | `rafeeq_notifications` | **60 يوم** | A notification the user has not opened in two months will not be opened. Read ones are pruned sooner by the command. |
| `support_tickets` | `support_tickets` | **365 يوم** | A closed ticket is the history of a complaint, and complaints recur. A year lets a pattern be seen; longer serves nobody. |
| `driver_documents_rejected` | `driver_documents` | **30 يوم** | A REJECTED identity document has no remaining purpose, and these are the most sensitive files in the system: national ID, licence, insurance, criminal record certificate. They were never deleted — not on rejection, not on resignation. Thirty days is an appeal window. |
| `chat_conversations` | `chat_conversations` | **60 يوم** | A conversation outlives its messages, so the shell is left behind once chat_messages is pruned at 30 days. Sixty days clears the shells after their content is already gone. |
| `ai_conversations` | `ai_conversations` | **60 يوم** | Same shape as chat_conversations: the transcript goes at 30 days and the shell would otherwise remain forever. |
| `risk_flags` | `risk_flags` | **180 يوم** | A resolved fraud flag is a pattern for six months and noise after. UNRESOLVED flags are exempt — an open flag is an open case. |
| `audit_logs` | `audit_logs` | **730 يوم** | Two years, and financial actions are EXEMPT — they are kept for the statutory accounting period. Pruning the audit trail of a money movement would destroy the only defence in a dispute, so the command filters on action rather than trimming the table wholesale. |

## الاستثناءات — وهي مقصودة

**القيود المالية لا تُقلَّم.** كل حركة في سجلّ التدقيق تبدأ بواحدة من هذه البادئات
تُستثنى من نافذة السنتين، لأنّ تقليم أثر حركة مالية يُدمّر الدليل الوحيد عند النزاع،
ولأنّ المدّة القانونية للسجلّات المحاسبية أطول:

```
wallet.
payment.
payout.
trip.boarded
trip.booking_cancelled
account.
```

**علامات الخطر غير المحلولة لا تُحذف.** حذف بلاغ احتيال مفتوح لأنّه تقادَم هو
إغلاق تحقيق بالتقادم، لا بالنتيجة.

**وثائق الهوية المرفوضة يُحذف ملفّها قبل صفّها.** صفّ بلا ملف ثغرة محاسبية،
أمّا ملف بلا صفّ فبيانات محتفَظ بها لا يعرف أحد مكانها.

## عند حذف الحساب

تُستبدل كل حقول التعريف بقيم بديلة فريدة، ويُحذف الرقم الوطني ووثائق الهوية من
القرص ومن الجدول. ما يبقى هو القيود المالية وحدها، وهي **لا تُعرِّف أحداً** —
تفاصيلها في [`privacy-ar.md`](privacy-ar.md) §7.

## كيف تتحقّق بنفسك

```bash
# ما هو مُنفَّذ فعلاً، مقابل الأرقام الحقيقية في القاعدة
php artisan rafeeq:retention-report

# ما سيُحذف في التشغيل القادم — دون حذف
php artisan rafeeq:prune-retention --dry-run
```

