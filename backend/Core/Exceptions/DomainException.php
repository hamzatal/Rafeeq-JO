<?php

namespace Rafeeq\Core\Exceptions;

use RuntimeException;
use Throwable;

/**
 * Base for all business/domain exceptions. Carries an HTTP status,
 * a machine-readable error code, and optional field errors.
 */
class DomainException extends RuntimeException
{
    public function __construct(
        string $message,
        protected int $status = 422,
        protected ?string $errorCode = null,
        protected array $errors = [],
        ?Throwable $previous = null,
    ) {
        parent::__construct($message, 0, $previous);
    }

    public function getStatus(): int
    {
        return $this->status;
    }

    public function getErrorCode(): ?string
    {
        return $this->errorCode;
    }

    public function getErrors(): array
    {
        return $this->errors;
    }
}
