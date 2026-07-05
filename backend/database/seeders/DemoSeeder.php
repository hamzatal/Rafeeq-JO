<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Complaints\Models\Complaint;
use Rafeeq\Modules\Coupons\Models\Coupon;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\Drivers\Models\Vehicle;
use Rafeeq\Modules\Notifications\Models\Notification;
use Rafeeq\Modules\Rewards\Models\RewardAccount;
use Rafeeq\Modules\Students\Models\StudentProfile;
use Rafeeq\Modules\Subscriptions\Models\Subscription;
use Rafeeq\Modules\Subscriptions\Models\SubscriptionPlan;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Universities\Models\University;
use Rafeeq\Modules\Wallet\Models\Wallet;
use Rafeeq\Modules\Zones\Models\Zone;
use Rafeeq\Modules\Addresses\Models\SavedAddress;
use Rafeeq\Modules\RideRequests\Models\RideRequest;
use Rafeeq\Modules\Payments\Models\PaymentRequest;
use Rafeeq\Modules\Payouts\Models\PayoutRequest;
use Rafeeq\Modules\Disputes\Models\Dispute;
use Rafeeq\Modules\Support\Models\SupportTicket;
use Rafeeq\Shared\Enums\ComplaintStatus;
use Rafeeq\Shared\Enums\DriverStatus;
use Rafeeq\Shared\Enums\Gender;
use Rafeeq\Shared\Enums\RiskSeverity;
use Rafeeq\Shared\Enums\SubscriptionStatus;
use Rafeeq\Shared\Enums\SubscriptionType;
use Rafeeq\Shared\Enums\TripStatus;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;

/**
 * Demo data for evaluating the platform end-to-end (students, captains,
 * vehicles, wallets, subscriptions, coupons, complaints, notifications, trips).
 * Idempotent by phone/code. Run with: php artisan db:seed --class=Database\\Seeders\\DemoSeeder
 */
class DemoSeeder extends Seeder
{
    private array $maleNames = ['أحمد علي', 'محمد خالد', 'يوسف سامي', 'عمر زياد', 'سامي نبيل', 'كرم فادي', 'حمزة طلال', 'ليث مازن'];

    private array $femaleNames = ['ليان فادي', 'سارة محمود', 'رهف أحمد', 'دانا سامر', 'مريم خالد', 'جنى وليد', 'تالا عماد'];

    public function run(): void
    {
        $unis = University::all();
        $zones = Zone::all();

        $plans = $this->seedPlans($unis);
        $students = $this->seedStudents($unis, $plans);
        $drivers = $this->seedDrivers($zones);
        $this->seedCoupons($unis);
        $this->seedComplaints($students, $drivers);
        $this->seedNotifications($students, $drivers);
        $this->seedTrips($drivers, $zones, $unis);
        $this->seedAddresses($students);
        $this->seedRideRequests($students, $unis, $zones);
        $this->seedPaymentRequests($students);
        $this->seedPayouts($drivers);
        $this->seedDisputes($students, $drivers);
        $this->seedSupport($students);

        $this->command?->info('DemoSeeder: '.count($students).' students, '.count($drivers).' captains, plus subscriptions, coupons, complaints, notifications, trips, saved addresses, ride requests, pending payments/payouts, disputes and support tickets (admin attention badges will light up).');
    }


