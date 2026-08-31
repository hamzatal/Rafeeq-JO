<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Complaints\Models\Complaint;
use Rafeeq\Modules\Coupons\Models\Coupon;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\Drivers\Models\Vehicle;
use Rafeeq\Modules\Notifications\Models\Notification;
use Rafeeq\Modules\Payments\Models\Payment;
use Rafeeq\Modules\Payments\Models\PaymentRequest;
use Rafeeq\Modules\Rewards\Models\RewardAccount;
use Rafeeq\Modules\RideRequests\Models\RideRequest;
use Rafeeq\Modules\Routes\Models\Route;
use Rafeeq\Modules\Safety\Models\DriverLocation;
use Rafeeq\Modules\Safety\Models\SosIncident;
use Rafeeq\Modules\Students\Models\StudentProfile;
use Rafeeq\Modules\Subscriptions\Models\Subscription;
use Rafeeq\Modules\Subscriptions\Models\SubscriptionPlan;
use Rafeeq\Modules\Subscriptions\Services\PlanSolvency;
use Rafeeq\Modules\Support\Models\SupportTicket;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Universities\Models\University;
use Rafeeq\Modules\Wallet\Models\Wallet;
use Rafeeq\Modules\Zones\Models\Zone;
use Rafeeq\Modules\Zones\Models\ZoneUniversityPrice;
use Rafeeq\Shared\Enums\ComplaintStatus;
use Rafeeq\Shared\Enums\DriverStatus;
use Rafeeq\Shared\Enums\Gender;
use Rafeeq\Shared\Enums\PaymentMethod;
use Rafeeq\Shared\Enums\PaymentPurpose;
use Rafeeq\Shared\Enums\PaymentStatus;
use Rafeeq\Shared\Enums\RideDirection;
use Rafeeq\Shared\Enums\RideRequestStatus;
use Rafeeq\Shared\Enums\RideType;
use Rafeeq\Shared\Enums\RiskSeverity;
use Rafeeq\Shared\Enums\SubscriptionStatus;
use Rafeeq\Shared\Enums\SubscriptionType;
use Rafeeq\Shared\Enums\TicketCategory;
use Rafeeq\Shared\Enums\TicketPriority;
use Rafeeq\Shared\Enums\TicketStatus;
use Rafeeq\Shared\Enums\TripStatus;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Rafeeq\Shared\Support\BlindIndex;
use RuntimeException;

/**
 * Demo data for evaluating the platform end-to-end (students, captains,
 * vehicles, wallets, subscriptions, coupons, complaints, notifications, trips).
 * Idempotent by phone/code. Run with: php artisan db:seed --class=Database\\Seeders\\DemoSeeder
 *
 * ── Why this refuses to run in production ──────────────────────────────────
 *
 * It creates FUNDED WALLETS. `seedStudents` writes balances of up to 25,000 fils and
 * `seedDrivers` up to 42,000 — spendable money, against accounts whose password was
 * a literal in this file — and
 * republished, in full, three times in `docs/engineering/OPERATIONS.md`. One `db:seed` against the wrong `DB_HOST` and
 * the platform has fifteen accounts anyone who read the repo can log into, holding
 * real balance, plus captains marked approved without a document ever being checked.
 *
 * There was no guard of any kind. Nothing about `php artisan db:seed --class=…`
 * announces which database it is pointed at.
 *
 * The password now comes from `DEMO_SEED_PASSWORD` with no default, for the same
 * reason `AdminUserSeeder` requires `SEED_ADMIN_PASSWORD`: a credential with a
 * fallback in the source tree is a published credential.
 */
class DemoSeeder extends Seeder
{
    private array $maleNames = ['أحمد علي', 'محمد خالد', 'يوسف سامي', 'عمر زياد', 'سامي نبيل', 'كرم فادي', 'حمزة طلال', 'ليث مازن'];

