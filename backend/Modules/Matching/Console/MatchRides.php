<?php

namespace Rafeeq\Modules\Matching\Console;

use Illuminate\Console\Command;
use Rafeeq\Modules\Matching\Services\MatchingService;

class MatchRides extends Command
{
    protected $signature = 'rafeeq:match-rides';

    protected $description = 'Group pending ride requests into pooled trips awaiting a captain.';

    public function handle(MatchingService $matching): int
    {
        $count = $matching->formTrips();
        $this->info("Formed {$count} pooled trip(s).");

        return self::SUCCESS;
    }
}