    /** @return SubscriptionPlan[] */
    private function seedPlans($unis): array
    {
        $uniId = $unis->first()?->id;
        $defs = [
            ['name' => 'باقة أسبوعية', 'type' => SubscriptionType::Weekly, 'price' => 7000, 'rides' => 12, 'days' => 7],
            ['name' => 'باقة شهرية', 'type' => SubscriptionType::Monthly, 'price' => 25000, 'rides' => null, 'days' => 30],
            ['name' => 'باقة الفصل الدراسي', 'type' => SubscriptionType::Term, 'price' => 120000, 'rides' => null, 'days' => 120],
        ];
        $plans = [];
        foreach ($defs as $d) {
            $plans[] = SubscriptionPlan::firstOrCreate(
                ['name' => $d['name']],
                [
                    'university_id' => $uniId,
                    'type' => $d['type'],
                    'price_fils' => $d['price'],
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

            $user = User::firstOrCreate(
                ['phone' => $phone],
                [
                    'full_name' => $name,
                    'email' => 'student'.$i.'@demo.rafeeq.jo',
                    'password' => Hash::make('Rafeeq@2026'),
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
            $user = User::firstOrCreate(
                ['phone' => $phone],
                [
                    'full_name' => 'الكابتن '.$this->maleNames[$i % count($this->maleNames)],
                    'email' => 'driver'.$i.'@demo.rafeeq.jo',
                    'password' => Hash::make('Rafeeq@2026'),
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

    /** Saved home/university destinations so the student home shows quick places. @param User[] $students */
    private function seedAddresses(array $students): void
    {
        $defs = [
            ['label' => 'home', 'title' => 'المنزل', 'address' => 'إربد - شارع الجامعة، بناية 12', 'lat' => 32.5486, 'lng' => 35.8560, 'default' => true],
            ['label' => 'university', 'title' => 'الجامعة', 'address' => 'جامعة اليرموك - البوابة الشمالية', 'lat' => 32.5361, 'lng' => 35.8536, 'default' => false],
        ];
        foreach (array_slice($students, 0, 8) as $s) {
            foreach ($defs as $d) {
                SavedAddress::firstOrCreate(
                    ['user_id' => $s->id, 'label' => $d['label']],
                    ['title' => $d['title'], 'address_text' => $d['address'], 'lat' => $d['lat'], 'lng' => $d['lng'], 'is_default' => $d['default']],
                );
            }
        }
    }

    /** A spread of ride requests (pending/grouped/completed) for the student "my requests" list + admin queue. @param User[] $students */
    private function seedRideRequests(array $students, $unis, $zones): void
    {
        $statuses = ['pending', 'grouped', 'assigned', 'completed', 'cancelled'];
        foreach ($statuses as $i => $status) {
            $student = $students[$i % count($students)] ?? null;
            $uni = $unis->get($i % max($unis->count(), 1));
            if (! $student || ! $uni) {
                continue;
            }
            RideRequest::updateOrCreate(
                ['student_id' => $student->id, 'university_id' => $uni->id, 'desired_time' => now()->addHours($i + 1)->startOfHour()],
                [
                    'zone_id' => $zones->get($i % max($zones->count(), 1))?->id,
                    'pickup_lat' => 32.5480 + $i * 0.002,
                    'pickup_lng' => 35.8555 + $i * 0.002,
                    'pickup_address' => 'إربد - نقطة انطلاق '.($i + 1),
                    'type' => $i % 2 === 0 ? 'scheduled' : 'express',
                    'is_express' => $i % 2 !== 0,
                    'express_fee_fils' => $i % 2 !== 0 ? 500 : 0,
                    'status' => $status,
                ],
            );
        }
    }

    /** Pending CliQ payment requests (wallet top-ups + subscription) → admin payments badge. @param User[] $students */
    private function seedPaymentRequests(array $students): void
    {
        $defs = [
            ['purpose' => 'wallet_topup', 'amount' => 10000, 'status' => 'pending'],
            ['purpose' => 'wallet_topup', 'amount' => 5000, 'status' => 'pending'],
            ['purpose' => 'subscription', 'amount' => 25000, 'status' => 'pending'],
            ['purpose' => 'wallet_topup', 'amount' => 20000, 'status' => 'approved'],
        ];
        foreach ($defs as $i => $d) {
            $student = $students[$i % count($students)] ?? null;
            if (! $student) {
                continue;
            }
            PaymentRequest::firstOrCreate(
                ['number' => 'PR-DEMO-'.str_pad((string) ($i + 1), 4, '0', STR_PAD_LEFT)],
                [
                    'user_id' => $student->id,
                    'purpose' => $d['purpose'],
                    'amount_fils' => $d['amount'],
                    'currency' => 'JOD',
                    'method' => 'cliq',
                    'status' => $d['status'],
                    'expires_at' => now()->addDays(2),
                    'approved_at' => $d['status'] === 'approved' ? now()->subHour() : null,
                ],
            );
        }
    }

    /** Pending captain payout requests → admin withdrawals badge. @param DriverProfile[] $drivers */
    private function seedPayouts(array $drivers): void
    {
        $approved = array_values(array_filter($drivers, fn ($d) => $d->status === DriverStatus::Approved));
        foreach (array_slice($approved, 0, 3) as $i => $driver) {
            PayoutRequest::firstOrCreate(
                ['captain_user_id' => $driver->user_id, 'amount_fils' => 15000 + $i * 5000],
                [
                    'method' => 'cliq',
                    'destination' => '+96279'.str_pad((string) (300000 + $i), 7, '0', STR_PAD_LEFT),
                    'status' => $i === 0 ? 'pending' : ($i === 1 ? 'pending' : 'paid'),
                    'note' => 'سحب أرباح',
                    'processed_at' => $i === 2 ? now()->subDay() : null,
                ],
            );
        }
    }

    /** Open safety/manual disputes → admin disputes badge. @param User[] $students @param DriverProfile[] $drivers */
    private function seedDisputes(array $students, array $drivers): void
    {
        $defs = [
            ['type' => 'sos', 'status' => 'open', 'sev' => RiskSeverity::Critical, 'summary' => 'نداء طوارئ من طالب أثناء رحلة نشطة.'],
            ['type' => 'risk_threshold', 'status' => 'investigating', 'sev' => RiskSeverity::High, 'summary' => 'نمط مخاطرة مرتفع على حساب كابتن.'],
            ['type' => 'manual', 'status' => 'open', 'sev' => RiskSeverity::Medium, 'summary' => 'مراجعة يدوية بعد شكوى متكررة.'],
        ];
        foreach ($defs as $i => $d) {
            $subject = ($i % 2 === 0 ? ($drivers[$i % count($drivers)]->user_id ?? null) : ($students[$i % count($students)]->id ?? null));
            if (! $subject) {
                continue;
            }
            Dispute::firstOrCreate(
                ['subject_user_id' => $subject, 'type' => $d['type'], 'summary' => $d['summary']],
                ['status' => $d['status'], 'severity' => $d['sev'], 'risk_score' => 40 + $i * 20],
            );
        }
    }

    /** Open support tickets across levels → admin support badge. @param User[] $students */
    private function seedSupport(array $students): void
    {
        $defs = [
            ['cat' => 'payment', 'subject' => 'لم يتم شحن محفظتي بعد التحويل', 'priority' => 'high', 'level' => 2],
            ['cat' => 'trip', 'subject' => 'الكابتن لم يصل لنقطة الالتقاط', 'priority' => 'normal', 'level' => 1],
            ['cat' => 'technical', 'subject' => 'لا أستطيع تحديث رقم هاتفي', 'priority' => 'low', 'level' => 1],
        ];
        foreach ($defs as $i => $d) {
            $student = $students[$i % count($students)] ?? null;
            if (! $student) {
                continue;
            }
            SupportTicket::firstOrCreate(
                ['number' => 'TKT-DEMO-'.str_pad((string) ($i + 1), 4, '0', STR_PAD_LEFT)],
                [
                    'user_id' => $student->id,
                    'category' => $d['cat'],
                    'subject' => $d['subject'],
                    'status' => 'open',
                    'priority' => $d['priority'],
                    'level' => $d['level'],
                    'last_reply_at' => now()->subHours($i + 1),
                ],
            );
        }
    }
}
