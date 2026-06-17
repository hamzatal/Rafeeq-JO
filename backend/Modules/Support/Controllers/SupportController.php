<?php

namespace Rafeeq\Modules\Support\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Exceptions\AuthorizationException;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Support\Models\SupportTicket;
use Rafeeq\Modules\Support\Requests\OpenTicketRequest;
use Rafeeq\Modules\Support\Requests\ReplyTicketRequest;
use Rafeeq\Modules\Support\Resources\SupportTicketResource;
use Rafeeq\Modules\Support\Services\TicketService;
use Rafeeq\Shared\Enums\TicketCategory;
use Rafeeq\Shared\Enums\TicketStatus;

class SupportController extends Controller
{
    public function __construct(private readonly TicketService $tickets) {}

    // ── User ────────────────────────────────────────────────────────────
    public function mine(Request $request): JsonResponse
    {
        $items = SupportTicket::where('user_id', $request->user()->id)
            ->latest('last_reply_at')
            ->paginate((int) $request->query('per_page', 20));

        return $this->ok(SupportTicketResource::collection($items));
    }

    public function open(OpenTicketRequest $request): JsonResponse
    {
        $ticket = $this->tickets->open(
            $request->user(),
            TicketCategory::from($request->validated('category')),
            $request->validated('subject'),
            $request->validated('body'),
        );

        return $this->created(new SupportTicketResource($ticket), 'تم فتح التذكرة.');
    }

    public function show(Request $request, SupportTicket $ticket): JsonResponse
    {
        $this->assertAccess($request, $ticket);

        return $this->ok(new SupportTicketResource($ticket->load(['messages', 'user'])));
    }

    public function reply(ReplyTicketRequest $request, SupportTicket $ticket): JsonResponse
    {
        $isStaff = $this->isStaff($request);
        if (! $isStaff && $ticket->user_id !== $request->user()->id) {
            throw new AuthorizationException('هذه التذكرة لا تخصّك.');
        }

        $this->tickets->reply($ticket, $request->user(), $request->validated('body'), $isStaff);

        return $this->ok(new SupportTicketResource($ticket->fresh(['messages', 'user'])), 'تم إرسال الرد.');
    }

    // ── Staff / admin ───────────────────────────────────────────────────
    public function index(Request $request): JsonResponse
    {
        $query = SupportTicket::with('user')->latest('last_reply_at');
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($level = $request->query('level')) {
            $query->where('level', (int) $level);
        }

        return $this->ok(SupportTicketResource::collection($query->paginate((int) $request->query('per_page', 30))));
    }

    public function escalate(Request $request, SupportTicket $ticket): JsonResponse
    {
        $assignTo = $request->input('assign_to');

        return $this->ok(new SupportTicketResource($this->tickets->escalate($ticket, $request->user(), $assignTo)), 'تم التصعيد.');
    }

    public function setStatus(Request $request, SupportTicket $ticket): JsonResponse
    {
        $data = $request->validate(['status' => ['required', 'in:'.implode(',', TicketStatus::values())]]);

        return $this->ok(
            new SupportTicketResource($this->tickets->setStatus($ticket, $request->user(), TicketStatus::from($data['status']))),
            'تم تحديث الحالة.',
        );
    }

    private function isStaff(Request $request): bool
    {
        return $request->user()->hasAnyRole(['support', 'supervisor', 'admin']);
    }

    private function assertAccess(Request $request, SupportTicket $ticket): void
    {
        if (! $this->isStaff($request) && $ticket->user_id !== $request->user()->id) {
            throw new AuthorizationException('هذه التذكرة لا تخصّك.');
        }
    }
}
