<?php

namespace Rafeeq\Modules\Parcels\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Exceptions\AuthorizationException;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\Parcels\Models\Parcel;
use Rafeeq\Modules\Parcels\Requests\CreateParcelRequest;
use Rafeeq\Modules\Parcels\Resources\ParcelResource;
use Rafeeq\Modules\Parcels\Services\ParcelService;
use Rafeeq\Shared\Enums\ParcelStatus;

class ParcelController extends Controller
{
    public function __construct(private readonly ParcelService $parcels) {}

    // ── Sender ──────────────────────────────────────────────────────────
    public function mine(Request $request): JsonResponse
    {
        $items = Parcel::where('sender_id', $request->user()->id)->latest()
            ->paginate((int) $request->query('per_page', 20));

        return $this->ok(ParcelResource::collection($items));
    }

    public function create(CreateParcelRequest $request): JsonResponse
    {
        $parcel = $this->parcels->create($request->user(), $request->validated());

        return $this->created(new ParcelResource($parcel), 'تم إنشاء الطرد. شارك كود الاستلام مع الكابتن.');
    }

    public function show(Request $request, Parcel $parcel): JsonResponse
    {
        if ($parcel->sender_id !== $request->user()->id && ! $request->user()->hasAnyRole(['admin', 'supervisor'])) {
            throw new AuthorizationException('هذا الطرد لا يخصّك.');
        }

        return $this->ok(new ParcelResource($parcel->load('events')));
    }

    public function cancel(Request $request, Parcel $parcel): JsonResponse
    {
        if ($parcel->sender_id !== $request->user()->id) {
            throw new AuthorizationException('هذا الطرد لا يخصّك.');
        }

        return $this->ok(new ParcelResource($this->parcels->cancel($parcel, $request->user())), 'تم الإلغاء.');
    }

    // ── Courier (driver) ────────────────────────────────────────────────
    public function available(Request $request): JsonResponse
    {
        $items = Parcel::where('status', ParcelStatus::AwaitingPickup->value)
            ->whereNull('courier_id')
            ->latest()->paginate((int) $request->query('per_page', 20));

        return $this->ok(ParcelResource::collection($items));
    }

    public function accept(Request $request, Parcel $parcel): JsonResponse
    {
        $courier = $this->courier($request);

        return $this->ok(new ParcelResource($this->parcels->assign($parcel, $courier)), 'تم إسناد الطرد إليك.');
    }

    public function pickup(Request $request, Parcel $parcel): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'size:6'],
            'lat' => ['nullable', 'numeric'],
            'lng' => ['nullable', 'numeric'],
        ]);
        $this->assertCourier($request, $parcel);

        return $this->ok(
            new ParcelResource($this->parcels->confirmPickup($parcel, $data['code'], $data['lat'] ?? null, $data['lng'] ?? null)),
            'تم تأكيد الاستلام.',
        );
    }

    public function deliver(Request $request, Parcel $parcel): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'size:6'],
            'lat' => ['nullable', 'numeric'],
            'lng' => ['nullable', 'numeric'],
        ]);
        $this->assertCourier($request, $parcel);

        return $this->ok(
            new ParcelResource($this->parcels->confirmDelivery($parcel, $data['code'], $data['lat'] ?? null, $data['lng'] ?? null)),
            'تم تأكيد التسليم.',
        );
    }

    private function courier(Request $request): DriverProfile
    {
        $courier = DriverProfile::where('user_id', $request->user()->id)->first();
        if (! $courier) {
            throw new BusinessRuleException('حساب الكابتن غير موجود.', 'NO_DRIVER_PROFILE');
        }

        return $courier;
    }

    private function assertCourier(Request $request, Parcel $parcel): void
    {
        $courier = $this->courier($request);
        if ($parcel->courier_id !== $courier->id) {
            throw new AuthorizationException('هذا الطرد غير مُسند إليك.');
        }
    }
}
