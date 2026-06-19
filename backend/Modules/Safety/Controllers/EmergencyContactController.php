<?php

namespace Rafeeq\Modules\Safety\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Safety\Models\EmergencyContact;
use Rafeeq\Modules\Safety\Services\EmergencyContactService;
use Symfony\Component\HttpFoundation\Response;

class EmergencyContactController extends Controller
{
    public function __construct(private readonly EmergencyContactService $service) {}

    public function index(Request $request): JsonResponse
    {
        $list = $this->service->list($request->user());

        return $this->ok($list->map(fn (EmergencyContact $c) => $this->present($c)));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:120'],
            'phone' => ['required', 'string', 'max:20'],
            'relation' => ['nullable', Rule::in(['parent', 'sibling', 'spouse', 'relative', 'friend', 'other'])],
            'is_primary' => ['nullable', 'boolean'],
            'notify_on_sos' => ['nullable', 'boolean'],
        ]);

        $contact = $this->service->create($request->user(), $data);

        return $this->created($this->present($contact), 'تمت إضافة جهة اتصال الطوارئ.');
    }

    public function update(Request $request, EmergencyContact $contact): JsonResponse
    {
        $this->authorizeOwner($request, $contact);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'min:2', 'max:120'],
            'phone' => ['sometimes', 'string', 'max:20'],
            'relation' => ['nullable', Rule::in(['parent', 'sibling', 'spouse', 'relative', 'friend', 'other'])],
            'is_primary' => ['nullable', 'boolean'],
            'notify_on_sos' => ['nullable', 'boolean'],
        ]);

        $contact = $this->service->update($request->user(), $contact, $data);

        return $this->ok($this->present($contact), 'تم تحديث جهة الاتصال.');
    }

    public function destroy(Request $request, EmergencyContact $contact): JsonResponse
    {
        $this->authorizeOwner($request, $contact);
        $this->service->delete($request->user(), $contact);

        return $this->ok(null, 'تم حذف جهة الاتصال.');
    }

    private function authorizeOwner(Request $request, EmergencyContact $contact): void
    {
        abort_if($contact->user_id !== $request->user()->id, Response::HTTP_FORBIDDEN, 'غير مصرّح.');
    }

    /** @return array<string, mixed> */
    private function present(EmergencyContact $c): array
    {
        return [
            'id' => $c->id,
            'name' => $c->name,
            'phone' => $c->phone,
            'relation' => $c->relation,
            'is_primary' => $c->is_primary,
            'notify_on_sos' => $c->notify_on_sos,
            'created_at' => $c->created_at?->toIso8601String(),
        ];
    }
}
