<?php

namespace Rafeeq\Modules\AI\Tools;

use Rafeeq\Modules\Auth\Models\User;

/**
 * A capability the AI assistant can invoke on the user's behalf
 * (OpenAI function/tool calling). Tools run server-side, scoped to the
 * authenticated user, so the assistant can *do* things — not just chat.
 */
interface AssistantTool
{
    /** Unique tool name (snake_case), exposed to the model. */
    public function name(): string;

    /** Short description the model uses to decide when to call it. */
    public function description(): string;

    /**
     * JSON-schema for the tool arguments (OpenAI "parameters" object).
     *
     * @return array<string, mixed>
     */
    public function parameters(): array;

    /**
     * Execute the tool for the given user. MUST be safe and idempotent
     * where possible, and never throw — return an error array instead.
     *
     * @param  array<string, mixed>  $args
     * @return array<string, mixed>
     */
    public function run(User $user, array $args): array;
}
