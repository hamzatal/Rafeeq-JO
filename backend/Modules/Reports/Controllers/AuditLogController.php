<?php

namespace Rafeeq\Modules\Reports\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Core\Support\Csv;
use Rafeeq\Modules\Reports\Services\AuditQueryService;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Admin viewer for the immutable audit trail.
 * Routes: /api/v1/admin/audit-logs  (permission: audit.view)
 */
class AuditLogController extends Controller
{
    public function __construct(private readonly AuditQueryService $audit) {}

    private function filters(Request $request): array
    {
        return $request->only(['action', 'user_id', 'auditable_type', 'from', 'to']);
    }

    public function index(Request $request): JsonResponse
    {
        $page = $this->audit->paginate($this->filters($request), (int) $request->query('per_page', 30));

        return $this->ok($page);
    }

    /** Distinct action names for the filter dropdown. */
    public function actions(): JsonResponse
    {
        return $this->ok($this->audit->actions());
    }

    public function export(Request $request): StreamedResponse
    {
        $query = $this->audit->query($this->filters($request));
        $filename = 'audit-logs-'.now()->format('Ymd-His').'.csv';

        return Csv::download(
            $filename,
            ['التاريخ', 'الإجراء', 'المستخدم', 'النوع', 'المعرّف', 'IP', 'التغييرات'],
            function (callable $write) use ($query): void {
                $query->chunk(500, function ($logs) use ($write): void {
                    foreach ($logs as $log) {
                        $write([
                            $log->created_at?->toDateTimeString(),
                            $log->action,
                            $log->user_id,
                            $log->auditable_type ? class_basename($log->auditable_type) : null,
                            $log->auditable_id,
                            $log->ip,
                            $log->changes ? json_encode($log->changes, JSON_UNESCAPED_UNICODE) : null,
                        ]);
                    }
                });
            },
        );
    }
}
