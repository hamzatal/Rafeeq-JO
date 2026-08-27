<?php

namespace Rafeeq\Core\Console;

use Illuminate\Console\Command;
use Rafeeq\Modules\Wallet\Services\WalletService;

/**
 * Put real capital into the platform treasury, traceably.
 *
 * ── The problem this answers ───────────────────────────────────────────────────
 *
 * The captain guarantee is paid from the treasury, and `WalletService::apply()`
 * refuses to take any balance below zero — so the platform can only ever subsidise
 * out of commission it has actually collected. That property is deliberate and it is
 * what makes «الدعم وحده يُفلس المنصّة» an enforced rule instead of a hope.
 *
 * It has a launch-day consequence, though. On the first morning the treasury holds
 * ZERO, so the earliest under-filled off-peak trips draw no guarantee at all. Those
 * trips belong to the pilot captains — the five people in roadmap 12.2 whose goodwill
 * the entire launch rests on, and the ones most likely to be under-filled precisely
 * because supply and demand are both thinnest at the start.
 *
 * Launching with the safety net switched off exactly when it is most needed inverts
 * the incentive: it penalises the earliest adopters for being early. So the treasury
 * is funded with an opening float instead.
 *
 * ── Why a command and not a seeder ────────────────────────────────────────────
 *
 * Because this is the one place money enters the platform's own account without a
 * ride behind it, and that must look like what it is: a capital injection, with an
 * amount, a reference, and an audit entry. A seeder would make it look like fixture
 * data. `Topup` is the transaction type for money arriving from outside, which is
 * exactly what this is.
 *
 * Idempotent by reference, so a re-run during a deploy cannot double-fund.
 *
 *   php artisan rafeeq:fund-treasury 150 --reference=CLIQ-2026-08-01-OPENING
 */
class FundTreasuryCommand extends Command
{
    protected $signature = 'rafeeq:fund-treasury
        {dinars : Amount in JOD (e.g. 150 or 150.500)}
        {--reference= : Bank/CliQ reference for this transfer — required, so the float is traceable}
        {--force : Skip the confirmation prompt}';

    protected $description = 'Credit the platform treasury with opening capital, idempotently by reference.';

    public function __construct(private readonly WalletService $wallets)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $reference = (string) $this->option('reference');
        if ($reference === '') {
            $this->error('A --reference is required. Untraceable capital in the treasury is indistinguishable from invented balance.');

            return self::FAILURE;
        }

        // Parsed from dinars because that is the unit a finance person holds in their
        // hand, then converted once. Money is integer fils everywhere below this line.
        $dinars = (float) $this->argument('dinars');
        if ($dinars <= 0) {
            $this->error('Amount must be greater than zero.');

            return self::FAILURE;
        }

        $fils = (int) round($dinars * 1000);
        $treasury = $this->wallets->platform();

        if (! $this->option('force') && ! $this->confirm(
            sprintf('Credit the treasury with %s JOD (%d fils), reference [%s]?', number_format($dinars, 3), $fils, $reference)
        )) {
            $this->info('Cancelled.');

            return self::SUCCESS;
        }

        // `adminTopup` is idempotent by reference and writes the audit entry through
        // `logOrFail`, so a float that cannot be recorded is a float that does not
        // happen. Re-running the same reference returns the original transaction.
        $before = (int) $treasury->fresh()->balance_fils;
        $txn = $this->wallets->adminTopup(
            $treasury,
            $fils,
            reference: $reference,
            reason: 'رأس مال افتتاحي لخزينة المنصّة — تمويل ضمان الكباتن',
        );
        $after = (int) $treasury->fresh()->balance_fils;

        if ($after === $before) {
            $this->warn("Reference [{$reference}] was already funded — nothing changed. Transaction {$txn->id}.");

            return self::SUCCESS;
        }

        $this->info(sprintf(
            'Treasury funded: %s JOD. Balance %s → %s JOD. Transaction %s.',
            number_format($dinars, 3),
            number_format($before / 1000, 3),
            number_format($after / 1000, 3),
            $txn->id,
        ));

        // The number that actually matters to operations: how many worst-case
        // subsidies this buys. A one-rider band-C trip costs 2.225 to top up.
        $worstCase = 3500 - (1500 - intdiv(1500 * (int) config('rafeeq.commission_percent', 15), 100));
        if ($worstCase > 0) {
            $this->line(sprintf(
                '  ≈ %d worst-case guarantees (a single band-C rider costs %s JOD to top up).',
                intdiv($after, $worstCase),
                number_format($worstCase / 1000, 3),
            ));
        }

        return self::SUCCESS;
    }
}
