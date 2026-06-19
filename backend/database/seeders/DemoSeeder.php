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

        $this->command?->info('DemoSeeder: '.count($students).' students, '.count($drivers).' captains, plus subscriptions/coupons/complaints/notifications/trips.');
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
}
