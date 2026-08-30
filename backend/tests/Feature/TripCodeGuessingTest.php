<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Rafeeq\Core\Permissions\Models\Role;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\Matching\Services\MatchingService;
use Rafeeq\Modules\Safety\Models\RiskFlag;
use Rafeeq\Modules\Trips\Data\TripCode;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Trips\Models\TripPassenger;
use Rafeeq\Modules\Trips\Services\TripService;
use Rafeeq\Modules\Wallet\Services\WalletService;
use Rafeeq\Shared\Enums\DriverStatus;
use Rafeeq\Shared\Enums\PaymentMethod;
use Rafeeq\Shared\Enums\TripPassengerStatus;
use Rafeeq\Shared\Enums\TripStatus;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Rafeeq\Shared\Enums\WalletTxnType;
use Tests\TestCase;

/**
 * Guessing a confirmation code is bounded, and the boundary is recorded.
 *
 * ── What a code is for ─────────────────────────────────────────────────────────
 *
 * «تأكيد من الطرفين»: a captain cannot mark a rider boarded, or dropped off, without
 * the rider reading a code out. That is the control the dispute centre rests on, so
 * the only question that matters about it is how hard it is to bypass by guessing.
 *
 * ── What the answer used to be ─────────────────────────────────────────────────
 *
 * Four digits — 10 000 combinations — and `throttle:trip-code` at 6 attempts a
 * minute. Over a 30-minute trip that is ~180 guesses: a **1.8% chance** of confirming
 * a drop-off for a rider who never got out. The rate limit bounded the RATE and not
 * the TOTAL, and the only trace of a miss was an audit row that nothing counted, so a
 * captain working through the space looked exactly like a captain with clumsy thumbs.
 *
 * Six digits makes those same 180 guesses 0.018%. The attempt cap makes it 10 out of
 * a million — and puts a risk flag in front of a human the moment it is reached.
 */
class TripCodeGuessingTest extends TestCase
{
    use RefreshDatabase;

