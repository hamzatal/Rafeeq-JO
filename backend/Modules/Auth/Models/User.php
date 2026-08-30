<?php

namespace Rafeeq\Modules\Auth\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\HasApiTokens;
use Rafeeq\Core\Permissions\HasRoles;
use Rafeeq\Core\Support\Clock;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\RideRequests\Models\RideRequest;
use Rafeeq\Modules\Students\Models\StudentProfile;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Rafeeq\Shared\Support\BlindIndex;
use Rafeeq\Shared\Traits\HasBlindIndexes;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string $full_name
 * @property string $phone
 * @property Carbon|null $phone_verified_at
 * @property string|null $email
 * @property string|null $password
 * @property UserType $type
 * @property UserStatus $status
 * @property string $locale
 * @property string|null $avatar_path
 * @property Carbon|null $date_of_birth Minimum age is 18 — Jordan's age of majority.
 * @property string|null $terms_version Which terms version was accepted; bumping the
 *                                      configured version invalidates every stored acceptance.
 * @property Carbon|null $terms_accepted_at
 * @property Carbon|null $anonymized_at Set by AccountErasureService once the
 *                                      identifying fields have been replaced with placeholders.
 * @property array|null $metadata
 * @property string|null $mfa_secret
 * @property Carbon|null $mfa_enabled_at
 * @property array|null $mfa_recovery_codes
 */
