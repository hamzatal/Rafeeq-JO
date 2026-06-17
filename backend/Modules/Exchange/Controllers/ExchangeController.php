<?php

namespace Rafeeq\Modules\Exchange\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Exceptions\AuthorizationException;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Exchange\Models\ExchangeItem;

class ExchangeController extends Controller
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function index(Request $request): JsonResponse
    {
        $query = ExchangeItem::where('status', 'available')->latest();
        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        return $this->ok($query->paginate((int) $request->query('per_page', 20)));
    }

    public function mine(Request $request): JsonResponse
    {
        return $this->ok(
            ExchangeItem::where('owner_id', $request->user()->id)->latest()
                ->paginate((int) $request->query('per_page', 20))
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', 'in:book,notes,tool,other'],
            'title' => ['required', 'string', 'max:120'],
            'condition' => ['nullable', 'in:new,good,fair'],
            'description' => ['nullable', 'string', 'max:1000'],
            'price_fils' => ['nullable', 'integer', 'min:0'],
        ]);
        $data['owner_id'] = $request->user()->id;
        $data['condition'] = $data['condition'] ?? 'good';

        $item = ExchangeItem::create($data);
        $this->audit->log('exchange.listed', $request->user(), auditable: $item);

        return $this->created($item, 'تم نشر العنصر.');
    }

    public function reserve(Request $request, ExchangeItem $item): JsonResponse
    {
        if ($item->status !== 'available') {
            throw new BusinessRuleException('العنصر غير متاح.', 'NOT_AVAILABLE');
        }
        if ($item->owner_id === $request->user()->id) {
            throw new BusinessRuleException('لا يمكنك حجز عنصرك.', 'OWN_ITEM');
        }

        $item->forceFill(['status' => 'reserved', 'reserved_by' => $request->user()->id])->save();
        $this->audit->log('exchange.reserved', $request->user(), auditable: $item);

        return $this->ok($item->fresh(), 'تم حجز العنصر. تواصل مع المالك لإتمام التبادل.');
    }

    public function close(Request $request, ExchangeItem $item): JsonResponse
    {
        if ($item->owner_id !== $request->user()->id) {
            throw new AuthorizationException('هذا العنصر لا يخصّك.');
        }
        $item->forceFill(['status' => 'closed'])->save();

        return $this->ok($item->fresh(), 'تم إغلاق العنصر.');
    }
}
