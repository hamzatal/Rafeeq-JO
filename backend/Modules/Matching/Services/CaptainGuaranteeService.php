<?php

namespace Rafeeq\Modules\Matching\Services;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Core\Support\Clock;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\Matching\Data\PeakWindows;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Trips\Models\TripPassenger;
use Rafeeq\Modules\Wallet\Services\WalletService;
use Rafeeq\Shared\Enums\PaymentMethod;
use Rafeeq\Shared\Enums\WalletTxnType;

/**
 * The captain minimum guarantee — what replaced surge.
 *
 * ── The problem, in the project's own numbers ──────────────────────────────────
 *
 * At band C (1.500 a seat) and 15% commission a captain nets 1.275 on one rider
 * and 2.550 on two. Neither is worth the fuel and the hour. Three riders (3.825)
 * is where it starts working.
 *
 * The old engine solved this with SURGE — it charged the RIDER more when the car
 * was empty. That makes the student pay for the platform's failure to fill a car
 * and destroys the one promise the product is built on: a price you know before
 * you ask.
 *
 * So the shortfall is paid by US, out of commission. That is the honest place for
 * it: filling cars is our job, and when we fail the cost should land on the party
 * who could have prevented it.
 *
 * ── Why it is capped, three separate ways ──────────────────────────────────────
 *
 * PRICING.md §3 does the arithmetic and it is brutal: a one-rider trip costs the
 * platform 2.000 NET once its own commission is exhausted. Uncapped this is an
 * open-ended liability that grows with every under-filled car — «الدعم وحده يُفلس
 * المنصّة». So:
 *
 *   1. **Off-peak only.** At peak (07:00–09:00, 13:00–16:00) cars fill naturally,
 *      so subsidising them buys nothing — it pays for trips that would have
 *      happened anyway.
 *   2. **Two subsidised trips per captain per day**, turning an unbounded
 *      liability into a number known in advance.
 *   3. **Only below min-fill.** Three riders is already viable.
 *
 * ── Why not on cash trips ─────────────────────────────────────────────────────
 *
 * On a cash trip the captain already holds the whole fare and OWES us commission.
 * There is no wallet settlement to top up, and paying a guarantee would mean
 * handing money to someone who is currently our debtor.
 */
class CaptainGuaranteeService extends BaseService
{
    /** Human-readable marker on the wallet entry. Never used as a query key. */
    private const DESCRIPTION = 'ضمان الحدّ الأدنى للرحلة';

    public function __construct(
        private readonly WalletService $wallets,
        private readonly PricingService $pricing,
        private readonly AuditLogger $audit,
    ) {}

    /** Guaranteed floor for one dispatched trip, in fils. */
    public function floorFils(): int
    {
        return (int) config('rafeeq.captain_guarantee_fils', 3500);
    }

    /** How many subsidised trips one captain may draw in a day. */
    public function dailyCap(): int
    {
        return (int) config('rafeeq.captain_guarantee_daily_cap', 2);
    }

    /**
     * Peak windows, when fill is natural and no guarantee applies.
     *
     * Shared with the matcher's aggregation window via PeakWindows — the same
     * judgement about the same hours drives both, and two copies of it would drift.
     *
     * @return list<array{0:int,1:int}> [startHour, endHour) in Asia/Amman
     */
    public function peakWindows(): array
    {
        return PeakWindows::all();
    }

    public function isPeak(?\DateTimeInterface $at = null): bool
    {
        return PeakWindows::contains($at);
    }

    /**
     * Would this trip qualify? Pure check, no writes — the captain's offer screen
     * shows the guaranteed floor before they accept, which is the whole point of
     * having one.
     */
    public function qualifies(int $riders, bool $isCash, ?\DateTimeInterface $at = null): bool
    {
        return ! $isCash
            && $riders > 0
            && $riders < $this->pricing->minFillRiders()
            && ! $this->isPeak($at);
    }

