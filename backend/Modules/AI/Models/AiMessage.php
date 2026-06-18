<?php

namespace Rafeeq\Modules\AI\Models;

use Illuminate\Database\Eloquent\Model;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $conversation_id
 * @property string $role
 * @property string $content
 * @property int $tokens
 */
class AiMessage extends Model
{
    use HasUuid;

    protected $fillable = ['conversation_id', 'role', 'content', 'tokens'];

    protected function casts(): array
    {
        return ['tokens' => 'integer'];
    }
}