    private array $femaleNames = ['ليان فادي', 'سارة محمود', 'رهف أحمد', 'دانا سامر', 'مريم خالد', 'جنى وليد', 'تالا عماد'];

    /** One shared demo password, supplied by the operator and never defaulted. */
    private function demoPassword(): string
    {
        $value = env('DEMO_SEED_PASSWORD');

        if (! is_string($value) || mb_strlen(trim($value)) < 12) {
            throw new RuntimeException(
                'DEMO_SEED_PASSWORD is not set, or is shorter than 12 characters. DemoSeeder has no '
                .'default: the previous literal was published in this file and in the operations guide.'
            );
        }

        return trim($value);
    }

    public function run(): void
    {
        if (app()->environment('production')) {
            throw new RuntimeException(
                'DemoSeeder creates funded wallets and shared-password accounts. It must never run '
                .'against production. Point DB_* at a demo database, or set APP_ENV accordingly.'
            );
        }

        $unis = University::all();
        $zones = Zone::all();

        $plans = $this->seedPlans($unis);
        $students = $this->seedStudents($unis, $plans);
        $drivers = $this->seedDrivers($zones);
        $this->seedCoupons($unis);
        $this->seedComplaints($students, $drivers);
        $this->seedNotifications($students, $drivers);
        $this->seedTrips($drivers, $zones, $unis);
        $this->seedQueues($students, $drivers, $zones, $unis);

        $this->command?->info('DemoSeeder: '.count($students).' students, '.count($drivers).' captains, plus subscriptions/coupons/complaints/notifications/trips and the five admin queues.');
    }

    /**
     * Four plans, priced from the tariff rather than made up.
     *
     * ── What the old numbers were ────────────────────────────────────────────────
     *
     *     أسبوعية    7 000 fils · 12 rides
     *     شهرية     25 000 fils · UNLIMITED
     *     فصلية    120 000 fils · UNLIMITED
     *
     * Twelve mid-band rides cost the platform 12 × 1 275 = 15 300 fils in captain
     * payouts and were sold for 7 000. The two unlimited plans had no bound at all.
     * Every one of them would now be rejected by `PlanSolvency`, which is the point:
     * the seeder was the only place plan prices existed, so these fabricated numbers
     * were the de-facto product.
     *
     * ── How a price is derived now ───────────────────────────────────────────────
     *
     * Three quantities, all from the tariff:
     *
     *     floor = rides × captain_share      what the platform must pay out
     *     room  = rides × commission         the most it can discount (its own margin)
     *     price = floor + (1 − giveaway) × room
     *
     * `giveaway` is the share of our commission handed to the student, and it rises
     * with the length of the commitment — which is what a volume discount IS. The
     * result is floored to the nearest 250 fils (a quarter dinar, the same memorable
     * step the `Tariff` solo prices use) and then clamped back up to `floor`, so
     * rounding can never make a plan insolvent.
     *
     * Route-scoped where a route exists, because a plan priced against a real corridor
     * can offer a real saving. A global plan has to cover the priciest band in the
     * tariff, which makes it a poor deal for anyone on a short route — see
     * `PlanSolvency::rideFareFils`.
     */
    private function seedPlans($unis): array
    {
        $solvency = app(PlanSolvency::class);
        $uni = $unis->first();
        $route = $uni ? Route::where('university_id', $uni->id)->where('is_active', true)->first() : null;

        $fare = $solvency->rideFareFils($route?->id);
        $costPerRide = $solvency->costPerRideFils($route?->id);
        $commissionPerRide = $fare - $costPerRide;

        $defs = [
            ['name' => 'باقة يومية', 'type' => SubscriptionType::Daily, 'rides' => 2, 'days' => 1, 'giveaway' => 0.25],
            ['name' => 'باقة أسبوعية', 'type' => SubscriptionType::Weekly, 'rides' => 12, 'days' => 7, 'giveaway' => 0.50],
            ['name' => 'باقة شهرية', 'type' => SubscriptionType::Monthly, 'rides' => 44, 'days' => 30, 'giveaway' => 0.70],
            ['name' => 'باقة الفصل الدراسي', 'type' => SubscriptionType::Term, 'rides' => 120, 'days' => 120, 'giveaway' => 0.85],
        ];

        $plans = [];
        foreach ($defs as $d) {
            $floor = $costPerRide * $d['rides'];
            $room = $commissionPerRide * $d['rides'];
            $asked = $floor + (int) round((1 - $d['giveaway']) * $room);
            $price = max($floor, intdiv($asked, 250) * 250);

            $plans[] = SubscriptionPlan::firstOrCreate(
                ['name' => $d['name']],
                [
                    'university_id' => $uni?->id,
                    'route_id' => $route?->id,
                    'type' => $d['type'],
                    'price_fils' => $price,
                    'rides_count' => $d['rides'],
                    'duration_days' => $d['days'],
                    'is_active' => true,
                ],
            );
        }

        return $plans;
    }

