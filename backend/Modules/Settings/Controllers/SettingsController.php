<?php

namespace Rafeeq\Modules\Settings\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Settings\Requests\UpdateCliqRequest;
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
}
