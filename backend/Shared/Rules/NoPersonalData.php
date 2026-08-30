<?php

namespace Rafeeq\Shared\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Rafeeq\Shared\Support\NotificationText;

/**
 * Refuse text that carries a phone number, an email address or a national ID.
 *
 * A validation rule rather than a hand-written 422, so the failure arrives in the
 * same envelope as every other validation error in this API and the dashboard renders
 * it under the offending field with no special case.
 *
 * See `Shared\Support\NotificationText` for which identifiers are blocked and why
 * names, plate numbers and amounts deliberately are not.
 */
class NoPersonalData implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value)) {
            return;
        }

        match (NotificationText::piiKind($value)) {
            /* Named specifically: "contains PII" leaves an operator hunting. */
            'phone' => $fail('النصّ يحتوي رقم هاتف. الإشعار يظهر على شاشة القفل، ويُرسل للحالات الحرجة عبر بوّابة رسائل تسجّل النصّ.'),
            'email' => $fail('النصّ يحتوي بريداً إلكترونياً، وهو معرّف الدخول في هذه المنصّة.'),
            'national_id' => $fail('النصّ يحتوي رقماً وطنياً — وهو مشفَّر في قاعدة البيانات، فلا يجوز إخراجه في إشعار.'),
            default => null,
        };
    }
}
