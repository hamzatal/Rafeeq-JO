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

// Trim old live-location points for finished trips (keeps trip_tracking bounded)
Schedule::command('rafeeq:prune-tracking')->dailyAt('03:30');
