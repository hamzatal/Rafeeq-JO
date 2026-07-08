<?php

namespace Rafeeq\Modules\Settings\Controllers;

use Illuminate\Http\JsonResponse;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Settings\Requests\UpdateCliqRequest;
use Rafeeq\Modules\Settings\Requests\UpdatePricingRequest;
use Rafeeq\Modules\Settings\Services\SettingService;

/**
 * Admin settings management. Gated by `settings.manage`.
 */
class SettingsController extends Controller
{
    public function __construct(private readonly SettingService $settings) {}

    /** Current CliQ transfer details (DB override or config fallback). */
    public function cliq(): JsonResponse
    {
        return $this->ok($this->settings->cliq());
    }

    public function updateCliq(UpdateCliqRequest $request): JsonResponse
    {
        $cliq = $this->settings->updateCliq($request->validated(), $request->user());

        return $this->ok($cliq, 'تم تحديث إعدادات CliQ.');
    }

    /** Current pricing knobs (DB override or config fallback). */
    public function pricing(): JsonResponse
    {
        return $this->ok($this->settings->pricing());
    }

    public function updatePricing(UpdatePricingRequest $request): JsonResponse
    {
        $pricing = $this->settings->updatePricing($request->validated(), $request->user());

        return $this->ok($pricing, 'تم تحديث إعدادات التسعير.');
    }
}
