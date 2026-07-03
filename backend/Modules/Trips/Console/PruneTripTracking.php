<?php

namespace Rafeeq\Modules\Trips\Console;

use Illuminate\Console\Command;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Trips\Models\TripTracking;
use Rafeeq\Shared\Enums\TripStatus;

/**
 * Trims raw live-location points (`trip_tracking`) for trips that finished long
 * ago, so the table doesn't grow unbounded. Live points are only needed during
 * (and shortly after) an active trip; finished trips keep their summary on the
 * trip record. Retention window is configurable (rafeeq.tracking_retention_days).
 */
class PruneTripTracking extends Command
{
    protected $signature = 'rafeeq:prune-tracking {--days= : Override retention window in days}';

    protected $description = 'Prune old live-location points for completed/cancelled trips.';

    public function handle(): int
    {
        $days = (int) ($this->option('days') ?: config('rafeeq.tracking_retention_days', 30));
        $cutoff = now()->subDays(max(1, $days));
        $deleted = 0;

        Trip::query()
            ->select('id')
            ->whereIn('status', [TripStatus::Completed->value, TripStatus::Cancelled->value])
            ->where(function ($q) use ($cutoff) {
                $q->where('ended_at', '<', $cutoff)->orWhere('updated_at', '<', $cutoff);
            })
            ->chunkById(500, function ($trips) use (&$deleted) {
                $deleted += TripTracking::whereIn('trip_id', $trips->pluck('id'))->delete();
            });

        $this->info("Pruned {$deleted} tracking point(s) older than {$days} day(s).");

        return self::SUCCESS;
    }
}
