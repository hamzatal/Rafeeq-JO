<?php

namespace Rafeeq\Modules\Safety\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Exceptions\AuthorizationException;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Safety\Services\GpsFraudService;

/**
 * Generic captain location ping (not tied to a single trip). Used to keep
 * watching a captain right after they cancel a trip, enabling ghost-trip
 * detection even when no trip is active.
 */
class DriverLocationController extends Controller
{
    public function __construct(private readonly GpsFraudService $gps) {}

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
            'speed' => ['nullable', 'numeric', 'min:0'],
        ]);

        $driver = $request->user()->driverProfile;
        if (! $driver) {
            throw new AuthorizationException('لا يوجد ملف كابتن.');
        }

        $this->gps->recordDriverPing(
            $driver->id,
            (float) $data['lat'],
            (float) $data['lng'],
            isset($data['speed']) ? (float) $data['speed'] : null,
        );

        return $this->ok(null, 'تم تحديث الموقع.');
    }
}
