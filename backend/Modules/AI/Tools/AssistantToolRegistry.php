<?php

namespace Rafeeq\Modules\AI\Tools;

use Rafeeq\Modules\Auth\Models\User;

/**
 * Registry of assistant tools. Builds the OpenAI "tools" schema and
 * dispatches tool calls to the matching handler, scoped to the user.
 */
class AssistantToolRegistry
{
    /** @var array<string, AssistantTool> */
    private array $tools = [];

    public function __construct(
        TopupInstructionsTool $topup,
        CreateSupportTicketTool $ticket,
        SubscriptionPlansTool $plans,
        FileLostItemTool $lostItem,
    ) {
        foreach ([$topup, $ticket, $plans, $lostItem] as $tool) {
            $this->tools[$tool->name()] = $tool;
        }
    }

    /**
     * OpenAI tools schema array.
     *
     * @return array<int, array<string, mixed>>
     */
    public function schemas(): array
    {
        $out = [];
        foreach ($this->tools as $tool) {
            $out[] = [
                'type' => 'function',
                'function' => [
                    'name' => $tool->name(),
                    'description' => $tool->description(),
                    'parameters' => $tool->parameters(),
                ],
            ];
        }

        return $out;
    }

    public function has(string $name): bool
    {
        return isset($this->tools[$name]);
    }

    /**
     * @param  array<string, mixed>  $args
     * @return array<string, mixed>
     */
    public function run(string $name, User $user, array $args): array
    {
        if (! $this->has($name)) {
            return ['ok' => false, 'error' => "unknown tool: {$name}"];
        }

        try {
            return $this->tools[$name]->run($user, $args);
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => 'tool execution failed'];
        }
    }
}
