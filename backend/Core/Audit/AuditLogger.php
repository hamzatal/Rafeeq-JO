<?php

namespace Rafeeq\Core\Audit;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

/**
 * Writes immutable audit-trail entries for sensitive actions.
 */
class AuditLogger
{
    public function log(
        string $action,
        ?object $user = null,
        ?Request $request = null,
        ?Model $auditable = null,
        array $changes = [],
    ): AuditLog {
        return AuditLog::create([
            'user_id' => $user?->getKey(),
            'action' => $action,
            'auditable_type' => $auditable ? $auditable::class : null,
            'auditable_id' => $auditable?->getKey(),
            'changes' => $changes ?: null,
            'ip' => $request?->ip(),
            'user_agent' => $request ? substr((string) $request->userAgent(), 0, 500) : null,
        ]);
    }

    /** Convenience helper for recording before/after model changes. */
    public function logModelChange(string $action, Model $model, array $before, array $after, ?object $user = null): AuditLog
    {
        return $this->log(
            action: $action,
            user: $user,
            auditable: $model,
            changes: ['before' => $before, 'after' => $after],
        );
    }
}
