<?php

namespace Rafeeq\Modules\Trips\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Rafeeq\Shared\Enums\PaymentMethod;

/**
 * Booking a seat directly on a scheduled trip.
 *
 * `payment_method` and `coupon_code` are new here, and their absence was a real gap
 * rather than a simplification: `book()` created the passenger row without either, so
 * `RideBillingService` fell back to wallet (`payment_method ?? Wallet`) and a seat
 * booked this way could never be paid in cash, and never carry a coupon. The matching
 * path has always persisted both. Now this one does too, so the two entrances to the
 * same car settle the same way.
 */
class BookTripRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'pickup_point_id' => ['nullable', 'uuid', 'exists:pickup_points,id'],
            'payment_method' => ['nullable', Rule::in(PaymentMethod::values())],
            // Validated for shape only. Whether it applies is CouponService's call at
            // boarding, and an invalid code must never block a ride.
            'coupon_code' => ['nullable', 'string', 'max:40'],
        ];
    }

    /** The method the student chose, defaulting to the wallet they already funded. */
    public function paymentMethod(): PaymentMethod
    {
        $value = $this->input('payment_method');

        return $value === null ? PaymentMethod::Wallet : PaymentMethod::from($value);
    }
}
