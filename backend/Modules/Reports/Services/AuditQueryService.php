<?php

namespace Rafeeq\Modules\Reports\Services;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Rafeeq\Core\Audit\AuditLog;
use Rafeeq\Core\Services\BaseService;

/**
 * Read-only access to the immutable audit trail for the admin viewer + export.
 * Supports filtering by action, actor, target type and a date range.
 */
class AuditQueryService extends BaseService
{
    /**
     * @param  array<string, mixed>  $filters
     */
    public function query(array $filters = []): Builder
    {
        return AuditLog::query()
            ->when(! empty($filters['action']), fn ($q) => $q->where('action', 'like', '%'.$filters['action'].'%'))
            ->when(! empty($filters['user_id']), fn ($q) => $q->where('user_id', $filters['user_id']))
            ->when(! empty($filters['auditable_type']), fn ($q) => $q->where('auditable_type', 'like', '%'.$filters['auditable_type'].'%'))
            ->when(! empty($filters['from']), fn ($q) => $q->where('created_at', '>=', Carbon::parse($filters['from'])->startOfDay()))
            ->when(! empty($filters['to']), fn ($q) => $q->where('created_at', '<=', Carbon::parse($filters['to'])->endOfDay()))
            ->orderByDesc('created_at');
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    public function paginate(array $filters = [], int $perPage = 30): LengthAwarePaginator
    {
        return $this->query($filters)->paginate(min($perPage, 100));
    }

    /**
     * Distinct action names for the filter dropdown (cheap, append-only table).
     *
     * @return array<int, string>
     */
    public function actions(): array
    {
        return AuditLog::query()->select('action')->distinct()->orderBy('action')->pluck('action')->all();
    }
}