    /** @return User[] */
    private function seedStudents($unis, array $plans): array
    {
        $students = [];
        $names = array_merge($this->maleNames, $this->femaleNames);
        foreach ($names as $i => $name) {
            $phone = '+96279'.str_pad((string) (100000 + $i), 7, '0', STR_PAD_LEFT);
            $isFemale = $i >= count($this->maleNames);

            // `firstOrCreate(['phone' => ...])` would issue `where phone = ?`, which
            // cannot match an encrypted column. Resolve through the blind index.
            $user = User::firstOrCreate(
                ['phone_hash' => BlindIndex::phone($phone)],
                [
                    'phone' => $phone,
                    'full_name' => $name,
                    'email' => 'student'.$i.'@demo.rafeeq.jo',
                    'password' => Hash::make($this->demoPassword()),
                    'type' => UserType::Student,
                    'status' => $i % 7 === 0 ? UserStatus::Suspended : UserStatus::Active,
                    'phone_verified_at' => now(),
                    'locale' => 'ar',
                ],
            );
            $user->syncRoles(['student']);

            StudentProfile::firstOrCreate(
                ['user_id' => $user->id],
                [
                    'university_id' => $unis->get($i % max($unis->count(), 1))?->id,
                    'student_number' => '2021'.str_pad((string) ($i + 1), 5, '0', STR_PAD_LEFT),
                    'faculty' => $isFemale ? 'الصيدلة' : 'الهندسة',
                    'gender' => $isFemale ? Gender::Female : Gender::Male,
                    'onboarded' => true,
                ],
            );

            Wallet::firstOrCreate(
                ['user_id' => $user->id],
                ['balance_fils' => [0, 5000, 12000, 25000][$i % 4], 'held_fils' => 0, 'currency' => 'JOD'],
            );

            RewardAccount::firstOrCreate(
                ['user_id' => $user->id],
                ['points' => ($i * 35) % 500, 'lifetime_points' => $i * 60],
            );

            // Give ~2/3 of students an active subscription.
            if ($i % 3 !== 0 && $plans) {
                $plan = $plans[$i % count($plans)];
                Subscription::firstOrCreate(
                    ['student_id' => $user->id, 'plan_id' => $plan->id],
                    [
                        'status' => SubscriptionStatus::Active,
                        'starts_at' => now()->subDays(5),
                        'ends_at' => now()->addDays($plan->duration_days - 5),
                        'remaining_rides' => $plan->rides_count,
                    ],
                );
            }

            $students[] = $user;
        }

        return $students;
    }

