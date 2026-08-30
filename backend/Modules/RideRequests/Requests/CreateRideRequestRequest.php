<?php

namespace Rafeeq\Modules\RideRequests\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Rafeeq\Shared\Enums\PaymentMethod;
use Rafeeq\Shared\Enums\RideDirection;
use Rafeeq\Shared\Enums\RideType;

class CreateRideRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'university_id' => ['required', 'uuid', 'exists:universities,id'],
            'pickup_lat' => ['required', 'numeric', 'between:-90,90'],
            'pickup_lng' => ['required', 'numeric', 'between:-180,180'],
            'pickup_address' => ['nullable', 'string', 'max:200'],
            'desired_time' => ['required', 'date', 'after_or_equal:now'],
            // Cash or wallet. The rider chooses before a captain is matched, because the
            // captain must see it on the offer — one who cannot take cash today should be
            // able to decline knowingly rather than discover it at pickup.
            'payment_method' => ['sometimes', Rule::in(PaymentMethod::values())],
            'type' => ['sometimes', Rule::in(RideType::values())],
            /*
             * The whole car instead of a seat in it.
             *
             * A rider's choice, made here rather than after matching, because the
             * matcher must never pool a solo request — and because the captain sees it
             * on the offer: a whole-car run pays differently and carries one passenger
             * by construction.
             *
             * Whether the corridor HAS an approved whole-car price is checked in the
             * service, not here: it depends on the resolved pickup zone, which needs
             * the coordinates this request is still validating.
             */
            'is_solo' => ['sometimes', 'boolean'],
            'direction' => ['sometimes', Rule::in(RideDirection::values())],
            'notes' => ['nullable', 'string', 'max:255'],
            'coupon_code' => ['nullable', 'string', 'max:40'],
        ];
    }
}
