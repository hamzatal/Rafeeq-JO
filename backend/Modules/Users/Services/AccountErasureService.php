<?php

namespace Rafeeq\Modules\Users\Services;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Core\Support\Clock;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Drivers\Models\DriverDocument;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\Wallet\Services\WalletService;

/**
 * Erasing an account for real.
 *
 * What `deleteAccount` did before: `$user->delete()` — a soft delete. The row kept
 * the full name, the phone number, the email and every uploaded identity document.
 * Nothing was erased, so the app offered a right it did not honour, and the privacy
 * notice claimed a deletion that did not happen.
 *
 * What has to survive erasure, and why it is not a contradiction: the financial
 * ledger. Wallet transactions, captured fares and payouts are accounting records
 * with a statutory retention period, and they are also the only defence against a
 * later dispute. So the identity is destroyed and the money trail is kept, joined to
 * a row that no longer identifies anyone. That is erasure done properly rather than
 * a `DELETE` that would break the books.
 */
class AccountErasureService extends BaseService
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly WalletService $wallets,
    ) {}

    /**
     * Erase an account at the user's request.
     *
     * Refuses while money or obligations are outstanding, because erasing then would
     * either strand the user's balance or destroy the counterparty's evidence.
     */
    public function erase(User $user, string $reason = 'user_request'): User
    {
        return $this->transaction(function () use ($user, $reason) {
            // `withTrashed`: erasure soft-deletes the row, so a second attempt would
            // otherwise fail with "not found" instead of the accurate reason. The
            // caller deserves to be told the account is already erased.
            /** @var User $locked */
            $locked = User::withTrashed()->whereKey($user->id)->lockForUpdate()->firstOrFail();

            if ($locked->isAnonymized()) {
                throw new BusinessRuleException('الحساب محذوف بالفعل.', 'ACCOUNT_ALREADY_ERASED');
            }

            $this->assertNothingOutstanding($locked);

            // Keep enough of the audit trail to prove the erasure happened, logged
            // BEFORE the identity is destroyed so the entry can still name the actor.
            $this->audit->log('account.erasure_started', $locked, auditable: $locked, changes: [
                'reason' => $reason,
                'type' => $locked->type->value,
            ]);

            $this->eraseDriverArtifacts($locked);
            $this->eraseIdentity($locked);

            // Every session and API token dies with the identity.
            $locked->tokens()->delete();

            $this->audit->log('account.erased', auditable: $locked, changes: ['reason' => $reason]);

            return $locked->fresh();
        });
    }

    /**
     * Erasure must not strand money or destroy evidence mid-obligation.
     *
     * A positive balance is the user's property — erasing the account would make it
     * unreachable. A hold or a pending payout means a counterparty is still owed an
     * outcome. Both are refusals with a clear reason rather than silent failures.
     */
    private function assertNothingOutstanding(User $user): void
    {
        $wallet = $this->wallets->forUser($user);

        if ($wallet->availableFils() > 0) {
            throw new BusinessRuleException(
                'لا يمكن حذف الحساب ورصيدك أكبر من صفر. اسحب رصيدك أو استهلكه أولاً.',
                'ACCOUNT_HAS_BALANCE',
            );
        }

        if ((int) $wallet->held_fils > 0) {
            throw new BusinessRuleException(
                'لديك مبلغ محجوز على رحلة جارية. أكمل الرحلة أو ألغِها ثم أعد المحاولة.',
                'ACCOUNT_HAS_HELD_FUNDS',
            );
        }
    }

    /**
     * Driver documents are the most sensitive files in the system — national ID,
     * licence, insurance, criminal record certificate — and they were never deleted:
     * not on rejection, not on resignation, not on account deletion. They go now,
     * from storage as well as from the table.
     */
    private function eraseDriverArtifacts(User $user): void
    {
        $profile = DriverProfile::where('user_id', $user->id)->first();
        if (! $profile) {
            return;
        }

        DriverDocument::where('driver_id', $profile->id)
            ->get()
            ->each(function (DriverDocument $doc) {
                // The file first: a row without a file is a bookkeeping gap, but a
                // file without a row is an orphan nobody will ever find again.
                if ($doc->file_path) {
                    Storage::disk(config('filesystems.default'))->delete($doc->file_path);
                }
                $doc->forceDelete();
            });

        // The national ID is the single most identifying field in the whole schema —
        // in Jordan it is the key to a person's civil, tax and vehicle records. It
        // also stays readable in `driver_profiles` after a soft delete, so erasing the
        // user row alone left it behind.
        $profile->forceFill([
            'national_id' => null,
            'face_verified_at' => null,
            'liveness_verified_at' => null,
            'review_note' => null,
        ])->save();
    }

    /**
     * Replace identifying fields with placeholders that are unique (so unique
     * indexes still hold) and obviously synthetic (so nobody mistakes them for data).
     *
     * The phone keeps a valid Jordanian shape because the column is validated and
     * joined on — but it is drawn from a range that cannot be issued.
     */
    private function eraseIdentity(User $user): void
    {
        $tag = Str::lower(Str::random(10));

        $user->forceFill([
            'full_name' => 'حساب محذوف',
            // +962 7 0 ... is not an allocated Jordanian mobile prefix (77/78/79 are),
            // so this can never collide with a real subscriber.
            'phone' => '+96270'.str_pad((string) random_int(0, 9999999), 7, '0', STR_PAD_LEFT),
            'email' => "erased+{$tag}@rafeeq.invalid",
            'password' => Str::random(64),
            'date_of_birth' => null,
            'avatar_path' => null,
            'metadata' => null,
            'mfa_secret' => null,
            'mfa_recovery_codes' => null,
            'mfa_enabled_at' => null,
            'phone_verified_at' => null,
            'email_verified_at' => null,
            'anonymized_at' => Clock::now(),
        ])->save();

        if ($user->avatar_path) {
            Storage::disk(config('filesystems.default'))->delete($user->avatar_path);
        }

        // Soft delete on top of anonymisation: the row stays joinable for the ledger,
        // but it is out of every default query.
        $user->delete();
    }
}
