<?php

namespace Rafeeq\Modules\Addresses\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Addresses\Models\SavedAddress;
use Rafeeq\Modules\Addresses\Requests\StoreAddressRequest;
use Rafeeq\Modules\Addresses\Requests\UpdateAddressRequest;
use Rafeeq\Modules\Addresses\Resources\SavedAddressResource;
use Rafeeq\Modules\Addresses\Services\AddressService;

/**
 * Student saved addresses.
 * Routes: /api/v1/student/addresses  (role:student)
 */
class AddressController extends Controller
{
    public function __construct(private readonly AddressService $addresses) {}

    public function index(Request $request): JsonResponse
    {
        return $this->ok(SavedAddressResource::collection($this->addresses->forUser($request->user())));
    }

    public function store(StoreAddressRequest $request): JsonResponse
    {
        $address = $this->addresses->create($request->user(), $request->validated());

        return $this->created(new SavedAddressResource($address), 'تم حفظ العنوان.');
    }

    public function update(UpdateAddressRequest $request, SavedAddress $address): JsonResponse
    {
        $address = $this->addresses->update($request->user(), $address, $request->validated());

        return $this->ok(new SavedAddressResource($address), 'تم تحديث العنوان.');
    }

    public function destroy(Request $request, SavedAddress $address): JsonResponse
    {
        $this->addresses->delete($request->user(), $address);

        return $this->ok(null, 'تم حذف العنوان.');
    }

    public function setDefault(Request $request, SavedAddress $address): JsonResponse
    {
        $address = $this->addresses->setDefault($request->user(), $address);

        return $this->ok(new SavedAddressResource($address), 'تم تعيين العنوان الافتراضي.');
    }
}
