<?php

namespace Rafeeq\Modules\Notifications\Support;

use Illuminate\Database\Eloquent\Builder;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;

/**
 * Who a broadcast goes to — resolved in ONE place.
 *
 * ── The bug this removes ───────────────────────────────────────────────────
 *
 * The audience `match` existed twice, character for character: once in
 * `AdminNotificationController::send()` to compute the COUNT the operator is shown,
 * and once in `BroadcastNotificationJob::handle()` to select the people who actually
 * receive it. Two copies of "who gets this" is a promise that can be broken, and it
 * already was: `send()` filtered out banned users and `audience()` did not, so the
 * chip in the dashboard and the number in the confirmation disagreed with each other
 * and with reality.
 *
 * Any new filter had to be added in two places to work and in one place to be wrong.
 *
 * ── Why the filters are what they are ──────────────────────────────────────
 *
 * Before this, an operator had three buttons: everyone, all students, all captains.
 * For a product launching «موجة اليرموك × أربع مناطق» that is not enough to run the
 * launch: "the shuttle from حي الجامعة starts Sunday" is true for a few hundred
 * students and noise for everyone else, and a notification that is noise to most
 * recipients is how a user learns to swipe all of them away.
 *
 * So the segment is now (type × university × zone × status), each optional:
 *
 *   • **university** — reads `student_profiles.university_id`. The single most useful
 *     cut for this product, because service is opened campus by campus.
 *   • **zone** — the corridor. A student's zone is not stored on their profile, so it
 *     is derived from their most recent ride request, which is the only place the
 *     platform actually knows where someone rides from. A captain's zone comes from
 *     their trips.
 *   • **status** — `active` or `suspended`. Being able to address suspended users is
 *     not a nicety: "your account is on hold, here is how to appeal" is exactly the
 *     message they need and the one they could not be sent.
 *
 * Banned users are excluded from every segment and cannot be targeted. A ban is the
 * end of the relationship; a marketing push after one is a message to someone who
 * asked to be left alone.
 */
final class BroadcastAudience
{
    public const TYPES = ['all', 'students', 'drivers', 'users'];

    public const STATUSES = ['active', 'suspended'];

    /**
     * @param  'all'|'students'|'drivers'|'users'  $type
     * @param  list<string>  $userIds
     */
    public function __construct(
        public readonly string $type,
        public readonly array $userIds = [],
        public readonly ?string $universityId = null,
        public readonly ?string $zoneId = null,
        public readonly ?string $status = null,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public static function fromRequest(array $data): self
    {
        return new self(
            type: (string) $data['audience'],
            userIds: array_values(array_map('strval', $data['user_ids'] ?? [])),
            universityId: $data['university_id'] ?? null,
            zoneId: $data['zone_id'] ?? null,
            status: $data['status'] ?? null,
        );
    }

    /** @return array<string, mixed> Serialisable form, for the job and the audit row. */
    public function toArray(): array
    {
        return [
            'audience' => $this->type,
            'user_ids' => $this->userIds,
            'university_id' => $this->universityId,
            'zone_id' => $this->zoneId,
            'status' => $this->status,
        ];
    }

    /** @param array<string, mixed> $state */
    public static function fromArray(array $state): self
    {
        return self::fromRequest($state);
    }

    /** @return Builder<User> */
    public function query(): Builder
    {
        /*
         * Banned is excluded unconditionally and first, so no combination of the
         * filters below can reach someone who has been shown the door.
         */
        $query = User::query()->where('status', '!=', UserStatus::Banned->value);

        match ($this->type) {
            'students' => $query->where('type', UserType::Student->value),
            'drivers' => $query->where('type', UserType::Driver->value),
            /* An explicit list still respects the ban exclusion above. */
            'users' => $query->whereIn('id', $this->userIds ?: ['-']),
            default => $query->whereIn('type', [UserType::Student->value, UserType::Driver->value]),
        };

        if ($this->status !== null) {
            $query->where('status', $this->status);
        }

        if ($this->universityId !== null) {
            $query->whereHas('studentProfile', fn ($q) => $q->where('university_id', $this->universityId));
        }

        if ($this->zoneId !== null) {
            /*
             * A zone is a property of where someone RIDES, not of their profile — there
             * is no `users.zone_id` and inventing one would go stale the day a student
             * moves. Students are matched through their ride requests and captains
             * through the trips they drove, which is the same definition the matcher
             * and the reports use.
             */
            $query->where(function ($q) {
                $q->whereHas('rideRequests', fn ($r) => $r->where('zone_id', $this->zoneId))
                    ->orWhereHas('driverProfile.trips', fn ($t) => $t->where('zone_id', $this->zoneId));
            });
        }

        return $query;
    }

    /** A short human description for the audit trail. */
    public function describe(): string
    {
        $parts = [$this->type];
        if ($this->type === 'users') {
            $parts[] = count($this->userIds).' named';
        }
        if ($this->universityId !== null) {
            $parts[] = 'university='.$this->universityId;
        }
        if ($this->zoneId !== null) {
            $parts[] = 'zone='.$this->zoneId;
        }
        if ($this->status !== null) {
            $parts[] = 'status='.$this->status;
        }

        return implode(' · ', $parts);
    }
}
