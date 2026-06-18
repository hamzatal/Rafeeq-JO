<?php

namespace Rafeeq\Modules\Disputes\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Disputes\Models\Dispute;
use Rafeeq\Modules\Disputes\Services\DisputeService;
use Rafeeq\Shared\Enums\RiskSeverity;

class DisputeAdminController extends Controller
{
    public function __construct(private readonly DisputeService $service) {}

    public function index(Request $request): JsonResponse
    {
        $query = Dispute::query()->with(['subject:id,full_name,phone,type,status', 'assignee:id,full_name'])
            ->latest('created_at');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        $page = $query->paginate((int) $request->query('per_page', 20));

        return $this->ok($page->through(fn (Dispute $d) => $this->transform($d)));
    }

    public function show(Dispute $dispute): JsonResponse
    {
        $dispute->load(['subject:id,full_name,phone,type,status', 'assignee:id,full_name']);

        return $this->ok([
            'dispute' => $this->transform($dispute),
            'evidence' => $this->service->evidenceFor($dispute),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'subject_user_id' => ['required', 'uuid', 'exists:users,id'],
            'type' => ['required', 'string', 'max:40'],
            'severity' => ['required', 'in:'.implode(',', RiskSeverity::values())],
            'summary' => ['nullable', 'string', 'max:1000'],
            'trip_id' => ['nullable', 'uuid'],
        ]);

        $dispute = $this->service->open(
            subjectUserId: $data['subject_user_id'],
            type: $data['type'],
            severity: RiskSeverity::from($data['severity']),
            summary: $data['summary'] ?? null,
            openedBy: $request->user(),
            tripId: $data['trip_id'] ?? null,
        );

        return $this->created($this->transform($dispute), 'تم فتح النزاع.');
    }

    public function investigate(Request $request): JsonResponse
    {
        $data = $request->validate(['user_id' => ['required', 'uuid', 'exists:users,id']]);
        $result = $this->service->investigate($data['user_id'], $request->user());

        return $this->ok([
            'assessment' => $result['assessment'],
            'dispute' => $result['dispute'] ? $this->transform($result['dispute']) : null,
            'frozen' => $result['frozen'],
        ], 'تم تشغيل التحقيق.');
    }

    public function assign(Request $request, Dispute $dispute): JsonResponse
    {
        return $this->ok($this->transform($this->service->assign($dispute, $request->user())), 'تم الإسناد.');
    }

    public function resolve(Request $request, Dispute $dispute): JsonResponse
    {
        $data = $request->validate([
            'resolution' => ['required', 'string', 'max:2000'],
            'action_taken' => ['required', 'in:frozen,warning,cleared,banned,none'],
        ]);

        $dispute = $this->service->resolve($dispute, $request->user(), $data['resolution'], $data['action_taken']);

        return $this->ok($this->transform($dispute), 'تمت معالجة النزاع.');
    }

    public function dismiss(Request $request, Dispute $dispute): JsonResponse
    {
        $data = $request->validate(['reason' => ['nullable', 'string', 'max:1000']]);
        $dispute = $this->service->dismiss($dispute, $request->user(), $data['reason'] ?? null);

        return $this->ok($this->transform($dispute), 'تم رفض النزاع (إيجابية كاذبة).');
    }

    public function freeze(Request $request, Dispute $dispute): JsonResponse
    {
        $changed = $this->service->freezeSubject($dispute->subject_user_id, $request->user(), $dispute);

        return $this->ok(['frozen' => $changed], $changed ? 'تم تجميد الحساب.' : 'الحساب مجمّد/محظور بالفعل.');
    }

    public function unfreeze(Request $request, Dispute $dispute): JsonResponse
    {
        $changed = $this->service->unfreezeSubject($dispute->subject_user_id, $request->user());

        return $this->ok(['unfrozen' => $changed], $changed ? 'تم رفع التجميد.' : 'الحساب غير مجمّد.');
    }

    private function transform(Dispute $d): array
    {
        return [
            'id' => $d->id,
            'subject' => $d->relationLoaded('subject') && $d->subject ? [
                'id' => $d->subject->id,
                'name' => $d->subject->full_name,
                'phone' => $d->subject->phone,
                'type' => $d->subject->type?->value,
                'status' => $d->subject->status?->value,
            ] : ['id' => $d->subject_user_id],
            'trip_id' => $d->trip_id,
            'type' => $d->type,
            'status' => $d->status,
            'severity' => $d->severity->value,
            'severity_label' => $d->severity->labelAr(),
            'risk_score' => $d->risk_score,
            'summary' => $d->summary,
            'assigned_to' => $d->relationLoaded('assignee') && $d->assignee ? $d->assignee->full_name : null,
            'action_taken' => $d->action_taken,
            'resolution' => $d->resolution,
            'resolved_at' => $d->resolved_at?->toIso8601String(),
            'created_at' => $d->created_at?->toIso8601String(),
        ];
    }
}
