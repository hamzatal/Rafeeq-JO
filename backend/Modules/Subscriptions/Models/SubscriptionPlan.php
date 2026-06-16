<?php

namespace Rafeeq\Modules\Subscriptions\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Rafeeq\Shared\Enums\SubscriptionType;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string|null $university_id
 * @property string|null $route_id
 * @property string $name
 * @property SubscriptionType $type
 * @property int $price_fils
 * @property int|null $rides_count
 * @property int $duration_days
 * @property bool $is_active
 */
class SubscriptionPlan extends Model
{
    use HasUuid;
    use SoftDeletes;

    protected $fillable = [
        'university_id', 'route_id', 'name', 'type',
        'price_fils', 'rides_count', 'duration_days', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'type' => SubscriptionType::class,
            'price_fils' => 'integer',
            'rides_count' => 'integer',
            'duration_days' => 'integer',
            'is_active' => 'boolean',
        ];
    }
}
