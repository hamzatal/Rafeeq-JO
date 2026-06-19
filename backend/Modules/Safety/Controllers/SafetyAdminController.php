<?php

namespace Rafeeq\Modules\Safety\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Safety\Models\CancellationLog;
use Rafeeq\Modules\Safety\Models\RiskFlag;

class SafetyAdminController extends Controller
{
    public function riskFlags(Request $request): JsonResponse
    {
        $query = RiskFlag::query()->latest('created_at');
        if ($request->boolean('unresolved')) {
            $query->whereNull('resolved_at');
        }
        if ($severity = $request->query('severity')) {
            $query->where('severity', $severity);
        }

        $flags = $query->paginate((int) $request->query('per_page', 30));

        return $this->ok($flags->through(fn (RiskFlag $f) => [
            'id' => $f->id,
            'user_id' => $f->user_id,
            'type' => $f->type,
            'severity' => $f->severity->value,
            'severity_label' => $f->severity->label(),
            'description' => $f->description,
            'meta' => $f->meta,
            'resolved' => $f->resolved_at !== null,
            'created_at' => $f->created_at?->toIso8601String(),
        ]));
    }

    public function resolveFlag(Request $request, RiskFlag $riskFlag): JsonResponse
    {
        $riskFlag->forceFill(['resolved_at' => now(), 'resolved_by' => $request->user()->id])->save();

        return $this->ok(null, 'تمت معالجة العلامة.');
    }

    public function cancellations(Request $request): JsonResponse
    {
        $logs = CancellationLog::query()->latest('created_at')->paginate((int) $request->query('per_page', 30));

        return $this->ok($logs->through(fn (CancellationLog $c) => [
            'id' => $c->id,
            'trip_id' => $c->trip_id,
            'actor_user_id' => $c->actor_user_id,
            'actor_role' => $c->actor_role,
            'reason' => $c->reason,
            'passengers_count' => $c->passengers_count,
            'lat' => $c->lat,
            'lng' => $c->lng,
            'created_at' => $c->created_at?->toIso8601String(),
        ]));
    }
}
