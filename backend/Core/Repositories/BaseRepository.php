<?php

namespace Rafeeq\Core\Repositories;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Pagination\LengthAwarePaginator;
use Rafeeq\Core\Contracts\RepositoryInterface;

abstract class BaseRepository implements RepositoryInterface
{
    /** Each repository binds its concrete model here. */
    abstract protected function model(): Model;

    protected function query(): Builder
    {
        return $this->model()->newQuery();
    }

    public function find(string $id): ?Model
    {
        return $this->query()->find($id);
    }

    public function findOrFail(string $id): Model
    {
        return $this->query()->findOrFail($id);
    }

    public function findBy(string $column, mixed $value): ?Model
    {
        return $this->query()->where($column, $value)->first();
    }

    public function all(): Collection
    {
        return $this->query()->get();
    }

    public function paginate(int $perPage = 20): LengthAwarePaginator
    {
        return $this->query()->latest()->paginate($perPage);
    }

    public function create(array $attributes): Model
    {
        return $this->query()->create($attributes);
    }

    public function update(Model $model, array $attributes): Model
    {
        $model->fill($attributes)->save();

        return $model->refresh();
    }

    public function delete(Model $model): bool
    {
        return (bool) $model->delete();
    }
}
