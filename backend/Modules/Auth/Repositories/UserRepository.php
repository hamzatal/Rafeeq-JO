<?php

namespace Rafeeq\Modules\Auth\Repositories;

use Illuminate\Database\Eloquent\Model;
use Rafeeq\Core\Repositories\BaseRepository;
use Rafeeq\Modules\Auth\Models\User;

/**
 * @method User findOrFail(string $id)
 */
class UserRepository extends BaseRepository
{
    protected function model(): Model
    {
        return new User;
    }

    public function findByPhone(string $phone): ?User
    {
        return $this->query()->where('phone', $phone)->first();
    }

    public function findByEmail(string $email): ?User
    {
        return $this->query()->where('email', $email)->first();
    }

    public function phoneExists(string $phone): bool
    {
        return $this->query()->where('phone', $phone)->exists();
    }
}