    private function captain(): array
    {
        Role::firstOrCreate(['name' => 'driver'], ['label_ar' => 'كابتن', 'label_en' => 'Driver']);
        $user = User::create([
            'full_name' => 'Captain', 'phone' => '0790000301', 'password' => 'secret-pass',
            'type' => UserType::Driver, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);
        $user->assignRole('driver');

        return [$user, DriverProfile::create(['user_id' => $user->id, 'status' => DriverStatus::Approved])];
    }

    private function student(string $phone): User
    {
        $student = User::create([
            'full_name' => 'Student', 'phone' => $phone, 'password' => 'secret-pass',
            'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);

        // Funded, so a successful boarding is refused by the CODE and never by the
        // wallet — otherwise this suite would be testing billing by accident.
        $wallets = app(WalletService::class);
        $wallets->credit($wallets->forUser($student), 10_000, WalletTxnType::Topup, 'شحن');

        return $student;
    }

    /** A started trip with one booked rider whose boarding code we control. */
    private function startedTrip(string $boardingCode): array
    {
        [$captainUser, $driver] = $this->captain();
        $trip = Trip::create([
            'driver_id' => $driver->id, 'fare_fils' => 1500,
            'scheduled_at' => now(), 'started_at' => now(),
            'status' => TripStatus::Started, 'capacity' => 4,
        ]);
        $passenger = TripPassenger::create([
            'trip_id' => $trip->id, 'student_id' => $this->student('0790000302')->id,
            'status' => TripPassengerStatus::Booked, 'payment_method' => PaymentMethod::Wallet,
            'boarding_code' => $boardingCode,
        ]);

        return [$captainUser, $trip, $passenger];
    }

    // ── the code itself ─────────────────────────────────────────────────────

    public function test_a_drawn_code_is_six_digits(): void
    {
        $this->assertSame(6, TripCode::LENGTH);

        for ($i = 0; $i < 200; $i++) {
            $code = TripCode::draw();
            $this->assertMatchesRegularExpression('/^\d{6}$/', $code, 'Every code is exactly six digits, zero-padded.');
        }
    }

    /**
     * Both generators read the length from one place.
     *
     * `TripService::uniqueTripCode` and `MatchingService::uniqueCode` each had their
     * own `random_int(0, 9999)`, and the FormRequest had its own `\d{4,8}`. Three
     * numbers, no reason they would stay in step, and in fact they never were.
     */
    public function test_the_matching_path_and_the_booking_path_draw_the_same_shape(): void
    {
        $reflection = new \ReflectionClass(MatchingService::class);
        $this->assertStringContainsString(
            'TripCode::draw()',
            file_get_contents($reflection->getFileName()),
            'MatchingService must not carry its own generator.',
        );

        $trips = new \ReflectionClass(TripService::class);
        $this->assertStringContainsString('TripCode::draw()', file_get_contents($trips->getFileName()));
    }

    /**
     * A code drawn before the length changed still works.
     *
     * Tightening validation to exactly six digits would have made every rider holding
     * a four-digit code unboardable mid-trip.
     */
    public function test_a_legacy_four_digit_code_is_still_accepted(): void
    {
        [$captainUser, $trip] = $this->startedTrip('4321');
        Sanctum::actingAs($captainUser);

        $this->postJson("/api/v1/driver/trips/{$trip->id}/board", ['code' => '4321'])->assertOk();
    }

    public function test_a_code_with_letters_is_refused_by_validation(): void
    {
        [$captainUser, $trip] = $this->startedTrip(TripCode::draw());
        Sanctum::actingAs($captainUser);

        $this->postJson("/api/v1/driver/trips/{$trip->id}/board", ['code' => '12ab34'])->assertStatus(422);
    }

    // ── the cap ─────────────────────────────────────────────────────────────

    public function test_wrong_codes_are_counted_on_the_trip(): void
    {
        [, $trip] = $this->startedTrip('111111');
        $service = app(TripService::class);

        for ($i = 1; $i <= 3; $i++) {
            try {
                $service->confirmBoarding($trip->fresh(), '000000');
            } catch (\Throwable) {
                /* expected */
            }
            $this->assertSame($i, (int) $trip->fresh()->code_attempts);
        }
    }

    /**
     * The tenth miss stops the trip and raises a flag a human will see.
     *
     * Ten is far more than typing needs — four seats, two or three fumbles each — so
     * reaching it means ten wrong codes with nothing right in between.
     */
    public function test_the_tenth_wrong_code_locks_the_trip_and_raises_a_risk_flag(): void
    {
        [, $trip] = $this->startedTrip('111111');
        $service = app(TripService::class);
        $lastMessage = '';

        for ($i = 1; $i <= TripCode::MAX_ATTEMPTS; $i++) {
            try {
                $service->confirmBoarding($trip->fresh(), '000000');
            } catch (\Throwable $e) {
                $lastMessage = $e->getMessage();
            }
        }

        $this->assertStringContainsString('محاولات كثيرة', $lastMessage);
        $this->assertSame(
            1,
            RiskFlag::where('type', 'trip_code_guessing')->count(),
            'Reaching the cap must put this in front of a human, not just refuse the request.',
        );

        // And the RIGHT code is refused too, so the cap cannot be walked past.
        try {
            $service->confirmBoarding($trip->fresh(), '111111');
            $this->fail('The trip should be locked for code entry.');
        } catch (\Throwable $e) {
            $this->assertStringContainsString('محاولات كثيرة', $e->getMessage());
        }
    }

    /**
     * A correct code clears the counter, so honest fumbling never accumulates across
     * a shift into a lock-out.
     */
    public function test_a_correct_code_resets_the_counter(): void
    {
        [, $trip, $passenger] = $this->startedTrip('222222');
        $service = app(TripService::class);

        foreach (['000000', '999999'] as $wrong) {
            try {
                $service->confirmBoarding($trip->fresh(), $wrong);
            } catch (\Throwable) {
                /* expected */
            }
        }
        $this->assertSame(2, (int) $trip->fresh()->code_attempts);

        $service->confirmBoarding($trip->fresh(), '222222');

        $this->assertSame(0, (int) $trip->fresh()->code_attempts, 'Getting it right wipes the slate.');
        $this->assertSame(TripPassengerStatus::Onboard, $passenger->fresh()->status);
    }

    public function test_every_miss_is_audited(): void
    {
        [, $trip] = $this->startedTrip('333333');
        $service = app(TripService::class);

        try {
            $service->confirmBoarding($trip->fresh(), '000000');
        } catch (\Throwable) {
            /* expected */
        }

        $this->assertSame(
            1,
            (int) DB::table('audit_logs')->where('action', 'trip.boarding_code_rejected')->count(),
            'A sweep is only detectable if each miss is on record.',
        );
    }

    // ── the rate limit ──────────────────────────────────────────────────────

    /**
     * `throttle:trip-code` is 6 a minute per captain and trip, and nothing asserted it.
     *
     * It is the difference between guessing at machine speed and guessing at thumb
     * speed, which is what makes the attempt cap reachable by a human but not by a
     * script.
     */
    public function test_the_seventh_attempt_in_a_minute_is_throttled(): void
    {
        [$captainUser, $trip] = $this->startedTrip('444444');
        Sanctum::actingAs($captainUser);

        for ($i = 1; $i <= 6; $i++) {
            $this->postJson("/api/v1/driver/trips/{$trip->id}/board", ['code' => '000000'])
                ->assertStatus(422);
        }

        $this->postJson("/api/v1/driver/trips/{$trip->id}/board", ['code' => '000000'])
            ->assertStatus(429);
    }
}
