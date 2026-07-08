<?php

namespace Rafeeq\Modules\Zones\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Rafeeq\Modules\Zones\Models\ZoneUniversityPrice;

class ZoneUniversityPriceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        $priceId = $this->route('price')?->id;
        $creating = $this->isMethod('POST');

        return [
            'zone_id' => [$creating ? 'required' : 'sometimes', 'uuid', 'exists:zones,id'],
            'university_id' => [$creating ? 'required' : 'sometimes', 'uuid', 'exists:universities,id'],
            'fare_fils' => [$creating ? 'required' : 'sometimes', 'integer', 'min:0', 'max:100000'],
            'is_active' => ['sometimes', 'boolean'],
            // Enforce one row per (zone, university) pair.
            '_pair' => [
                function ($attr, $value, $fail) use ($priceId) {
                    $zoneId = $this->input('zone_id');
                    $universityId = $this->input('university_id');
                    if (! $zoneId || ! $universityId) {
                        return;
                    }
                    $exists = ZoneUniversityPrice::query()
                        ->where('zone_id', $zoneId)
                        ->where('university_id', $universityId)
                        ->when($priceId, fn ($q) => $q->where('id', '!=', $priceId))
                        ->exists();
                    if ($exists) {
                        $fail('يوجد سعر مُسجّل لهذه المنطقة والجامعة.');
                    }
                },
            ],
        ];
    }

    /** Ensure the `_pair` closure rule always runs even when not sent. */
    protected function prepareForValidation(): void
    {
        $this->merge(['_pair' => true]);
    }

    public function validated($key = null, $default = null): array
    {
        $data = parent::validated($key, $default);
        unset($data['_pair']);

        return $data;
    }
}
