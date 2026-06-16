<?php

namespace Rafeeq\Core\Exceptions;

class AuthorizationException extends DomainException
{
    public function __construct(string $message = 'غير مصرّح لك بهذا الإجراء.')
    {
        parent::__construct($message, status: 403, errorCode: 'FORBIDDEN');
    }
}
