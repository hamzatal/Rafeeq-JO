<?php

namespace Rafeeq\Modules\AI\Tools;

use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\LostFound\Models\LostFoundItem;

/**
 * Read-only tool: the student's own lost-&-found reports and their current
 * status (open / matched / resolved) so the assistant can follow up on a
 * previously filed report.
 */
class MyLostReportsTool implements AssistantTool
{
    public function name(): string
    {
        return 'list_my_lost_reports';
    }

    public function description(): string
    {
        return 'اعرض بلاغات المفقودات/الموجودات الخاصة بالطالب وحالتها الحالية (مفتوح/تطابق محتمل/محلول). '
            .'استخدمها عند سؤال الطالب عن بلاغاته السابقة.';
    }

    public function parameters(): array
    {
        return ['type' => 'object', 'properties' => (object) [], 'required' => []];
    }

    public function run(User $user, array $args): array
    {
        $items = LostFoundItem::query()
            ->where('reporter_id', $user->id)
            ->latest()
            ->limit(10)
            ->get();

        return [
            'ok' => true,
            'count' => $items->count(),
            'reports' => $items->map(fn (LostFoundItem $it) => [
                'title' => $it->title,
                'type' => $it->type,
                'status' => $it->status,
                'reported_at' => $it->created_at?->toDateString(),
            ])->all(),
        ];
    }
}
