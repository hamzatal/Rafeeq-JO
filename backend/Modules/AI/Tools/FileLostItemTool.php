<?php

namespace Rafeeq\Modules\AI\Tools;

use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\LostFound\Services\LostFoundService;

/**
 * Lets the assistant file a lost-or-found report on the student's behalf, then
 * surfaces how many candidate matches already exist in the opposite pool.
 */
class FileLostItemTool implements AssistantTool
{
    public function __construct(private readonly LostFoundService $lostFound) {}

    public function name(): string
    {
        return 'report_lost_item';
    }

    public function description(): string
    {
        return 'سجّل بلاغ مفقودات (فقدتُ شيئاً) أو موجودات (وجدتُ شيئاً) للطالب. '
            .'استخدمها فقط بعد معرفة نوع البلاغ واسم العنصر بوضوح.';
    }

    public function parameters(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'type' => ['type' => 'string', 'enum' => ['lost', 'found'], 'description' => 'lost إذا فقد الطالب شيئاً، found إذا وجد شيئاً'],
                'title' => ['type' => 'string', 'description' => 'اسم/وصف مختصر للعنصر (مثال: حقيبة ظهر سوداء)'],
                'description' => ['type' => 'string', 'description' => 'تفاصيل إضافية (لون، علامات مميزة، محتويات)'],
                'location' => ['type' => 'string', 'description' => 'الموقع التقريبي أو الرحلة'],
            ],
            'required' => ['type', 'title'],
        ];
    }

    public function run(User $user, array $args): array
    {
        $type = (string) ($args['type'] ?? '');
        $title = trim((string) ($args['title'] ?? ''));

        if (! in_array($type, ['lost', 'found'], true)) {
            return ['ok' => false, 'error' => "type must be 'lost' or 'found'"];
        }
        if ($title === '') {
            return ['ok' => false, 'error' => 'title is required'];
        }

        $item = $this->lostFound->report($user, [
            'type' => $type,
            'title' => $title,
            'description' => isset($args['description']) ? trim((string) $args['description']) : null,
            'location' => isset($args['location']) ? trim((string) $args['location']) : null,
        ]);

        $matches = $this->lostFound->candidates($item)->count();

        return [
            'ok' => true,
            'report_id' => $item->id,
            'status' => $item->status,
            'candidate_matches' => $matches,
            'message' => $type === 'lost'
                ? "تم تسجيل بلاغ فقدان «{$title}». عدد التطابقات المحتملة الآن: {$matches}. سننبّهك فور العثور على تطابق."
                : "تم تسجيل بلاغ عثور على «{$title}». شكراً لك! عدد البلاغات المطابقة المحتملة: {$matches}.",
        ];
    }
}
