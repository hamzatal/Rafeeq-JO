<?php

namespace Tests\Feature;

use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\Payouts\Models\PayoutRequest;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Trips\Models\TripPassenger;
use Rafeeq\Shared\Enums\DriverStatus;
use Rafeeq\Shared\Enums\TripPassengerStatus;
use Rafeeq\Shared\Enums\TripStatus;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

/**
 * Proof that `SELECT ... FOR UPDATE` actually blocks in the test environment.
 *
 * This file could not exist before phase 1.13. The suite ran on SQLite
 * `:memory:`, which parses `FOR UPDATE` and then ignores it, so every
 * `lockForUpdate` in this codebase was decorative as far as the tests were
 * concerned — three concurrency bugs shipped behind a green suite.
 *
 * Two real connections are used rather than threads: PHPUnit is single-process,
 * so the way to observe a lock is to hold it open on one connection and have a
 * second connection try to take it with `NOWAIT`. Postgres raises 55P03
 * (lock_not_available) instead of blocking, which turns "the row was locked"
 * into an assertion instead of a timeout.
 *
 * These tests are skipped on any driver without row locks, and CI runs Postgres,
 * so in CI they never skip.
 */
class RowLockConcurrencyTest extends TestCase
{
    /** A second, independent connection to the same database. */
    private const OTHER = 'pg_second';

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::connection()->getDriverName() !== 'pgsql') {
            $this->markTestSkipped('Row locks need Postgres. Run backend/scripts/pg-test.sh.');
        }

        config(['database.connections.'.self::OTHER => config('database.connections.pgsql')]);
        DB::purge(self::OTHER);

        // RefreshDatabase is deliberately NOT used: it wraps each test in a
        // transaction that a second connection cannot see. These tests clean up
        // after themselves instead.
        $this->freshSchema();
    }

    protected function tearDown(): void
    {
        DB::purge(self::OTHER);
        parent::tearDown();
    }

    private function freshSchema(): void
    {
        DB::statement('TRUNCATE trip_passengers, payout_requests, trips, driver_profiles, wallets, users CASCADE');
    }

    /**
     * Assert that a row held under `FOR UPDATE` on one connection cannot be taken
     * by another. Returns nothing; fails the test if the lock is not honoured.
     */
    private function assertRowIsLockedDuring(string $table, string $id, callable $whileHeld): void
    {
        DB::beginTransaction();
        try {
            DB::table($table)->where('id', $id)->lockForUpdate()->first();

            // Second connection, NOWAIT: raises instead of waiting.
            $blocked = false;
            try {
                DB::connection(self::OTHER)->statement(
                    "SELECT id FROM {$table} WHERE id = ? FOR UPDATE NOWAIT", [$id]
                );
            } catch (QueryException $e) {
                // 55P03 lock_not_available — the row really is locked.
                $blocked = str_contains($e->getMessage(), '55P03')
                    || str_contains(strtolower($e->getMessage()), 'could not obtain lock');
            }

            $this->assertTrue($blocked,
                "FOR UPDATE on {$table} did not block a second connection. The test "
                .'database is not enforcing row locks, so every lockForUpdate in this '
                .'codebase is unverified.');

            $whileHeld();
        } finally {
            DB::rollBack();
        }
    }

    private function makeStudent(string $phone = '0791110001'): User
    {
        return User::create([
            'full_name' => 'Rider', 'phone' => $phone, 'password' => 'secret-pass',
            'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);
    }

    private function makeCaptain(string $phone = '0791110002'): DriverProfile
    {
        $u = User::create([
            'full_name' => 'Captain', 'phone' => $phone, 'password' => 'secret-pass',
            'type' => UserType::Driver, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);

        return DriverProfile::create([
            'user_id' => $u->id, 'license_number' => 'L-9', 'status' => DriverStatus::Approved,
        ]);
    }

    /**
     * The control test. If this fails, nothing else in this file means anything,
     * and every concurrency guarantee in the project is unproven.
     */
    public function test_the_test_database_actually_honours_row_locks(): void
    {
        $user = $this->makeStudent();
        $this->assertRowIsLockedDuring('users', $user->id, fn () => null);
    }

    /**
     * 1.9 — `TripService::book` checked capacity outside the transaction, so two
     * students could pass the check on the same last seat. The trip row is now
     * locked for the whole decision.
     */
    public function test_the_trip_row_is_lockable_so_capacity_cannot_be_raced(): void
    {
        $trip = Trip::create([
            'driver_id' => $this->makeCaptain()->id,
            'fare_fils' => 1500, 'scheduled_at' => now()->addHour(),
            'status' => TripStatus::Scheduled, 'capacity' => 1,
        ]);

        $this->assertRowIsLockedDuring('trips', $trip->id, function () use ($trip) {
            // While the row is held, the seat count cannot change underneath us.
            $this->assertSame(0, $trip->fresh()->bookedCount());
        });
    }

    /**
     * 1.9 — `confirmBoarding` read the passenger row and then wrote it, unlocked,
     * so two confirmations of the same code could both see `Booked` and both bill.
     */
    public function test_the_passenger_row_is_lockable_so_boarding_cannot_double_charge(): void
    {
        $student = $this->makeStudent('0791110011');
        $trip = Trip::create([
            'driver_id' => $this->makeCaptain('0791110012')->id,
            'fare_fils' => 1500, 'scheduled_at' => now()->addHour(),
            'status' => TripStatus::Started, 'capacity' => 4,
        ]);
        $passenger = TripPassenger::create([
            'trip_id' => $trip->id, 'student_id' => $student->id,
            'status' => TripPassengerStatus::Booked, 'boarding_code' => '4321',
        ]);

        $this->assertRowIsLockedDuring('trip_passengers', $passenger->id, fn () => null);
    }

    /**
     * 1.16 — `PayoutService::approve/reject` read the request and then wrote it
     * with no lock, so two supervisors clicking at once could both approve the same
     * payout and pay a captain twice.
     */
    public function test_the_payout_row_is_lockable_so_it_cannot_be_approved_twice(): void
    {
        $captain = $this->makeCaptain('0791110022');
        $payout = PayoutRequest::create([
            'captain_user_id' => $captain->user_id,
            'amount_fils' => 25000,
            'method' => 'cliq',
            'destination' => 'CAPTAIN',
            'status' => PayoutRequest::STATUS_PENDING,
        ]);

        $this->assertRowIsLockedDuring('payout_requests', $payout->id, fn () => null);
    }
}
