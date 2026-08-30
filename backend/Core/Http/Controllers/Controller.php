<?php

namespace Rafeeq\Core\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Http\Request;
use Rafeeq\Core\Http\Responses\ApiResponse;

/**
 * Base controller for all platform modules. Keep controllers thin —
 * delegate business logic to Services and return via ApiResponse.
 */
abstract class Controller
{
    use AuthorizesRequests;
    use ValidatesRequests;

    /**
     * The hard ceiling on any client-chosen page size.
     *
     * `docs/ROADMAP.md` 10.4 asks for «سقف `per_page`=100» on the dashboard; this is
     * that cap, applied at the base class so every endpoint inherits it instead of
     * each one remembering.
     */
    public const MAX_PER_PAGE = 100;

    /**
     * A validated, clamped page size.
     *
     * ── Why this exists as a method and not a habit ─────────────────────────────
     *
     * Six endpoints read `(int) $request->query('per_page', N)` straight into
     * `paginate()`, and none of them validated it — including
     * `WalletController::adminTransactions`, whose `limit` fed a bare `->get()` on a
     * user's whole financial ledger, and `PaymentController::queue`, which returns
     * every payer's name and proof metadata.
     *
     * Two consequences, both real: `?per_page=99999999` dumps a monotonically growing
     * table in one response, and `?per_page=-1` reaches Postgres as `LIMIT -1` and
     * returns a 500. A cast is not validation — `(int) 'abc'` is `0`, which paginates
     * to an empty page and reads as "there is nothing here".
     *
     * `max()`/`min()` rather than a `validate()` throw, deliberately: a nonsense page
     * size is not worth failing a request the operator is watching, and clamping is
     * the behaviour every API a client might be ported from already has.
     */
    protected function perPage(Request $request, int $default = 20): int
    {
        return $this->clamped($request->query('per_page'), $default);
    }

    /** The same clamp for endpoints that take `limit` on a non-paginated read. */
    protected function limit(Request $request, int $default = 20): int
    {
        return $this->clamped($request->query('limit'), $default);
    }

    private function clamped(mixed $raw, int $default): int
    {
        if (! is_numeric($raw)) {
            return $default;
        }

        return max(1, min(self::MAX_PER_PAGE, (int) $raw));
    }

    protected function ok(mixed $data = null, ?string $message = null, array $meta = [])
    {
        return ApiResponse::success($data, $message, 200, $meta);
    }

    protected function created(mixed $data = null, ?string $message = null)
    {
        return ApiResponse::created($data, $message);
    }

    protected function noContent()
    {
        return ApiResponse::noContent();
    }
}
