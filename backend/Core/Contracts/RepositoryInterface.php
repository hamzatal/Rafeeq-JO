<?php

namespace Rafeeq\Core\Contracts;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Pagination\LengthAwarePaginator;

interface RepositoryInterface
{
    public function find(string $id): ?Model;

    public function findOrFail(string $id): Model;

    public function all(): Collection;

    public function paginate(int $perPage = 20): LengthAwarePaginator;

    public function create(array $attributes): Model;

    public function update(Model $model, array $attributes): Model;

    public function delete(Model $model): bool;
}