class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens;
    use HasBlindIndexes;
    use HasRoles;
    use HasUuid;
    use Notifiable;
    use SoftDeletes;

    protected $fillable = [
        'full_name', 'phone', 'email', 'password', 'date_of_birth',
        'type', 'status', 'locale', 'avatar_path', 'metadata',
        'terms_version', 'terms_accepted_at',
    ];

    /**
     * The digests are hidden as well as the secrets.
     *
     * A blind index is not a secret in the way a password hash is, but it is a
     * stable per-person identifier: two API consumers who both see a `phone_hash`
     * can correlate the same person across contexts without ever holding the number.
     * There is no reason for a client to receive it, so it does not leave the server.
     */
    protected $hidden = [
        'password', 'remember_token',
        'mfa_secret', 'mfa_recovery_codes',
        'phone_hash', 'email_hash', 'name_tokens',
    ];

    protected function casts(): array
    {
        return [
            'phone_verified_at' => 'datetime',
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'mfa_enabled_at' => 'datetime',
            'password' => 'hashed',
            'mfa_secret' => 'encrypted',
            'mfa_recovery_codes' => 'encrypted:array',
            /*
             * 3.8 — encrypted at rest. A database copy without the app key holds no
             * names and no numbers. Lookups go through the blind-index columns
             * below; see Shared\Support\BlindIndex for why they are HMACs.
             */
            'full_name' => 'encrypted',
            'phone' => 'encrypted',
            'email' => 'encrypted',
            'name_tokens' => 'array',
            'type' => UserType::class,
            'status' => UserStatus::class,
            'metadata' => 'array',
            'date_of_birth' => 'date',
            'terms_accepted_at' => 'datetime',
            'anonymized_at' => 'datetime',
        ];
    }

    /** @return array<string, array{0: string, 1: callable}> */
    protected function blindIndexes(): array
    {
        return [
            'phone' => ['phone_hash', fn (?string $v) => BlindIndex::phone($v)],
            'email' => ['email_hash', fn (?string $v) => BlindIndex::email($v)],
            'full_name' => ['name_tokens', fn (?string $v) => BlindIndex::nameTokens($v)],
        ];
    }

    /**
     * Staff search over encrypted identity columns.
     *
     * ── What changed, and what it costs ────────────────────────────────────────
     *
     * This used to be `full_name LIKE '%term%' OR phone LIKE '%term%' OR email LIKE
     * '%term%'` — an unindexed substring scan across three plaintext columns. Those
     * columns are ciphertext now, so a substring match is not merely slow, it is
     * impossible: there is nothing readable to match against.
     *
     * What replaces it is deliberately narrower, and worth stating plainly:
     *
     *   • A phone number matches EXACTLY, in any format the agent types
     *     (`0791234567`, `+962 79 123 4567`) because the digest normalises first.
     *     Partial numbers no longer match. This is the search staff actually use —
     *     a caller reads out their whole number — and it is now an index seek.
     *   • An email matches exactly, case-insensitively.
     *   • A name matches on WHOLE WORDS, all of which must be present. «الخطيب»
     *     finds every Khatib; «خطي» finds nobody.
     *
     * Substring search over encrypted data cannot be had without either decrypting
     * the whole table on every keystroke or building an n-gram index that leaks
     * enough to reconstruct the names it was meant to protect. Losing «خطي» is the
     * price of a stolen database backup containing no readable names, and that is a
     * trade worth making in a product whose riders are mostly young women on a
     * predictable daily schedule.
     */
    public function scopeSearchIdentity(Builder $query, ?string $term): Builder
    {
        $term = trim((string) $term);
        if ($term === '') {
            return $query;
        }

        return $query->where(function (Builder $w) use ($term) {
            $matched = false;

            if (str_contains($term, '@')) {
                if ($hash = BlindIndex::email($term)) {
                    $w->orWhere('email_hash', $hash);
                    $matched = true;
                }
            }

            // Tried whenever the term could be a number at all, so a search that is
            // "0790" (not a valid number) still falls through to a name match rather
            // than silently returning everything.
            if (preg_match('/^[\d\s+\-()]+$/', $term) === 1) {
                if ($hash = BlindIndex::phone($term)) {
                    $w->orWhere('phone_hash', $hash);
                    $matched = true;
                }
            }

            $tokens = BlindIndex::nameTokens($term);
            if ($tokens !== []) {
                // jsonb containment: every token must be present. Uses the GIN index
                // `users_name_tokens_gin`.
                $w->orWhereRaw('name_tokens @> ?::jsonb', [json_encode($tokens)]);
                $matched = true;
            }

            if (! $matched) {
                // A term we cannot turn into any digest matches nothing. Without this
                // the empty `where` group would match EVERY row, turning a nonsense
                // search into a full user dump — the worst possible failure here.
                $w->whereRaw('1 = 0');
            }
        });
    }

    /**
     * Age in whole years, or null when unknown.
     *
     * Compared against the start of today, so a birthday later today still counts as
     * the younger age — the conservative direction for a minimum-age rule. The `(int)`
     * cast is required: Carbon's diffInYears returns a float, and truncating it errs
     * the same safe way.
     */
    public function age(): ?int
    {
        if ($this->date_of_birth === null) {
            return null;
        }

        return (int) $this->date_of_birth->diffInYears(Clock::now()->startOfDay());
    }

    /** Has this account been erased? Its identifying fields are placeholders. */
    public function isAnonymized(): bool
    {
        return $this->anonymized_at !== null;
    }

    /** Has this user accepted the current terms version? */
    public function hasAcceptedCurrentTerms(): bool
    {
        return $this->terms_accepted_at !== null
            && $this->terms_version === (string) config('rafeeq.legal.version');
    }

    /** Whether two-factor authentication is active for this account. */
    public function hasMfaEnabled(): bool
    {
        return $this->mfa_enabled_at !== null;
    }

    public function isPhoneVerified(): bool
    {
        return $this->phone_verified_at !== null;
    }

    public function markPhoneVerified(): void
    {
        if (! $this->isPhoneVerified()) {
            $this->forceFill(['phone_verified_at' => now()])->save();
        }
    }

    public function isStaff(): bool
    {
        return $this->type->isStaff();
    }

    public function canLogin(): bool
    {
        return $this->status->canLogin();
    }

    public function studentProfile(): HasOne
    {
        return $this->hasOne(StudentProfile::class);
    }

    public function driverProfile(): HasOne
    {
        return $this->hasOne(DriverProfile::class);
    }

    /**
     * The rides this user has ASKED for.
     *
     * Added for `Notifications\Support\BroadcastAudience`, which segments by zone.
     * A zone is not a property of a person — there is no `users.zone_id`, and adding
     * one would be a value that goes stale the day a student moves house. It is a
     * property of where they RIDE, and this relation is where the platform actually
     * knows that.
     */
    public function rideRequests(): HasMany
    {
        return $this->hasMany(RideRequest::class, 'student_id');
    }
}
