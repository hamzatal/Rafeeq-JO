<?php

namespace Rafeeq\Core\Services;

use Illuminate\Support\Facades\DB;
use Throwable;

abstract class BaseService
{
    /**
     * Run a unit of work inside a database transaction.
     *
     * @template T
     *
     * @param  callable():T  $callback
     * @return T
     *
     * @throws Throwable
     */
    protected function transaction(callable $callback): mixed
    {
        return DB::transaction($callback);
    }
}