    /** @return DriverProfile[] */
    private function seedDrivers($zones): array
    {
        $statuses = [DriverStatus::Approved, DriverStatus::Approved, DriverStatus::Approved, DriverStatus::Pending, DriverStatus::UnderReview, DriverStatus::Suspended];
        $cars = [
            ['make' => 'Hyundai', 'model' => 'Elantra', 'color' => 'أبيض', 'seats' => 4],
            ['make' => 'Kia', 'model' => 'Cerato', 'color' => 'فضي', 'seats' => 4],
            ['make' => 'Toyota', 'model' => 'Corolla', 'color' => 'أسود', 'seats' => 4],
            ['make' => 'Hyundai', 'model' => 'Tucson', 'color' => 'رمادي', 'seats' => 6],
            ['make' => 'Kia', 'model' => 'Sportage', 'color' => 'أزرق', 'seats' => 6],
            ['make' => 'Toyota', 'model' => 'Hiace', 'color' => 'أبيض', 'seats' => 7],
        ];
        $drivers = [];
        foreach ($statuses as $i => $status) {
            $phone = '+96278'.str_pad((string) (200000 + $i), 7, '0', STR_PAD_LEFT);
            // `firstOrCreate(['phone' => ...])` would issue `where phone = ?`, which
            // cannot match an encrypted column. Resolve through the blind index.
            $user = User::firstOrCreate(
                ['phone_hash' => BlindIndex::phone($phone)],
                [
                    'phone' => $phone,
                    'full_name' => 'الكابتن '.$this->maleNames[$i % count($this->maleNames)],
                    'email' => 'driver'.$i.'@demo.rafeeq.jo',
                    'password' => Hash::make($this->demoPassword()),
                    'type' => UserType::Driver,
                    'status' => $status === DriverStatus::Suspended ? UserStatus::Suspended : UserStatus::Active,
                    'phone_verified_at' => now(),
                    'locale' => 'ar',
                ],
            );
            $user->syncRoles(['driver']);

            $driver = DriverProfile::firstOrCreate(
                ['user_id' => $user->id],
                [
                    'status' => $status,
                    'verification_level' => $status === DriverStatus::Approved ? 2 : 0,
                    'rating_avg' => [4.9, 4.7, 4.8, 0, 0, 3.9][$i],
                    'rating_count' => [120, 80, 95, 0, 0, 22][$i],
                    'total_trips' => [340, 210, 260, 0, 0, 60][$i],
                    'submitted_at' => now()->subDays(10 - $i),
                ],
            );

            $car = $cars[$i];
            Vehicle::firstOrCreate(
                ['driver_id' => $driver->id, 'plate_number' => str_pad((string) (10 + $i), 2, '0', STR_PAD_LEFT).'-'.(50000 + $i * 111)],
                ['make' => $car['make'], 'model' => $car['model'], 'year' => 2019 + ($i % 5), 'color' => $car['color'], 'seats' => $car['seats'], 'status' => 'active'],
            );

            Wallet::firstOrCreate(
                ['user_id' => $user->id],
                ['balance_fils' => [42000, 18000, 30000, 0, 0, 5000][$i], 'held_fils' => 0, 'currency' => 'JOD'],
            );

            $drivers[] = $driver;
        }

        return $drivers;
    }

    private function seedCoupons($unis): void
    {
        $defs = [
            ['code' => 'WELCOME10', 'desc' => 'خصم ترحيبي', 'type' => 'percentage', 'value' => 10, 'max' => 1500, 'expires' => now()->addMonths(2), 'first' => true],
            ['code' => 'RAMADAN5', 'desc' => 'خصم رمضان', 'type' => 'fixed', 'value' => 500, 'max' => null, 'expires' => now()->addDays(3), 'first' => false],
            ['code' => 'BACK2UNI', 'desc' => 'العودة للجامعة', 'type' => 'percentage', 'value' => 15, 'max' => 2500, 'expires' => now()->addWeeks(3), 'first' => false],
            ['code' => 'EXPIRED20', 'desc' => 'عرض منتهٍ', 'type' => 'percentage', 'value' => 20, 'max' => 3000, 'expires' => now()->subDays(2), 'first' => false],
        ];
        foreach ($defs as $d) {
            Coupon::firstOrCreate(
                ['code' => $d['code']],
                [
                    'description' => $d['desc'],
                    'type' => $d['type'],
                    'value' => $d['value'],
                    'max_discount_fils' => $d['max'],
                    'min_amount_fils' => 0,
                    'scope' => 'any',
                    'first_order_only' => $d['first'],
                    'usage_limit' => 500,
                    'per_user_limit' => 1,
                    'used_count' => random_int(0, 60),
                    'starts_at' => now()->subWeek(),
                    'expires_at' => $d['expires'],
                    'is_active' => true,
                ],
            );
        }
    }

