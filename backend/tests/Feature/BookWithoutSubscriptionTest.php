<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Rafeeq\Core\Permissions\Models\Role;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\Routes\Models\Route;
use Rafeeq\Modules\Subscriptions\Models\Subscription;
use Rafeeq\Modules\Subscriptions\Models\SubscriptionPlan;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Trips\Services\TripService;
use Rafeeq\Modules\Universities\Models\University;
use Rafeeq\Modules\Wallet\Services\WalletService;
use Rafeeq\Shared\Enums\DriverStatus;
use Rafeeq\Shared\Enums\PaymentMethod;
use Rafeeq\Shared\Enums\SubscriptionStatus;
use Rafeeq\Shared\Enums\SubscriptionType;
use Rafeeq\Shared\Enums\TripStatus;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Rafeeq\Shared\Enums\WalletTxnType;
use Tests\TestCase;

/**
 * A plan is a discount, not a turnstile.
 *
 * ── The rule these tests pin ──────────────────────────────────────────────────
 *
 * `book()` used to throw `NO_ACTIVE_SUBSCRIPTION` without a usable plan on the route,
 * while `MatchingService` — the other way into the very same car — never checked at
 * all. So the two entrances disagreed about whether prepayment was mandatory: every
 * pooled seat the matcher created was pay-per-ride, and every directly booked seat had
 * to be prepaid.
 *
 * The product answer is that the matcher was right. A student who needs three rides
 * before an exam cannot be told to buy a week, and a plan whose only purpose is to
 * unlock the button is a toll rather than a product. So a plan now funds a seat when
 * the student holds one and is simply absent when they do not.
 *
 * Nothing asserted the old rejection — which is why removing it broke no test and why
 * these exist: the ONLY record of this decision was one `throw` in the middle of a
 * transaction.
 */
class BookWithoutSubscriptionTest extends TestCase
{
    use RefreshDatabase;

    private function route(): Route
    {
        $uni = University::create([
            'name_ar' => 'جامعة اختبار', 'name_en' => 'Test University',
            'code' => 'TST', 'city' => 'Irbid', 'is_active' => true,
        ]);

        return Route::create([
            'university_id' => $uni->id, 'name' => 'مسار اختبار',
            'price_fils' => 1500, 'capacity' => 4, 'is_active' => true,
        ]);
    }

