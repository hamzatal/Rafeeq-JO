<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Clean up expired OTP codes every hour
Schedule::command('rafeeq:prune-otps')->hourly()->onOneServer()->withoutOverlapping();

/*
 * Pool pending ride requests into trips.
 *
 * ── Why the two guards are not optional here ───────────────────────────────
 *
 * This ran on a bare `everyFiveMinutes()`. A run that takes longer than five minutes
 * — a busy corridor, a slow database, the `MAX_PASSES_PER_GROUP` cap — was started
 * again ON TOP of itself, and both runs read the same `pending` requests. Two
 * scheduler containers did it on every single tick.
 *
 * The consequence was not a wasted query. `createPooledTrip` claimed its riders with
 * an unconditional write, so both runs formed a car from the same four students:
 * **two pooled trips offered to two captains for the same four riders**, with the
 * wallet hold taken twice. `unique(trip_id, student_id)` cannot see it, because the
 * two trips have different ids.
 *
 * `withoutOverlapping` closes the scheduled case and `onOneServer` the multi-container
 * one. Neither is sufficient on its own, and neither covers `php artisan
 * rafeeq:match-rides` typed by hand during an incident — which is why the write path
 * ALSO takes a row lock and re-checks the status now. A schedule flag is a deployment
 * convention; correctness belongs in the transaction.
 */
Schedule::command('rafeeq:match-rides')
    ->everyFiveMinutes()
    ->onOneServer()
    ->withoutOverlapping();

/*
 * Re-assess top-risk accounts and auto-freeze + open dispute cases hourly.
 *
 * `withoutOverlapping` because the sweep FREEZES accounts and opens dispute cases:
 * two concurrent sweeps reading the same risk scores open two cases for one account,
 * and a duplicate case is a second human being asked to adjudicate the same facts.
 */
Schedule::command('rafeeq:fraud-sweep')->hourly()->onOneServer()->withoutOverlapping();

/*
 * Retention. ONE command enforces every promise in the privacy notice, reading the
 * periods from Core\Retention\RetentionPolicy.
 *
 * It replaces `rafeeq:prune-tracking`, which covered one table out of nine and
 * filtered on Completed|Cancelled only — so a trip stranded in `Started` kept its GPS
 * trail forever, which is the case where that data is least justified.
 *
 * onOneServer + withoutOverlapping: a long first run on a table that has never been
 * pruned must not be started again on top of itself.
 */
Schedule::command('rafeeq:prune-retention')
    ->dailyAt('03:30')
    ->onOneServer()
    ->withoutOverlapping()
    ->emailOutputOnFailure(env('OPS_ALERT_EMAIL') ?: null);

// Expire subscriptions whose window has closed. Without this every report that reads
// `status = active` is wrong, and rows stay active forever.
Schedule::command('rafeeq:expire-subscriptions')->dailyAt('00:05')->onOneServer()->withoutOverlapping();

/*
 * The same argument, for the three states nothing else was closing.
 *
 * A pooled trip that no captain accepted stayed `pending_driver` FOREVER, with its
 * riders' wallet holds still active — money frozen and an app stuck on "waiting for a
 * captain" with no timeout anywhere. A ride request past its departure was re-pooled
 * by every matcher run. A CliQ payment request past its TTL stayed approvable, even
 * though the TTL was configured and `isExpired()` already computed the answer.
 *
 * Every ten minutes rather than daily: the first of the three strands a rider and
 * freezes their balance, so a once-a-night sweep would be a night too late.
 */
Schedule::command('rafeeq:expire-stale')
    ->everyTenMinutes()
    ->onOneServer()
    ->withoutOverlapping();

/*
 * Heartbeat for the scheduler's own healthcheck.
 *
 * The scheduler container had NO healthcheck, so if it died the retention jobs, the
 * subscription expiry and the nightly backup all stopped silently — and the first
 * symptom would be a table that had been growing for a month. Docker cannot ask
 * "is schedule:work still ticking?", so the scheduler proves it by touching a file
 * every minute and the healthcheck asserts the file is fresh.
 */
Schedule::call(fn () => @touch('/tmp/scheduler-heartbeat'))->everyMinute()->name('heartbeat');

/*
 * Nightly backup with a verification restore. The audit found zero backups — and
 * every other bug in this project is recoverable while losing the ledger is not.
 * The script exits non-zero on a dump it cannot restore, so a silent corruption is
 * caught the night it happens.
 */
Schedule::exec(base_path('scripts/backup.sh'))
    ->dailyAt('02:00')
    ->onOneServer()
    ->withoutOverlapping()
    ->emailOutputOnFailure(env('OPS_ALERT_EMAIL') ?: null);

// Alert when the failed-job table grows: a job failing repeatedly in silence is how a
// notification backlog or a stuck payout goes unnoticed for a week.
Schedule::command('rafeeq:worker-alive --alert-on-failures')->hourly()->onOneServer();

// A retention report in the log every week, so a table that starts growing without a
// policy is visible before it is a review finding.
Schedule::command('rafeeq:retention-report')->weeklyOn(1, '04:00')->onOneServer();