    /** @param User[] $students @param DriverProfile[] $drivers */
    private function seedComplaints(array $students, array $drivers): void
    {
        $defs = [
            ['cat' => 'cleanliness', 'sev' => RiskSeverity::Low, 'st' => ComplaintStatus::Open, 'desc' => 'السيارة لم تكن نظيفة بما يكفي.'],
            ['cat' => 'driver', 'sev' => RiskSeverity::Medium, 'st' => ComplaintStatus::Investigating, 'desc' => 'الكابتن تأخر عن الموعد 20 دقيقة.'],
            ['cat' => 'payment', 'sev' => RiskSeverity::High, 'st' => ComplaintStatus::Open, 'desc' => 'تم خصم مبلغ غير صحيح من المحفظة.'],
            ['cat' => 'safety', 'sev' => RiskSeverity::Critical, 'st' => ComplaintStatus::Investigating, 'desc' => 'قيادة متهورة وسرعة زائدة أثناء الرحلة.'],
            ['cat' => 'other', 'sev' => RiskSeverity::Low, 'st' => ComplaintStatus::Resolved, 'desc' => 'استفسار عام عن الخدمة.'],
        ];
        foreach ($defs as $i => $d) {
            $reporter = $students[$i % count($students)] ?? null;
            $against = $drivers[$i % count($drivers)] ?? null;
            if (! $reporter) {
                continue;
            }
            Complaint::firstOrCreate(
                ['number' => 'CMP-DEMO-'.str_pad((string) ($i + 1), 3, '0', STR_PAD_LEFT)],
                [
                    'reporter_id' => $reporter->id,
                    'against_user_id' => $against?->user_id,
                    'against_type' => 'driver',
                    'category' => $d['cat'],
                    'severity' => $d['sev'],
                    'status' => $d['st'],
                    'description' => $d['desc'],
                ],
            );
        }
    }

    /** @param User[] $students @param DriverProfile[] $drivers */
    private function seedNotifications(array $students, array $drivers): void
    {
        foreach (array_slice($students, 0, 6) as $i => $s) {
            Notification::firstOrCreate(
                ['user_id' => $s->id, 'title' => 'وصلت رحلتك بأمان'],
                ['type' => 'trip', 'category' => 'trips', 'body' => 'نتمنى أن تكون رحلتك كانت مريحة. قيّم الكابتن من فضلك.', 'is_critical' => false, 'read_at' => $i % 2 === 0 ? now() : null],
            );
            Notification::firstOrCreate(
                ['user_id' => $s->id, 'title' => 'كوبون خصم خاص لك 🎁'],
                ['type' => 'promo', 'category' => 'marketing', 'body' => 'استخدم الرمز WELCOME10 واحصل على خصم 10% على رحلتك القادمة.', 'data' => ['coupon_code' => 'WELCOME10'], 'is_critical' => false],
            );
        }
    }

