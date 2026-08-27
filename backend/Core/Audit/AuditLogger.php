<?php

namespace Rafeeq\Core\Audit;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Rafeeq\Core\Support\Safely;

/**
 * Writes immutable audit-trail entries for sensitive actions.
 *
 * ── Two kinds of audit entry, and why the difference matters ───────────────────
 *
 * For almost everything, an audit write is a SIDE-EFFECT and must never break the
 * action it describes. A student should not be denied a ride because an audit insert
 * hit a deadlock. That is what `log()` does: it swallows the failure through
 * `Safely` and returns null.
 *
 * But for a small set of actions the audit entry is not a description of the fact —
 * it IS the fact, and the only record of it. An admin crediting a wallet creates
 * balance with no bank transfer behind it; `config('rafeeq.admin_credit_max_fils')`
 * documents that the entry is what makes this "bounded rather than trusted to the
 * operator". If that insert silently fails, money now exists with no trace of who
 * made it or why, and the ledger says a balance appeared from nowhere.
 *
 * Swallowing that is not resilience, it is losing the evidence. `logOrFail()` throws
 * instead, so the surrounding transaction rolls back and the credit never happens.
 * A refused admin credit is a support ticket; an untraceable one is an audit finding.
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

    /**
     * Write an audit entry that the action CANNOT proceed without.
     *
     * For actions where the entry is the only record that the action happened at all
     * — an admin creating balance, an admin reversing it, a ban. Called inside the
     * action's transaction so a failed write rolls the action back rather than
     * leaving an unexplained movement in the ledger.
     *
     * Deliberately not the default: making every audit write mandatory would let an
     * audit-table problem take down rides, payments and logins.
     *
     * @throws \RuntimeException when the entry cannot be written
     */
    public function logOrFail(
        string $action,
        ?object $user = null,
        ?Request $request = null,
        ?Model $auditable = null,
        array $changes = [],
    ): AuditLog {
        $entry = $this->log($action, $user, $request, $auditable, $changes);

        if ($entry === null) {
            throw new \RuntimeException(
                "Refusing to complete [{$action}]: its audit entry could not be written, "
                .'and this action must not happen without one.'
            );
        }

        return $entry;
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
