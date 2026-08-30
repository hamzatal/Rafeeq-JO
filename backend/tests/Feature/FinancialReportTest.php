<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Rafeeq\Core\Permissions\Models\Role;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\Payments\Models\PaymentRequest;
use Rafeeq\Modules\Payouts\Models\PayoutRequest;
use Rafeeq\Modules\Routes\Models\Route;
use Rafeeq\Modules\Subscriptions\Models\Subscription;
use Rafeeq\Modules\Subscriptions\Models\SubscriptionPlan;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Trips\Models\TripPassenger;
use Rafeeq\Modules\Universities\Models\University;
use Rafeeq\Modules\Zones\Models\Zone;
use Rafeeq\Shared\Enums\DriverStatus;
use Rafeeq\Shared\Enums\TripPassengerStatus;
use Rafeeq\Shared\Enums\TripStatus;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

/**
 * The financial report.
 *
 * 3.1 — two bugs lived here. The report summed commission over every paid seat and
 * called it platform revenue, including seats a subscription had already paid for,
 * whose money was ALSO counted as `subscription_revenue_fils`; and it never selected
 * `coupon_discount_fils`, so its own figures did not add up.
 *
 * The seed below deliberately mixes all four seat kinds — wallet, cash,
 * subscription and coupon-discounted — because each bug only shows up in the
 * presence of one of them, and the previous test seeded a single plain wallet seat
 * where both bugs are invisible.
 */
class FinancialReportTest extends TestCase
{
    use RefreshDatabase;

    private const COMMISSION = 500;   // 10% of 5000

    private const CAPTAIN_SHARE = 4500;

    private const FARE = 5000;

    private string $zoneId;

    private string $otherZoneId;

    private User $student;

    private Trip $trip;

    private ?User $admin = null;

    private function makeAdmin(): User
    {
        // Memoised: `report()` may be called more than once in a test, and `phone`
        // is unique.
        if ($this->admin) {
            return $this->admin;
        }

        // 'admin' role is a permission superuser (bypasses analytics.view check).
        Role::firstOrCreate(['name' => 'admin'], ['label_ar' => 'إدارة', 'label_en' => 'Admin']);
        $u = User::create(['full_name' => 'Admin', 'phone' => '0790000002', 'type' => UserType::Admin, 'status' => UserStatus::Active, 'locale' => 'ar']);
        $u->assignRole('admin');

        return $this->admin = $u;
    }

    private function makeZone(string $name): string
    {
        // A real row: `trips.zone_id` is a foreign key as of 3.11, so a report test
        // can no longer invent a zone id. That constraint caught this very test.
        return Zone::create([
            'name_ar' => $name, 'name_en' => $name, 'city' => 'Amman',
            'center_lat' => 31.95, 'center_lng' => 35.91, 'radius_km' => 5, 'is_active' => true,
        ])->id;
    }

    /** One completed trip in one zone, plus a paid payout. */
    private function seedTrip(): void
    {
        $uni = University::create(['name_ar' => 'ج', 'name_en' => 'U', 'code' => 'UJ', 'city' => 'Amman', 'is_active' => true]);
        $route = Route::create(['university_id' => $uni->id, 'name' => 'R', 'price_fils' => self::FARE, 'capacity' => 4, 'is_active' => true]);

        $driverUser = User::create(['full_name' => 'Cap', 'phone' => '0790000050', 'type' => UserType::Driver, 'status' => UserStatus::Active, 'locale' => 'ar']);
        $driver = DriverProfile::create(['user_id' => $driverUser->id, 'status' => DriverStatus::Approved, 'verification_level' => 1]);

        $this->student = User::create(['full_name' => 'Stu', 'phone' => '0790000051', 'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar']);

        $this->zoneId = $this->makeZone('Zone A');
        $this->otherZoneId = $this->makeZone('Zone B');

        $this->trip = Trip::create([
            'route_id' => $route->id,
            'driver_id' => $driver->id,
            'zone_id' => $this->zoneId,
            'scheduled_at' => now(),
            'status' => TripStatus::Completed,
            'capacity' => 4,
            'fare_fils' => self::FARE,
        ]);

        PayoutRequest::create([
            'captain_user_id' => $driverUser->id,
            'amount_fils' => 4000,
            'method' => 'cliq',
            'status' => PayoutRequest::STATUS_PAID,
            'processed_at' => now(),
        ]);
    }