    /** @param DriverProfile[] $drivers */
    private function seedTrips(array $drivers, $zones, $unis): void
    {
        $approved = array_values(array_filter($drivers, fn ($d) => $d->status === DriverStatus::Approved));
        if (! $approved) {
            return;
        }
        $statuses = [TripStatus::Completed, TripStatus::Completed, TripStatus::Started, TripStatus::Scheduled, TripStatus::Cancelled];
        foreach ($statuses as $i => $st) {
            $driver = $approved[$i % count($approved)];
            Trip::firstOrCreate(
                ['driver_id' => $driver->id, 'scheduled_at' => now()->addHours($i - 2)->startOfHour()],
                [
                    'zone_id' => $zones->get($i % max($zones->count(), 1))?->id,
                    'university_id' => $unis->get($i % max($unis->count(), 1))?->id,
                    'type' => 'pool',
                    'status' => $st,
                    'capacity' => 4,
                    'fare_fils' => 1500,
                    'base_fare_fils' => 1500,
                    'started_at' => in_array($st, [TripStatus::Started, TripStatus::Completed], true) ? now()->subMinutes(30) : null,
                    'ended_at' => $st === TripStatus::Completed ? now()->subMinutes(5) : null,
                ],
            );
        }
    }

    /**
     * The five admin queues — live requests, CliQ top-ups, SOS, support, presence.
     *
     * ── Why these were missing, and why an empty queue is not neutral ──────────
     *
     * This seeder produced students, captains, plans, coupons, complaints, notifications
     * and five trips — and NOTHING in `ride_requests`, `payment_requests`, `payments`,
     * `sos_incidents`, `support_tickets` or `driver_locations`. So the demo database
     * exercised none of the screens an operator actually works: five of the eight
     * approved admin screens rendered «لا توجد…» over a correct but invisible table, and
     * the committed screenshots showed empty panels. A queue with no rows cannot show
     * whether its columns, its pills or its row actions are right.
     *
     * It also hid real defects. The «الأجرة» column, the «فحص AI» cell, the bidi
     * isolation on a masked IP — none of them render at all without a row, so each was
     * only findable by reading code rather than by looking.
     *
     * Everything below is DEMO data in a demo database, and this class already refuses
     * to run against production. But the shapes are honest: statuses come from the real
     * enums, fares from the tariff matrix, and the flags on a payment are the same
     * strings `FraudDetection` emits — so what the screens show is what production would
     * show, not a prettier version of it.
     */
    private function seedQueues(array $students, array $drivers, $zones, $unis): void
    {
        if (! $students || ! $drivers || $zones->isEmpty() || $unis->isEmpty()) {
            return;
        }

        $approved = array_values(array_filter($drivers, fn ($d) => $d->status === DriverStatus::Approved));

        // ── الطلبات الحيّة (34) ────────────────────────────────────────────────
        // A queue is only interesting when its rows differ: something waiting a while,
        // something express, something already grouped, something whole-car.
        $requests = [
            ['status' => RideRequestStatus::Pending, 'express' => false, 'solo' => false, 'age' => 14],
            ['status' => RideRequestStatus::Pending, 'express' => true, 'solo' => false, 'age' => 6],
            ['status' => RideRequestStatus::Pending, 'express' => false, 'solo' => true, 'age' => 3],
            ['status' => RideRequestStatus::Grouped, 'express' => false, 'solo' => false, 'age' => 22],
            ['status' => RideRequestStatus::Pending, 'express' => false, 'solo' => false, 'age' => 41],
        ];
        /*
         * ── Requests sit on corridors the tariff actually prices ─────────────────
         *
         * The first version paired each student with `zones[i]` and their own
         * university, and only one of five landed on a priced (zone × university) pair —
         * so «الأجرة» read «—» four times out of five. That is the CORRECT rendering for
         * an unpriced corridor (`/estimate` returns `unpriced_corridor` rather than
         * inventing a distance fare), but as a demo it showed the exception as the rule
         * and left the fare column untested.
         *
         * `ZoneUniversityPriceSeeder` opens four corridors at launch. Requests are placed
         * on those, and the LAST one is left deliberately unpriced — that state is real,
         * an operator has to be able to spot it, and a demo where it never appears hides
         * a case worth seeing.
         */
        $corridors = ZoneUniversityPrice::query()->where('is_active', true)->get();

        foreach ($requests as $i => $row) {
            $student = $students[$i % count($students)];
            $priced = $i < count($requests) - 1 ? $corridors->get($i % max($corridors->count(), 1)) : null;
            $zone = $priced ? $zones->firstWhere('id', $priced->zone_id) : $zones->get($i % $zones->count());

            RideRequest::firstOrCreate(
                ['student_id' => $student->id, 'desired_time' => now()->addMinutes(30 + $i * 15)->startOfMinute()],
                [
                    'zone_id' => $zone?->id,
                    'university_id' => $priced?->university_id
                        ?? $student->studentProfile?->university_id
                        ?? $unis->first()->id,
                    'pickup_lat' => (float) ($zone?->center_lat ?? 31.95),
                    'pickup_lng' => (float) ($zone?->center_lng ?? 35.91),
                    'pickup_address' => $zone?->name_ar,
                    'type' => $row['express'] ? RideType::Express : RideType::Scheduled,
                    'direction' => RideDirection::ToUniversity,
                    'is_express' => $row['express'],
                    'is_solo' => $row['solo'],
                    // Express is a real surcharge on the tariff, not a made-up number.
                    'express_fee_fils' => $row['express'] ? (int) config('rafeeq.express_fee_fils', 500) : 0,
                    'status' => $row['status'],
                    'payment_method' => PaymentMethod::Wallet,
                    'created_at' => now()->subMinutes($row['age']),
                ],
            );
        }

        // ── المدفوعات — شحن CliQ (37) ─────────────────────────────────────────
        // The review queue exists for the AMBIGUOUS cases, so the demo carries them:
        // a clean high-confidence proof, one the model was unsure about, one flagged as
        // a duplicate reference, and one with no proof uploaded yet.
        $topups = [
            ['amount' => 10_000, 'status' => PaymentStatus::Submitted, 'confidence' => 96, 'flags' => [], 'ref' => 'CLIQ8842731', 'proof' => true, 'age' => 8],
            ['amount' => 25_000, 'status' => PaymentStatus::UnderReview, 'confidence' => 54, 'flags' => [], 'ref' => 'CLIQ8842118', 'proof' => true, 'age' => 47],
            ['amount' => 5_000, 'status' => PaymentStatus::UnderReview, 'confidence' => 71, 'flags' => ['duplicate_reference'], 'ref' => 'CLIQ8842731', 'proof' => true, 'age' => 96],
            ['amount' => 15_000, 'status' => PaymentStatus::Pending, 'confidence' => null, 'flags' => [], 'ref' => null, 'proof' => false, 'age' => 3],
        ];
        foreach ($topups as $i => $row) {
            $student = $students[$i % count($students)];
            $request = PaymentRequest::firstOrCreate(
                ['number' => 'PR-DEMO-'.str_pad((string) ($i + 1), 4, '0', STR_PAD_LEFT)],
                [
                    'user_id' => $student->id,
                    'purpose' => PaymentPurpose::WalletTopup,
                    'amount_fils' => $row['amount'],
                    'currency' => 'JOD',
                    'method' => 'cliq',
                    'status' => $row['status'],
                    'expires_at' => now()->addHours(24),
                    'created_at' => now()->subMinutes($row['age']),
                ],
            );

            Payment::firstOrCreate(
                ['payment_request_id' => $request->id],
                [
                    'method' => 'cliq',
                    'status' => $row['status']->value,
                    'ai_confidence' => $row['confidence'],
                    'bank_reference' => $row['ref'],
                    'fraud_flags' => $row['flags'] ?: null,
                    // `proof_path` is what `has_proof` reports. No file is written: the
                    // dashboard only asks whether one exists to enable «عرض».
                    'proof_path' => $row['proof'] ? 'demo/proofs/'.$request->number.'.jpg' : null,
                    'extracted' => $row['proof'] ? ['sender_name' => $student->full_name] : null,
                    'submitted_at' => $row['proof'] ? now()->subMinutes($row['age']) : null,
                    'created_at' => now()->subMinutes($row['age']),
                ],
            );
        }

        // ── السلامة و SOS (38) ────────────────────────────────────────────────
        // One open incident, one already acknowledged, one closed — the three states the
        // screen's row actions branch on.
        $trip = Trip::query()->latest()->first();
        $incidents = [
            ['status' => 'open', 'age' => 4, 'note' => 'الكابتن سلك طريقاً غير المعتاد ولا يردّ.'],
            ['status' => 'acknowledged', 'age' => 38, 'note' => 'شعور بعدم الأمان — تم التواصل مع الطالبة.'],
            ['status' => 'resolved', 'age' => 260, 'note' => 'ضغط بالخطأ.'],
        ];
        foreach ($incidents as $i => $row) {
            $student = $students[$i % count($students)];
            $zone = $zones->get($i % $zones->count());
            SosIncident::firstOrCreate(
                ['user_id' => $student->id, 'created_at' => now()->subMinutes($row['age'])],
                [
                    'trip_id' => $i === 0 ? $trip?->id : null,
                    'lat' => (float) ($zone?->center_lat ?? 31.95),
                    'lng' => (float) ($zone?->center_lng ?? 35.91),
                    'status' => $row['status'],
                    'note' => $row['note'],
                    'resolved_at' => $row['status'] === 'resolved' ? now()->subMinutes($row['age'] - 20) : null,
                ],
            );
        }

        // ── الدعم والشكاوى (40) ───────────────────────────────────────────────
        $tickets = [
            ['category' => TicketCategory::Payment, 'subject' => 'شحنتُ 25 دينار ولم تظهر في المحفظة', 'status' => TicketStatus::Open, 'priority' => TicketPriority::High, 'level' => 2, 'age' => 26],
            ['category' => TicketCategory::Trip, 'subject' => 'الكابتن تأخّر 20 دقيقة عن موعد الالتقاط', 'status' => TicketStatus::Open, 'priority' => TicketPriority::Normal, 'level' => 1, 'age' => 55],
            ['category' => TicketCategory::Subscription, 'subject' => 'أريد تحويل اشتراكي لمسار آخر', 'status' => TicketStatus::Pending, 'priority' => TicketPriority::Low, 'level' => 1, 'age' => 180],
            ['category' => TicketCategory::Technical, 'subject' => 'التطبيق يُغلق عند فتح الخريطة', 'status' => TicketStatus::Escalated, 'priority' => TicketPriority::Urgent, 'level' => 3, 'age' => 12],
        ];
        foreach ($tickets as $i => $row) {
            $student = $students[$i % count($students)];
            SupportTicket::firstOrCreate(
                ['number' => 'TK-DEMO-'.str_pad((string) ($i + 1), 4, '0', STR_PAD_LEFT)],
                [
                    'user_id' => $student->id,
                    'category' => $row['category'],
                    'subject' => $row['subject'],
                    'status' => $row['status'],
                    'priority' => $row['priority'],
                    'level' => $row['level'],
                    'created_at' => now()->subMinutes($row['age']),
                ],
            );
        }

        // ── «كباتن متصلون» (33) ───────────────────────────────────────────────
        // A location ping is what presence MEANS here — `AdminInsightsService::counts()`
        // counts distinct captains seen in the last 15 minutes. Without a single row the
        // dashboard's card is a truthful zero that demonstrates nothing, so two of the
        // approved captains are on shift and one pinged an hour ago (outside the window,
        // which is what proves the window works).
        foreach ($approved as $i => $driver) {
            $zone = $zones->get($i % $zones->count());
            DriverLocation::firstOrCreate(
                ['driver_id' => $driver->id, 'recorded_at' => now()->subMinutes($i === 2 ? 64 : $i * 3 + 1)],
                [
                    'lat' => (float) ($zone?->center_lat ?? 31.95),
                    'lng' => (float) ($zone?->center_lng ?? 35.91),
                    'speed' => $i === 2 ? 0.0 : 26.5,
                ],
            );
        }
    }
}
