<?php

namespace Rafeeq\Modules\AI\Models;

use Illuminate\Database\Eloquent\Model;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * One turn of an assistant conversation.
 *
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
        return [
            'tokens' => 'integer',

            /*
             * Encrypted at rest, like every other field that holds what a person said
             * or is.
             *
             * Phase 3 encrypted names, phone numbers, emails and national IDs — and
             * missed this, which is arguably the most revealing column in the schema.
             * An assistant transcript is a student typing, in their own words, about
             * their money («ليش رصيدي ناقص؟»), their movements («رحلتي بكرا الصبح»)
             * and their complaints about a named captain. A database copy without the
             * app key should not read as a diary.
             *
             * Transparent to everything that touches it: `AiUsageService` sums
             * `tokens` and never reads content, and the reply cache hashes the
             * message array AFTER Eloquent has decrypted it.
             *
             * The 30-day retention in `RetentionPolicy` stays as it is — the shortest
             * defensible window is still the right one, and encryption is not a reason
             * to keep something longer.
             */
            'content' => 'encrypted',
        ];
    }
}
