<?php

namespace Rafeeq\Modules\Settings\Models;

use Illuminate\Database\Eloquent\Model;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string $key
 * @property string|null $value
 * @property string $group
 * @property string|null $updated_by
 */
class Setting extends Model
{
    use HasUuid;

    protected $fillable = ['key', 'value', 'group', 'updated_by'];
}
