<?php

namespace Rafeeq\Core\Exceptions;

/**
 * Thrown when an operation violates a business rule
 * (e.g. driver not approved, OTP expired, subscription inactive).
 */
class BusinessRuleException extends DomainException
{
    public function __construct(string $message, ?string $errorCode = null, array $errors = [])
    {
        parent::__construct($message, status: 422, errorCode: $errorCode, errors: $errors);
    }
}
