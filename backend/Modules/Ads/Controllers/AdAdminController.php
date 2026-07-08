<?php

namespace Rafeeq\Modules\Ads\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Ads\Models\AdBanner;
use Rafeeq\Modules\Ads\Requests\StoreAdBannerRequest;
use Rafeeq\Modules\Ads\Requests\UpdateAdBannerRequest;
use Rafeeq\Modules\Ads\Resources\AdBannerResource;
use Rafeeq\Modules\Ads\Services\AdBannerService;

/**
 * Admin CRUD for advertising banners.
 */
class AdAdminController extends Controller
{
    public function __construct(private readonly AdBannerService $ads) {}

    public function index(Request $request): JsonResponse
    {
        $placement = $request->query('placement');

        return $this->ok(AdBannerResource::collection($this->ads->all($placement ? (string) $placement : null)));
    }

    public function store(StoreAdBannerRequest $request): JsonResponse
    {
        $banner = $this->ads->create($request->validated(), $request->user());

        return $this->created(new AdBannerResource($banner), 'تمت إضافة الإعلان.');
    }

    public function update(UpdateAdBannerRequest $request, AdBanner $ad): JsonResponse
    {
        $banner = $this->ads->update($ad, $request->validated(), $request->user());

        return $this->ok(new AdBannerResource($banner), 'تم تحديث الإعلان.');
    }

    public function destroy(Request $request, AdBanner $ad): JsonResponse
    {
        $this->ads->delete($ad, $request->user());

        return $this->ok(null, 'تم حذف الإعلان.');
    }
}
