<?php

namespace Rafeeq\Modules\Subscriptions\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Rafeeq\Shared\Enums\SubscriptionStatus;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string $student_id
 * @property string $plan_id
 * @property string|null $route_id
 * @property SubscriptionStatus $status
 * @property Carbon|null $starts_at
 * @property Carbon|null $ends_at
 * @property int $remaining_rides Never null — see the 2026_09_03 migration. An
 *                                unlimited plan was an unbounded liability, and a nullable count made
 *                                "no limit" and "limit not reached" the same answer at every read site.
 * @property-read SubscriptionPlan|null $plan
 */
class Subscription extends Model
{
    use HasUuid;
    use SoftDeletes;

    protected $fillable = [
        'student_id', 'plan_id', 'route_id', 'status',
        'starts_at', 'ends_at', 'remaining_rides',
    ];

    protected function casts(): array
    {
        return [
            'status' => SubscriptionStatus::class,
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'remaining_rides' => 'integer',
        ];
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(SubscriptionPlan::class, 'plan_id');
    }

    public function isUsable(): bool
    {
        return $this->status === SubscriptionStatus::Active
            && ! ($this->ends_at && $this->ends_at->isPast())
            && $this->remaining_rides > 0;
    }

    /**
     * Plans that could cover a seat on this route.
     *
     * Deliberately does NOT filter `ends_at` or `remaining_rides` — it narrows by the
     * two indexed columns and leaves the rest to `isUsable()`, so there is one
     * definition of "usable" instead of a SQL half and a PHP half that can disagree.
     * Every caller must post-filter; see `TripService::coveringSubscription`.
     */
    public function scopeActiveForRoute(Builder $q, string $studentId, ?string $routeId): Builder
    {
        return $q->where('student_id', $studentId)
            ->where('status', SubscriptionStatus::Active->value)
            ->when($routeId, fn ($qq) => $qq->where(fn ($w) => $w->whereNull('route_id')->orWhere('route_id', $routeId)));
    }
}
