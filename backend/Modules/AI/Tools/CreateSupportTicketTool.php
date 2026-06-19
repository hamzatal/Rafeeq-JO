<?php

namespace Rafeeq\Modules\AI\Tools;

use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Support\Services\TicketService;
use Rafeeq\Shared\Enums\TicketCategory;

/**
 * Lets the assistant open a support ticket directly from the conversation.
 */
class CreateSupportTicketTool implements AssistantTool
{
    public function __construct(private readonly TicketService $tickets) {}

    public function name(): string
    {
        return 'create_support_ticket';
    }

    public function description(): string
    {
        return 'افتح تذكرة دعم للمستخدم عندما يبلّغ عن مشكلة أو يطلب مساعدة بشرية. '
            .'استخدمها فقط بعد فهم المشكلة بوضوح.';
    }

    public function parameters(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'subject' => ['type' => 'string', 'description' => 'عنوان مختصر للمشكلة'],
                'message' => ['type' => 'string', 'description' => 'تفاصيل المشكلة كما يصفها المستخدم'],
                'category' => [
                    'type' => 'string',
                    'enum' => TicketCategory::values(),
                    'description' => 'فئة التذكرة الأنسب',
                ],
            ],
            'required' => ['subject', 'message'],
        ];
    }

    public function run(User $user, array $args): array
    {
        $subject = trim((string) ($args['subject'] ?? ''));
        $message = trim((string) ($args['message'] ?? ''));
        if ($subject === '' || $message === '') {
            return ['ok' => false, 'error' => 'subject and message are required'];
        }

        $category = TicketCategory::tryFrom((string) ($args['category'] ?? 'other')) ?? TicketCategory::Other;

        $ticket = $this->tickets->open($user, $category, $subject, $message);

        return [
            'ok' => true,
            'ticket_number' => $ticket->number,
            'status' => $ticket->status->value,
            'message' => "تم فتح تذكرة الدعم رقم {$ticket->number}. سيتواصل معك فريق الدعم قريباً.",
        ];
    }
}
