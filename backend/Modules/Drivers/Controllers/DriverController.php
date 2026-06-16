<?php

namespace Rafeeq\Modules\Drivers\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Drivers\Requests\UpdateDriverProfileRequest;
use Rafeeq\Modules\Drivers\Requests\UploadDocumentRequest;
use Rafeeq\Modules\Drivers\Resources\DriverDocumentResource;
use Rafeeq\Modules\Drivers\Resources\DriverProfileResource;
use Rafeeq\Modules\Drivers\Services\DriverDocumentService;
use Rafeeq\Modules\Drivers\Services\DriverService;

class DriverController extends Controller
{
    public function __construct(
        private readonly DriverService $drivers,
        private readonly DriverDocumentService $documents,
    ) {}

    public function show(Request $request): JsonResponse
    {
        $profile = $this->drivers->forUser($request->user())->load(['documents', 'vehicles']);

        return $this->ok(new DriverProfileResource($profile));
    }

    public function updateProfile(UpdateDriverProfileRequest $request): JsonResponse
    {
        $profile = $this->drivers->updateProfile($request->user(), $request->validated());

        return $this->ok(new DriverProfileResource($profile), 'تم تحديث بيانات الكابتن.');
    }

    public function uploadDocument(UploadDocumentRequest $request): JsonResponse
    {
        $driver = $this->drivers->forUser($request->user());

        $document = $this->documents->upload(
            $driver,
            $request->type(),
            $request->file('file'),
            $request->input('expires_at'),
        );

        return $this->created(new DriverDocumentResource($document), 'تم رفع الوثيقة.');
    }

    public function submit(Request $request): JsonResponse
    {
        $profile = $this->drivers->submitForReview($request->user());

        return $this->ok(new DriverProfileResource($profile), 'تم إرسال طلبك للمراجعة.');
    }
}
