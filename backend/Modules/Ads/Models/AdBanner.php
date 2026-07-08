<?php

namespace Rafeeq\Modules\Ads\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string $title
 * @property string $image_url
 * @property string|null $link_url
 * @property string $placement
 * @property bool $is_active
 * @property int $sort_order
 * @property Carbon|null $starts_at
 * @property Carbon|null $ends_at
 */
class AdBanner extends Model
{
    use HasUuid;
    use SoftDeletes;

    /** Known placement slots across the apps. */
    public const PLACEMENTS = ['student_home', 'student_wallet', 'driver_home'];

    protected $fillable = [
        'title', 'image_url', 'link_url', 'placement', 'is_active', 'sort_order', 'starts_at', 'ends_at',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'sort_order' => 'integer',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
        ];
    }

    /**
     * Scope: banners that should currently be shown — active and (if a date
     * window is set) within it.
     */
    public function scopeLive(Builder $query): Builder
    {
        $now = now();

        return $query->where('is_active', true)
            ->where(fn (Builder $q) => $q->whereNull('starts_at')->orWhere('starts_at', '<=', $now))
            ->where(fn (Builder $q) => $q->whereNull('ends_at')->orWhere('ends_at', '>=', $now));
    }
}