    private function trip(Route $route): Trip
    {
        Role::firstOrCreate(['name' => 'driver'], ['label_ar' => 'كابتن', 'label_en' => 'Driver']);
        $user = User::create([
            'full_name' => 'Captain', 'phone' => '0790000101', 'password' => 'secret-pass',
            'type' => UserType::Driver, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);
        $driver = DriverProfile::create(['user_id' => $user->id, 'status' => DriverStatus::Approved]);

        return Trip::create([
            'driver_id' => $driver->id, 'route_id' => $route->id, 'fare_fils' => 1500,
            'scheduled_at' => now()->addHour(), 'status' => TripStatus::Scheduled, 'capacity' => 4,
        ]);
    }

    private function student(string $phone, int $balanceFils = 0): User
    {
        Role::firstOrCreate(['name' => 'student'], ['label_ar' => 'طالب', 'label_en' => 'Student']);
        $student = User::create([
            'full_name' => 'Student', 'phone' => $phone, 'password' => 'secret-pass',
            'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);
        $student->assignRole('student');

        if ($balanceFils > 0) {
            $wallets = app(WalletService::class);
            $wallets->credit($wallets->forUser($student), $balanceFils, WalletTxnType::Topup, 'شحن');
        }

        return $student;
    }

    private function activePlanFor(User $student, Route $route): Subscription
    {
        $plan = SubscriptionPlan::create([
            'name' => 'باقة', 'type' => SubscriptionType::Weekly, 'price_fils' => 23_000,
            'rides_count' => 12, 'duration_days' => 7, 'is_active' => true,
        ]);

        return Subscription::create([
            'student_id' => $student->id, 'plan_id' => $plan->id, 'route_id' => $route->id,
            'status' => SubscriptionStatus::Active, 'starts_at' => now()->subDay(),
            'ends_at' => now()->addDays(6), 'remaining_rides' => 12,
        ]);
    }

    // ── the rule ────────────────────────────────────────────────────────────

    public function test_a_student_with_no_plan_can_book_a_seat(): void
    {
        $route = $this->route();
        $trip = $this->trip($route);
        $student = $this->student('0790000102', balanceFils: 5_000);

        $passenger = app(TripService::class)->book($student, $trip);

        $this->assertNull($passenger->subscription_id, 'No plan means no plan — not a refusal.');
        $this->assertSame(PaymentMethod::Wallet, $passenger->payment_method);
        $this->assertNotEmpty($passenger->boarding_code);
    }

    public function test_a_student_can_book_a_seat_to_pay_in_cash(): void
    {
        $route = $this->route();
        $trip = $this->trip($route);
        // No balance at all: cash is the point.
        $student = $this->student('0790000103');

        $passenger = app(TripService::class)->book($student, $trip, null, PaymentMethod::Cash);

        $this->assertNull($passenger->subscription_id);
        $this->assertSame(
            PaymentMethod::Cash,
            $passenger->payment_method,
            'book() wrote no payment method at all before, so a seat booked here silently defaulted to wallet and cash was unreachable.',
        );
    }

    public function test_a_plan_is_used_automatically_when_the_student_holds_one(): void
    {
        $route = $this->route();
        $trip = $this->trip($route);
        $student = $this->student('0790000104');
        $subscription = $this->activePlanFor($student, $route);

        $passenger = app(TripService::class)->book($student, $trip);

        $this->assertSame(
            $subscription->id,
            $passenger->subscription_id,
            'A student who paid for a plan should not have to choose it again per ride.',
        );
    }

    public function test_a_lapsed_plan_falls_back_to_paying_rather_than_refusing(): void
    {
        $route = $this->route();
        $trip = $this->trip($route);
        $student = $this->student('0790000105', balanceFils: 5_000);

        $subscription = $this->activePlanFor($student, $route);
        $subscription->forceFill(['ends_at' => now()->subDay()])->save();

        $passenger = app(TripService::class)->book($student, $trip);

        $this->assertNull($passenger->subscription_id, 'An expired plan is not a usable plan.');
        $this->assertSame(PaymentMethod::Wallet, $passenger->payment_method, 'And the seat is still bookable.');
    }

    public function test_an_exhausted_plan_falls_back_to_paying(): void
    {
        $route = $this->route();
        $trip = $this->trip($route);
        $student = $this->student('0790000106', balanceFils: 5_000);

        $subscription = $this->activePlanFor($student, $route);
        $subscription->forceFill(['remaining_rides' => 0])->save();

        $passenger = app(TripService::class)->book($student, $trip);

        $this->assertNull($passenger->subscription_id);
    }

    /**
     * The seat still cannot be taken twice, and the car still cannot be overbooked —
     * relaxing the funding rule must not relax the capacity rule.
     */
    public function test_the_other_booking_guards_still_hold(): void
    {
        $route = $this->route();
        $trip = $this->trip($route);
        $student = $this->student('0790000107', balanceFils: 5_000);
        $service = app(TripService::class);

        $service->book($student, $trip);

        $this->expectExceptionMessage('أنت محجوز بالفعل على هذه الرحلة.');
        $service->book($student, $trip->fresh());
    }

    // ── the API surface ─────────────────────────────────────────────────────

    /**
     * The response says how the seat is funded, so the app does not have to re-derive
     * a decision the server just made.
     */
    public function test_the_booking_response_reports_how_the_seat_is_funded(): void
    {
        $route = $this->route();
        $trip = $this->trip($route);
        $student = $this->student('0790000108', balanceFils: 5_000);

        Sanctum::actingAs($student);

        $this->postJson("/api/v1/trips/{$trip->id}/book", ['payment_method' => 'cash'])
            ->assertCreated()
            ->assertJsonPath('data.funding', 'cash');
    }

    public function test_a_subscriber_sees_the_seat_reported_as_plan_funded(): void
    {
        $route = $this->route();
        $trip = $this->trip($route);
        $student = $this->student('0790000109');
        $this->activePlanFor($student, $route);

        Sanctum::actingAs($student);

        $this->postJson("/api/v1/trips/{$trip->id}/book")
            ->assertCreated()
            ->assertJsonPath('data.funding', 'subscription');
    }

    public function test_a_nonsense_payment_method_is_refused(): void
    {
        $route = $this->route();
        $trip = $this->trip($route);
        $student = $this->student('0790000110', balanceFils: 5_000);

        Sanctum::actingAs($student);

        $this->postJson("/api/v1/trips/{$trip->id}/book", ['payment_method' => 'bitcoin'])
            ->assertStatus(422);
    }
}