    /**
     * A paid seat, written exactly the way RideBillingService writes one.
     *
     * `commission_fils` is stored NET of the discount and `captain_share_fils` is
     * paid in full, which is what makes the identity hold at row level.
     */
    private function seat(string $method = 'wallet', ?string $subscriptionId = null, int $discount = 0): TripPassenger
    {
        // A distinct rider per seat: `trip_passengers` is unique on
        // (trip_id, student_id), which is the right rule — one person cannot occupy
        // two seats in the same car.
        return TripPassenger::create([
            'trip_id' => $this->trip->id,
            'student_id' => $this->rider()->id,
            'subscription_id' => $subscriptionId,
            'payment_method' => $method,
            'status' => TripPassengerStatus::Dropped,
            'boarding_code' => str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT),
            'fare_fils' => self::FARE,
            'commission_fils' => self::COMMISSION - $discount,
            'captain_share_fils' => self::CAPTAIN_SHARE,
            'coupon_discount_fils' => $discount > 0 ? $discount : null,
            'paid_at' => now(),
            'cash_collected_at' => $method === 'cash' ? now() : null,
        ]);
    }

    /** An active subscription plus the approved payment that bought it. */
    private function seedSubscription(int $priceFils): string
    {
        $uni = University::first();
        $plan = SubscriptionPlan::create([
            'university_id' => $uni->id, 'name' => 'Monthly', 'type' => 'monthly',
            'price_fils' => $priceFils, 'rides_count' => 20, 'duration_days' => 30, 'is_active' => true,
        ]);

        $sub = Subscription::create([
            'student_id' => $this->student->id,
            'plan_id' => $plan->id,
            'status' => 'active',
            'starts_at' => now()->subDays(3),
            'ends_at' => now()->addDays(27),
            'remaining_rides' => 20,
        ]);

        PaymentRequest::create([
            'number' => 'PR-'.Str::upper(Str::random(6)),
            'user_id' => $this->student->id,
            'payable_type' => Subscription::class,
            'payable_id' => $sub->id,
            'purpose' => 'subscription',
            'amount_fils' => $priceFils,
            'currency' => 'JOD',
            'method' => 'cliq',
            'status' => 'approved',
            'approved_at' => now(),
        ]);

        return $sub->id;
    }

    private int $riders = 0;

    /** A fresh rider, so each seat belongs to a different person. */
    private function rider(): User
    {
        $this->riders++;

        return User::create([
            'full_name' => 'Rider '.$this->riders,
            'phone' => '079'.str_pad((string) (1000000 + $this->riders), 7, '0', STR_PAD_LEFT),
            'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);
    }

    /** @return array<string, mixed> */
    private function report(?string $zoneId = null): array
    {
        Sanctum::actingAs($this->makeAdmin());
        $url = '/api/v1/admin/reports/financial'.($zoneId ? '?zone_id='.$zoneId : '');

        return $this->getJson($url)->assertOk()->json('data');
    }

    public function test_financial_summary_aggregates_rides_and_payouts(): void
    {
        $this->seedTrip();
        $this->seat();

        $d = $this->report();

        $this->assertSame(1, $d['rides_count']);
        $this->assertSame(self::FARE, $d['gross_fare_fils']);
        $this->assertSame(self::COMMISSION, $d['commission_fils']);
        $this->assertSame(self::CAPTAIN_SHARE, $d['captain_earnings_fils']);
        $this->assertSame(4000, $d['payouts_paid_fils']);
        $this->assertSame($this->zoneId, $d['by_zone'][0]['zone_id']);
    }

    /**
     * THE acceptance criterion for 3.1.
     *
     * gross = commission + captain_share + discount, over a period containing every
     * kind of seat at once. If this fails, the report has lost money somewhere and
     * no amount of per-column checking will say where.
     */
    public function test_gross_equals_commission_plus_captain_share_plus_discount(): void
    {
        $this->seedTrip();
        $subId = $this->seedSubscription(20000);

        $this->seat('wallet');
        $this->seat('cash');
        $this->seat('wallet', discount: 200);
        $this->seat('wallet', subscriptionId: $subId);

        $d = $this->report();

        $this->assertSame(4, $d['rides_count']);
        $this->assertSame(
            $d['gross_fare_fils'],
            $d['commission_fils'] + $d['captain_earnings_fils'] + $d['discount_fils'],
            'The report must balance: fares = commission + captain share + discount.',
        );

        // And the same identity must hold inside every funding bucket, so a future
        // change cannot make the total balance by cancelling two errors out.
        foreach ($d['by_funding'] as $source => $f) {
            $this->assertSame(
                $f['gross_fare_fils'],
                $f['commission_fils'] + $f['captain_share_fils'] + $f['discount_fils'],
                "Funding bucket '{$source}' does not balance.",
            );
        }

        // And per zone.
        foreach ($d['by_zone'] as $z) {
            $this->assertSame(
                $z['gross_fare_fils'],
                $z['commission_fils'] + $z['captain_share_fils'] + $z['discount_fils'],
                'Zone '.($z['zone_id'] ?? 'none').' does not balance.',
            );
        }
    }

    public function test_coupon_discount_is_reported_not_swallowed(): void
    {
        $this->seedTrip();
        $this->seat('wallet', discount: 200);

        $d = $this->report();

        $this->assertSame(200, $d['discount_fils'], 'The discount must appear as its own line.');
        $this->assertSame(self::COMMISSION - 200, $d['commission_fils'], 'Commission is stored net of the discount.');
        $this->assertSame(self::CAPTAIN_SHARE, $d['captain_earnings_fils'], 'The captain is paid in full regardless of the coupon.');
    }

    /**
     * The double count. A subscription seat books commission on the tariff, but that
     * money already arrived as a plan sale — so platform revenue must count it once.
     */
    public function test_subscription_commission_is_not_counted_as_revenue(): void
    {
        $this->seedTrip();
        $subId = $this->seedSubscription(20000);

        $this->seat('wallet', subscriptionId: $subId);
        $this->seat('wallet');

        $d = $this->report();

        // Both seats book commission on the tariff …
        $this->assertSame(self::COMMISSION * 2, $d['commission_fils']);

        // … but only one of them brought cash in per-ride.
        $this->assertSame(self::COMMISSION, $d['ride_commission_fils']);
        $this->assertSame(self::COMMISSION, $d['subscription_funded_commission_fils']);
        $this->assertSame(20000, $d['subscription_revenue_fils']);

        // Revenue = ride commission + plan sales. NOT commission + plan sales,
        // which would have reported 21,000 for 20,500 of actual money.
        $this->assertSame(20000 + self::COMMISSION, $d['platform_revenue_fils']);
        $this->assertNotSame(
            $d['commission_fils'] + $d['subscription_revenue_fils'],
            $d['platform_revenue_fils'],
            'Revenue must not be the sum that double-counts the subscription seat.',
        );
    }

    public function test_cash_and_wallet_seats_are_split_by_funding(): void
    {
        $this->seedTrip();
        $this->seat('wallet');
        $this->seat('cash');
        $this->seat('cash');

        $d = $this->report();

        $this->assertSame(1, $d['by_funding']['wallet']['rides_count']);
        $this->assertSame(2, $d['by_funding']['cash']['rides_count']);
        $this->assertSame(0, $d['by_funding']['subscription']['rides_count']);

        // Cash commission is real revenue: it is charged to the captain's balance
        // or booked as debt, so it arrives either way.
        $this->assertSame(self::COMMISSION * 3, $d['ride_commission_fils']);
    }

    public function test_every_funding_bucket_is_present_even_when_empty(): void
    {
        $this->seedTrip();
        $this->seat();

        $d = $this->report();

        // A caller must never have to guard for a missing key.
        $this->assertSame(['wallet', 'cash', 'subscription'], array_keys($d['by_funding']));
        $this->assertSame(0, $d['by_funding']['cash']['gross_fare_fils']);
    }

    public function test_zone_filter_excludes_other_zones(): void
    {
        $this->seedTrip();
        $this->seat();

        $d = $this->report($this->otherZoneId);

        $this->assertSame(0, $d['rides_count']);
        $this->assertSame(0, $d['commission_fils']);
    }

    /**
     * `byZone` ignored the zone filter, so filtering changed the totals but left the
     * per-zone table showing every zone — the two halves of one screen disagreeing.
     */
    public function test_zone_filter_also_applies_to_the_per_zone_breakdown(): void
    {
        $this->seedTrip();
        $this->seat();

        $this->assertSame([], $this->report($this->otherZoneId)['by_zone']);
        $this->assertCount(1, $this->report($this->zoneId)['by_zone']);
    }

    public function test_requires_analytics_permission(): void
    {
        // A plain student has no analytics.view permission.
        Role::firstOrCreate(['name' => 'student'], ['label_ar' => 'طالب', 'label_en' => 'Student']);
        $student = User::create(['full_name' => 'S', 'phone' => '0790000060', 'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar']);
        $student->assignRole('student');

        Sanctum::actingAs($student);
        $this->getJson('/api/v1/admin/reports/financial')->assertStatus(403);
    }
}
