<?php

namespace Rafeeq\Modules\Support\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Notifications\Services\NotificationService;
use Rafeeq\Modules\Support\Models\SupportTicket;
use Rafeeq\Modules\Support\Models\TicketMessage;
use Rafeeq\Shared\Enums\NotificationType;
use Rafeeq\Shared\Enums\TicketCategory;
use Rafeeq\Shared\Enums\TicketPriority;
use Rafeeq\Shared\Enums\TicketStatus;

/**
 * Support tickets with a 4-level escalation ladder:
 *   L1 = Rafeeq AI/self-service, L2 = support agent,
 *   L3 = supervisor, L4 = admin.
 */
class TicketService extends BaseService
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly NotificationService $notifications,
        private readonly TicketTriageService $triage,
    ) {}

    public function open(User $user, TicketCategory $category, string $subject, string $body, TicketPriority $priority = TicketPriority::Normal): SupportTicket
    {
        return $this->transaction(function () use ($user, $category, $subject, $body, $priority) {
            // AI triage of the opening message (best-effort, never blocks).
            $triage = $this->triage->triage($subject, $body);
            $effectivePriority = $this->priorityFromTriage($triage, $priority);

            $ticket = SupportTicket::create([
                'number' => $this->generateNumber(),
                'user_id' => $user->id,
                'category' => $category,
                'subject' => $subject,
                'status' => TicketStatus::Open,
                'priority' => $effectivePriority,
                'level' => 1,
                'ai_triage' => $triage,
                'last_reply_at' => now(),
            ]);

            $ticket->messages()->create([
                'sender_id' => $user->id,
                'body' => $body,
                'is_staff' => false,
            ]);

            $this->audit->log('support.ticket_opened', $user, auditable: $ticket, changes: [
                'ai_urgency' => $triage['urgency'] ?? null,
            ]);

            return $ticket->load('messages');
        });
    }

    /** Bump priority when AI flags the ticket as high/urgent (never lowers it). */
    private function priorityFromTriage(?array $triage, TicketPriority $current): TicketPriority
    {
        $urgency = $triage['urgency'] ?? null;
        $aiPriority = match ($urgency) {
            'urgent' => TicketPriority::Urgent,
            'high' => TicketPriority::High,
            default => $current,
        };

        // Keep whichever is more severe (Low < Normal < High < Urgent).
        $rank = [
            TicketPriority::Low->value => 0,
            TicketPriority::Normal->value => 1,
            TicketPriority::High->value => 2,
            TicketPriority::Urgent->value => 3,
        ];

        return $rank[$aiPriority->value] >= $rank[$current->value] ? $aiPriority : $current;
    }

    /** Add a message. Staff replies move the ticket to "pending" (awaiting user). */
    public function reply(SupportTicket $ticket, User $sender, string $body, bool $isStaff): TicketMessage
    {
        if ($ticket->status->isFinal()) {
            throw new BusinessRuleException('التذكرة مغلقة.', 'TICKET_CLOSED');
        }

        $message = $ticket->messages()->create([
            'sender_id' => $sender->id,
            'body' => $body,
            'is_staff' => $isStaff,
        ]);

        $ticket->forceFill([
            'status' => $isStaff ? TicketStatus::Pending : TicketStatus::Open,
            'last_reply_at' => now(),
        ])->save();

        $this->audit->log('support.ticket_reply', $sender, auditable: $ticket);

        // Notify the ticket owner when a staff member replies.
        if ($isStaff && $ticket->user) {
            $this->notifications->notify(
                $ticket->user,
                NotificationType::General,
                'رد جديد على تذكرتك',
                "تذكرة {$ticket->number}: تم الرد على استفسارك.",
                ['ticket_id' => $ticket->id],
            );
        }

        return $message;
    }

    /** Escalate up to L4. Optionally assign to a staff member. */
    public function escalate(SupportTicket $ticket, User $actor, ?string $assignTo = null): SupportTicket
    {
        if ($ticket->level >= 4) {
            throw new BusinessRuleException('التذكرة في أعلى مستوى تصعيد.', 'MAX_LEVEL');
        }

        $ticket->forceFill([
            'level' => $ticket->level + 1,
            'status' => TicketStatus::Escalated,
            'priority' => $ticket->priority === TicketPriority::Low ? TicketPriority::Normal : TicketPriority::High,
            'assigned_to' => $assignTo ?? $ticket->assigned_to,
        ])->save();

        $this->audit->log('support.ticket_escalated', $actor, auditable: $ticket, changes: ['level' => $ticket->level]);

        return $ticket->fresh();
    }

    public function assign(SupportTicket $ticket, User $actor, string $assignTo): SupportTicket
    {
        $ticket->forceFill(['assigned_to' => $assignTo])->save();
        $this->audit->log('support.ticket_assigned', $actor, auditable: $ticket, changes: ['assigned_to' => $assignTo]);

        return $ticket->fresh();
    }

    public function setStatus(SupportTicket $ticket, User $actor, TicketStatus $status): SupportTicket
    {
        $ticket->forceFill(['status' => $status])->save();
        $this->audit->log('support.ticket_'.$status->value, $actor, auditable: $ticket);

        if ($status === TicketStatus::Resolved && $ticket->user) {
            $this->notifications->notify(
                $ticket->user,
                NotificationType::General,
                'تم حل تذكرتك',
                "تذكرة {$ticket->number}: تم حل استفسارك. نتمنى أن نكون أفدناك.",
                ['ticket_id' => $ticket->id],
            );
        }

        return $ticket->fresh();
    }

    private function generateNumber(): string
    {
        $year = now()->format('Y');

        return DB::transaction(function () use ($year) {
            $prefix = "TKT-{$year}-";
            $last = SupportTicket::where('number', 'like', $prefix.'%')
                ->lockForUpdate()
                ->orderByDesc('number')
                ->value('number');
            $seq = $last ? ((int) Str::afterLast($last, '-')) + 1 : 1;

            return $prefix.str_pad((string) $seq, 5, '0', STR_PAD_LEFT);
        });
    }
}
