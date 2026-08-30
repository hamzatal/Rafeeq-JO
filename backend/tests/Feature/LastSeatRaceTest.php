<?php

namespace Tests\Feature;

use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\Routes\Models\Route;
use Rafeeq\Modules\Subscriptions\Models\Subscription;
use Rafeeq\Modules\Subscriptions\Models\SubscriptionPlan;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Trips\Models\TripPassenger;
use Rafeeq\Modules\Trips\Services\TripService;
use Rafeeq\Modules\Universities\Models\University;
use Rafeeq\Modules\Wallet\Models\Wallet;
use Rafeeq\Shared\Enums\DriverStatus;
use Rafeeq\Shared\Enums\SubscriptionStatus;
use Rafeeq\Shared\Enums\SubscriptionType;
use Rafeeq\Shared\Enums\TripPassengerStatus;
use Rafeeq\Shared\Enums\TripStatus;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

/**
 * Two students, one seat — proved against a real second connection.
 *
 * ── What was already tested, and what was missing ──────────────────────────
 *
 * `RowLockConcurrencyTest` proves the DATABASE honours `SELECT … FOR UPDATE`: it holds
 * the lock on one connection and asserts a second connection's `FOR UPDATE NOWAIT`
 * raises 55P03. That is a necessary test — before it, the suite ran on SQLite, which
 * parses `FOR UPDATE` and ignores it, so every lock in the codebase was decorative as
 * far as the tests were concerned.
 *
 * But it never calls `book()`. So the primitive was proven and the BOOKING PATH was
 * not, and «هل لو شخصين حجزوا آخر مقعد بنفس الوقت؟» had no test to point at.
 *
 * ── How a single-process test proves a race ─────────────────────────────────
 *
 * PHPUnit is one process, so two service calls cannot literally interleave. The
 * argument is assembled from two halves, each of which IS decidable:
 *
 *   1. **`book()` waits.** Hold the trip row on a second connection, set a 400ms
 *      `lock_timeout`, and call `book()`. If it acquires the trip lock before deciding
 *      anything, it must fail with 55P03. If it does not lock — the pre-1.9 code, where
 *      the capacity check sat outside the transaction — it sails past and inserts.
 *      A passing test therefore proves the lock is taken, and taken FIRST.
 *
 *   2. **`book()` re-reads under the lock.** Fill the last seat from the second
 *      connection and COMMIT, then call `book()`. It must answer `TRIP_FULL` from data
 *      it read after acquiring the lock, not from the stale model it was handed.
 *
 * Together: the second caller blocks until the first commits, then sees the committed
 * seat and is refused. That is exactly the millisecond case.
 */
class LastSeatRaceTest extends TestCase
{
    /** A second, independent connection to the same database. */
    private const OTHER = 'pg_second';

    private Trip $trip;

