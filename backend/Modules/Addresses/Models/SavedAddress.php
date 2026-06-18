<?php

namespace Rafeeq\Modules\Addresses\Models;

use Illuminate\Database\Eloquent\Model;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string $user_id
 * @property string $label
 * @property string|null $title
 * @property string $address_text
 * @property float|null $lat
 * @property float|null $lng
 * @property bool $is_default
 */
class SavedAddress extends Model
{
    use HasUuid;

    protected $fillable = ['user_id', 'label', 'title', 'address_text', 'lat', 'lng', 'is_default'];

    protected function casts(): array
    {
        return [
            'lat' => 'float',
            'lng' => 'float',
            'is_default' => 'boolean',
        ];
    }
}
