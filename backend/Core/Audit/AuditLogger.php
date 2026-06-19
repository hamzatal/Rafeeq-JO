<?php

namespace Rafeeq\Core\Audit;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Rafeeq\Core\Support\Safely;

/**
 * Writes immutable audit-trail entries for sensitive actions.
 *
 * Audit writing is a side-effect: it must never break the business action it
 * records. A failure here is logged and swallowed (Safely), returning null.
 */
class AuditLogger
{
    public function log(
        string $action,
        ?object $user = null,
        ?Request $request = null,
        ?Model $auditable = null,
        array $changes = [],
    ): ?AuditLog {
        return Safely::value(fn () => AuditLog::create([
            'user_id' => $user?->getKey(),
            'action' => $action,
            'auditable_type' => $auditable ? $auditable::class : null,
            'auditable_id' => $auditable?->getKey(),
            'changes' => $changes ?: null,
            'ip' => $request?->ip(),
            'user_agent' => $request ? substr((string) $request->userAgent(), 0, 500) : null,
        ]), default: null, context: 'audit.log', meta: ['action' => $action]);
    }

    /** Convenience helper for recording before/after model changes. */
    public function logModelChange(string $action, Model $model, array $before, array $after, ?object $user = null): ?AuditLog
    {
        return $this->log(
            action: $action,
            user: $user,
            auditable: $model,
            changes: ['before' => $before, 'after' => $after],
        );
    }
}
