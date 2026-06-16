<?php

namespace Rafeeq\Modules\Universities\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string $name_ar
 * @property string $name_en
 * @property string $code
 * @property string|null $city
 * @property float|null $lat
 * @property float|null $lng
 * @property bool $is_active
 */
class University extends Model
{
    use HasUuid;
    use SoftDeletes;

    protected $fillable = [
        'name_ar', 'name_en', 'code', 'city',
        'lat', 'lng', 'logo_path', 'contact_phone', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'lat' => 'float',
            'lng' => 'float',
            'is_active' => 'boolean',
        ];
    }
}