    /**
     * Top a captain's earnings for one trip up to the floor, from commission.
     *
     * Returns the fils actually paid — 0 when the trip does not qualify, the daily
     * cap is spent, the captain already cleared the floor, or a guarantee for this
     * trip was already paid.
     *
     * MUST be called inside the billing transaction: the top-up and the earnings
     * it tops up have to commit or fail together, or a crash between them pays a
     * guarantee on a trip that was never billed.
     */
    public function topUp(User $captain, string $tripId, int $earnedFils, int $riders, bool $isCash, ?\DateTimeInterface $at = null): int
    {
        if (! $this->qualifies($riders, $isCash, $at)) {
            return 0;
        }

        $shortfall = $this->floorFils() - $earnedFils;
        if ($shortfall <= 0) {
            return 0;
        }

        /*
         * Idempotency is enforced HERE and not by WalletService.
         *
         * `WalletService::apply()` has no reference-based guard — it creates a
         * transaction every time it is called. So a retried billing job would pay
         * this guarantee twice, silently, and the second payment would look like
         * an ordinary earning. The (reference, type) pair is the guard.
         */
        /*
         * The idempotency check and the payment must not be separable.
         *
         * `alreadyPaid()` followed by two `credit()` calls is a check-then-act: two
         * settlements for the same trip — a retried job, or a trip ended twice by two
         * requests — both read "not yet paid" and both pay. So the trip row is locked
         * first, which serialises every settlement of the SAME trip while leaving
         * different trips fully concurrent. The daily-cap read below is then also
         * consistent, because a captain's second qualifying trip cannot interleave
         * with their first.
         */
        Trip::whereKey($tripId)->lockForUpdate()->first();

        if ($this->alreadyPaid($tripId)) {
            return 0;
        }

        if ($this->usedToday($captain->id) >= $this->dailyCap()) {
            // Recorded, because a captain hitting the cap repeatedly means a
            // corridor is structurally under-filled — a matching problem, not a
            // payments one, and it should be visible as such.
            $this->audit->log('guarantee.cap_reached', $captain, changes: [
                'captain_user_id' => $captain->id,
                'trip_id' => $tripId,
                'cap' => $this->dailyCap(),
            ]);

            return 0;
        }

        /*
         * The subsidy is DEBITED from the treasury and credited to the captain, so it
         * is a transfer and not an act of creation.
         *
         * The balance is checked before either leg rather than letting the debit throw.
         * `apply()` raises `BusinessRuleException` on an overdraw, and this runs inside
         * the transaction that completes the trip — so an exhausted subsidy fund would
         * roll back the trip completion itself, releasing holds and un-completing a
         * journey that physically happened. A ride must never fail because a
         * discretionary payment could not be made.
         */
        $treasury = $this->wallets->platform();
        if ($treasury->availableFils() < $shortfall) {
            // Loud, because this is the fund running dry, not a routine skip. Every
            // under-filled off-peak trip is now unsubsidised until commission rebuilds
            // the balance, and that is a finance decision someone must see.
            $this->audit->log('guarantee.treasury_exhausted', $captain, changes: [
                'captain_user_id' => $captain->id,
                'trip_id' => $tripId,
                'needed_fils' => $shortfall,
                'treasury_available_fils' => $treasury->availableFils(),
            ]);

            return 0;
        }

        $this->wallets->debit($treasury, $shortfall, WalletTxnType::Guarantee, self::DESCRIPTION, $tripId);
        $this->wallets->credit(
            $this->wallets->forUser($captain),
            $shortfall,
            WalletTxnType::Guarantee,
            self::DESCRIPTION,
            $tripId,
        );

        $this->audit->log('guarantee.paid', $captain, changes: [
            'captain_user_id' => $captain->id,
            'trip_id' => $tripId,
            'earned_fils' => $earnedFils,
            'floor_fils' => $this->floorFils(),
            'paid_fils' => $shortfall,
            'riders' => $riders,
        ]);

        return $shortfall;
    }

    /**
     * Has a guarantee already been paid for this trip?
     *
     * Keyed on (reference, type). The type is an enum value the compiler protects;
     * the description is prose that someone will eventually improve.
     */
    public function alreadyPaid(string $tripId): bool
    {
        return DB::table('wallet_transactions')
            ->where('reference', $tripId)
            ->where('type', WalletTxnType::Guarantee->value)
            ->where('amount_fils', '>', 0)
            ->exists();
    }

    /**
     * Guarantees drawn by this captain since local midnight.
     *
     * Counted from `wallet_transactions` rather than the audit log: the money is
     * the fact, and the audit entry is a description of it. Counting descriptions
     * would let a failed audit write raise the cap.
     *
     * `amount_fils > 0` restricts this to the CREDIT leg. The treasury debit carries
     * the same type and reference, and counting both would halve the cap.
     */
    public function usedToday(string $captainUserId): int
    {
        return (int) DB::table('wallet_transactions')
            ->join('wallets', 'wallets.id', '=', 'wallet_transactions.wallet_id')
            ->where('wallets.user_id', $captainUserId)
            ->where('wallet_transactions.type', WalletTxnType::Guarantee->value)
            ->where('wallet_transactions.amount_fils', '>', 0)
            ->where('wallet_transactions.created_at', '>=', Clock::now()->startOfDay())
            ->count();
    }

    /**
     * Settle the guarantee for a finished trip.
     *
     * ── Why at trip END and not at boarding ────────────────────────────────────
     *
     * `RideBillingService::chargeForBoarding()` runs once per passenger, and the
     * guarantee depends on how many riders the trip ended up carrying. Called from
     * there, the first boarding would see one rider, decide the trip was under-filled,
     * pay the shortfall — and then three more riders would board. The idempotency
     * guard would dutifully prevent a correction, so the platform would have
     * subsidised a full car. The rider count is only final once the trip is.
     *
     * Earnings are summed from `trip_passengers.captain_share_fils`, the accounting
     * rows the billing service wrote, rather than recomputed from the fare — a
     * guarantee must top up what was ACTUALLY paid, and any divergence between those
     * two numbers is precisely what a guarantee should reveal instead of paper over.
     *
     * A trip settled entirely in cash draws nothing: the captain is holding the notes
     * and owes us commission, so paying them a subsidy means handing money to a
     * current debtor. A MIXED trip does qualify — there is a real wallet settlement to
     * top up.
     */
    public function settleForTrip(Trip $trip): int
    {
        $trip->loadMissing('driver');

        /** @var DriverProfile|null $driver */
        $driver = $trip->driver;
        if ($driver === null) {
            return 0;
        }

        $captain = User::find($driver->user_id);
        if (! $captain) {
            return 0;
        }

        /** @var Collection<int, TripPassenger> $paid */
        $paid = $trip->passengers()->whereNotNull('paid_at')->get();
        if ($paid->isEmpty()) {
            return 0;
        }

        $earned = (int) $paid->sum('captain_share_fils');
        $allCash = $paid->every(fn ($p) => $p->payment_method === PaymentMethod::Cash);

        // The HOUR the trip ran, not the hour it is being settled. A 20:00 trip closed
        // out at 07:05 the next morning by a retried job is an off-peak trip.
        $at = $trip->started_at ?? $trip->scheduled_at;

        return $this->topUp($captain, $trip->id, $earned, $paid->count(), $allCash, $at);
    }
}