    private Route $route;

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::connection()->getDriverName() !== 'pgsql') {
            $this->markTestSkipped('Row locks need Postgres. Run scripts/pg-test.sh.');
        }

        config(['database.connections.'.self::OTHER => config('database.connections.pgsql')]);
        DB::purge(self::OTHER);

        /*
         * `RefreshDatabase` is deliberately not used: it wraps the test in a
         * transaction the second connection cannot see, which would make every
         * assertion here vacuous. Cleaned up by hand instead — including the platform
         * treasury, which is schema data rather than test data and whose loss would
         * fail whichever test ran next.
         */
        $this->resetSchema();

        $uni = University::create(['name_ar' => 'ج', 'name_en' => 'U', 'code' => 'LSR', 'is_active' => true]);
        $this->route = Route::create([
            'university_id' => $uni->id, 'name' => 'مسار', 'price_fils' => 1000, 'is_active' => true,
        ]);

        $captainUser = User::create([
            'full_name' => 'Captain', 'phone' => '0791110902', 'password' => 'secret-pass',
            'type' => UserType::Driver, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);
        $captain = DriverProfile::create(['user_id' => $captainUser->id, 'status' => DriverStatus::Approved]);

        /* Capacity ONE: every booking after the first is the last-seat case. */
        $this->trip = Trip::create([
            'route_id' => $this->route->id,
            'driver_id' => $captain->id,
            'fare_fils' => 1000,
            'scheduled_at' => now()->addHour(),
            'status' => TripStatus::Scheduled,
            'capacity' => 1,
        ]);
    }

    /**
     * Clean up on the way OUT as well as on the way in.
     *
     * Because `RefreshDatabase` is not used, everything this class writes COMMITS —
     * so without this the university, route and captain survive into the next test
     * class, and the very next one that creates a university collides on
     * `universities_code_unique`. That is the failure shape this file caused on its
     * first full-suite run: seventeen tests in four unrelated classes went red while
     * every one of them passed in isolation.
     */
    protected function tearDown(): void
    {
        if (DB::connection()->getDriverName() === 'pgsql') {
            $this->resetSchema();
        }
        DB::purge(self::OTHER);
        parent::tearDown();
    }

    /**
     * Empty the tables this class touches, and put back what the SCHEMA owns.
     *
     * `wallets` holds one row that is not test data — the single platform treasury,
     * inserted by its own migration, which every billed trip credits its commission
     * into. Truncating it without restoring it would fail whichever test ran next.
     */
    private function resetSchema(): void
    {
        DB::statement('TRUNCATE trip_passengers, trips, subscriptions, subscription_plans, routes, universities, driver_profiles, wallets, users CASCADE');

        DB::table('wallets')->insert([
            'id' => (string) Str::uuid7(),
            'kind' => Wallet::KIND_PLATFORM,
            'user_id' => null,
            'balance_fils' => 0, 'held_fils' => 0, 'debt_fils' => 0, 'currency' => 'JOD',
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    private function subscribedStudent(string $phone): User
    {
        $student = User::create([
            'full_name' => 'طالب '.$phone, 'phone' => $phone, 'password' => 'secret-pass',
            'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);

        $plan = SubscriptionPlan::firstOrCreate(
            ['name' => 'Monthly'],
            [
                'type' => SubscriptionType::Monthly, 'price_fils' => 20000,
                'rides_count' => 30, 'duration_days' => 30, 'is_active' => true,
            ],
        );

        Subscription::create([
            'student_id' => $student->id,
            'plan_id' => $plan->id,
            'route_id' => $this->route->id,
            'status' => SubscriptionStatus::Active,
            'starts_at' => now()->subDay(),
            'ends_at' => now()->addDays(20),
            'remaining_rides' => 10,
        ]);

        return $student;
    }

    /**
     * Half one: `book()` acquires the trip lock BEFORE it decides anything.
     *
     * With the row held elsewhere and a 400ms `lock_timeout`, a correct `book()` can
     * only end one way — 55P03. The version this replaced read `bookedCount()` outside
     * the transaction, so it would have returned a passenger instead.
     */
    public function test_booking_waits_for_a_concurrent_booker_to_finish(): void
    {
        $student = $this->subscribedStudent('0791110911');

        $other = DB::connection(self::OTHER);
        $other->beginTransaction();

        try {
            // Another booking is in flight and holding the trip row.
            $other->table('trips')->where('id', $this->trip->id)->lockForUpdate()->first();

            DB::statement("SET lock_timeout = '400ms'");

            $threw = null;
            try {
                app(TripService::class)->book($student, $this->trip);
            } catch (QueryException $e) {
                $threw = $e;
            } finally {
                DB::statement('SET lock_timeout = 0');
            }

            $this->assertNotNull(
                $threw,
                'book() returned while another transaction held the trip row. It is not taking the lock, '
                .'so two students can pass the capacity check on the same last seat.',
            );
            $this->assertStringContainsString('55P03', $threw->getMessage());
            $this->assertSame(0, TripPassenger::count(), 'Nothing may be written when the lock could not be taken.');
        } finally {
            $other->rollBack();
        }
    }

    /**
     * Half two: the capacity decision is made from data read AFTER the lock.
     *
     * The seat is taken and committed by another connection while `book()`'s `$trip`
     * model still says the car is empty. It must answer `TRIP_FULL`.
     */
    public function test_the_second_booker_is_refused_once_the_first_commits(): void
    {
        $first = $this->subscribedStudent('0791110921');
        $second = $this->subscribedStudent('0791110922');

        /* The first booking, committed on the other connection. */
        DB::connection(self::OTHER)->table('trip_passengers')->insert([
            'id' => (string) Str::uuid7(),
            'trip_id' => $this->trip->id,
            'student_id' => $first->id,
            'status' => TripPassengerStatus::Booked->value,
            'boarding_code' => '1111',
            'created_at' => now(), 'updated_at' => now(),
        ]);

        // `$this->trip` is deliberately the stale model the request would be holding.
        try {
            app(TripService::class)->book($second, $this->trip);
            $this->fail('The last seat was sold twice.');
        } catch (BusinessRuleException $e) {
            $this->assertSame('TRIP_FULL', $e->getErrorCode());
        }

        $this->assertSame(1, TripPassenger::where('trip_id', $this->trip->id)->count());
    }

    /**
     * And the same student cannot take two seats, by the schema.
     *
     * `unique(trip_id, student_id)` is the DB backstop under the `ALREADY_BOOKED`
     * check. Asserted separately from capacity because it is a different guarantee:
     * one covers "how many seats exist", the other "who is in them".
     */
    public function test_the_same_student_cannot_hold_two_seats(): void
    {
        $student = $this->subscribedStudent('0791110931');
        Trip::whereKey($this->trip->id)->update(['capacity' => 4]);

        app(TripService::class)->book($student, $this->trip->fresh());

        try {
            app(TripService::class)->book($student, $this->trip->fresh());
            $this->fail('A student booked the same trip twice.');
        } catch (BusinessRuleException $e) {
            $this->assertSame('ALREADY_BOOKED', $e->getErrorCode());
        }

        $this->assertSame(1, TripPassenger::where('trip_id', $this->trip->id)->count());
    }
}
