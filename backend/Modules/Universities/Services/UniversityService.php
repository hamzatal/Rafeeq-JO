<?php

namespace Rafeeq\Modules\Universities\Services;

use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Modules\Universities\Models\University;

class UniversityService extends BaseService
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function create(array $data): University
    {
        $university = University::create($data);
        $this->audit->log('university.created', auditable: $university);

        return $university;
    }

    public function update(University $university, array $data): University
    {
        $university->fill($data)->save();
        $this->audit->log('university.updated', auditable: $university);

        return $university->fresh();
    }

    public function delete(University $university): void
    {
        $this->audit->log('university.deleted', auditable: $university);
        $university->delete();
    }
}
