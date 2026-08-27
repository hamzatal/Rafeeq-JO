<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Clean up expired OTP codes every hour
Schedule::command('rafeeq:prune-otps')->hourly();

// Pool pending ride requests into trips every few minutes
Schedule::command('rafeeq:match-rides')->everyFiveMinutes();

// Re-assess top-risk accounts and auto-freeze + open dispute cases hourly
Schedule::command('rafeeq:fraud-sweep')->hourly();

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
Schedule::command('rafeeq:expire-subscriptions')->dailyAt('00:05')->onOneServer();

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
