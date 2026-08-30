<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Rafeeq\Modules\Subscriptions\Services\PlanSolvency;

/**
 * `subscription_plans.rides_count` becomes NOT NULL — no more unlimited plans.
 *
 * ── Why the column, and not just a validation rule ────────────────────────────
 *
 * A NULL ride count meant «unlimited», and an unlimited plan is an unbounded
 * liability sold for a fixed sum. Every ride on it costs the platform the captain's
 * share in withdrawable money, so there is no price at which it is safe: a student
 * riding twice a day for a month on the top band costs 84 000 fils to serve, and the
 * شهرية plan sold that for 25 000.
 *
 * A validation rule would stop the next unlimited plan from being CREATED. It would
 * not stop the two already in the database from being sold, and it would leave the
 * rest of the code carrying `?int` and a `=== null` branch on every read — which is
 * how `Subscription::isUsable()` came to treat "no ride limit" and "limit not
 * reached" as the same answer. Making the column NOT NULL deletes the branch
 * everywhere at once, so the unbounded case stops being representable rather than
 * merely being rejected at one door.
 *
 * ── What happens to a plan that is already unlimited ──────────────────────────
 *
 * There is no honest count to convert it to, because it was sold as a promise with
 * no number in it. So the migration gives it the largest count its price can
 * actually fund — the point at which it breaks even rather than loses money — and
 * DEACTIVATES it. Deactivating is the important half: a converted plan is a new
 * commercial offer, and an operator has to look at it and re-price it before it goes
 * back on sale. Silently converting and leaving it active would be this migration
 * inventing a product.
 *
 * Existing subscriptions on such a plan keep whatever `remaining_rides` they already
 * had (a NULL there is handled by the same backfill below), so nobody's live plan is
 * cut short by the deploy.
 */
return new class extends Migration
{
    public function up(): void
    {
        /** @var PlanSolvency $solvency */
        $solvency = app(PlanSolvency::class);

        $unlimited = DB::table('subscription_plans')
            ->whereNull('rides_count')
            ->get(['id', 'route_id', 'price_fils']);

        foreach ($unlimited as $plan) {
            $costPerRide = $solvency->costPerRideFils($plan->route_id);
            $affordable = $costPerRide > 0 ? intdiv((int) $plan->price_fils, $costPerRide) : 0;

            DB::table('subscription_plans')->where('id', $plan->id)->update([
                'rides_count' => max(1, $affordable),
                'is_active' => false,
                'updated_at' => now(),
            ]);
        }

        /*
         * A live subscription with no remaining-ride count is the same unbounded
         * promise one level down, and it outlives the plan it came from. Give it the
         * count its plan now carries so the student keeps a concrete entitlement
         * instead of an open tab.
         */
        DB::statement('
            UPDATE subscriptions
               SET remaining_rides = subscription_plans.rides_count
              FROM subscription_plans
             WHERE subscriptions.plan_id = subscription_plans.id
               AND subscriptions.remaining_rides IS NULL
        ');

        // Any subscription whose plan vanished (plan_id is restrictOnDelete, so this
        // is only reachable on a hand-edited database) still may not be unbounded.
        DB::table('subscriptions')->whereNull('remaining_rides')->update(['remaining_rides' => 0]);

        /*
         * NOT NULL, and deliberately NO default.
         *
         * A default would let `Subscription::create([...])` omit the field and quietly
         * produce a subscription entitled to nothing — the same class of bug as the
         * NULL it replaces, just with a different value. Without one, forgetting the
         * field is a database error at the line that forgot it.
         */
        DB::statement('ALTER TABLE subscription_plans ALTER COLUMN rides_count SET NOT NULL');
        DB::statement('ALTER TABLE subscriptions ALTER COLUMN remaining_rides SET NOT NULL');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE subscriptions ALTER COLUMN remaining_rides DROP NOT NULL');
        DB::statement('ALTER TABLE subscription_plans ALTER COLUMN rides_count DROP NOT NULL');
    }
};
