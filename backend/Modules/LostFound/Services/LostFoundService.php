<?php

namespace Rafeeq\Modules\LostFound\Services;

use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\LostFound\Models\LostFoundItem;

/**
 * Lost & Found board. Students report lost or found items; the opposite
 * pool is searched for candidate matches (simple keyword/category match now;
 * upgradable to GPT semantic matching in the AI phase).
 */
class LostFoundService extends BaseService
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function report(User $user, array $data): LostFoundItem
    {
        $item = LostFoundItem::create([
            'reporter_id' => $user->id,
            'type' => $data['type'],
            'category' => $data['category'] ?? 'general',
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'location' => $data['location'] ?? null,
            'trip_id' => $data['trip_id'] ?? null,
            'images' => $data['images'] ?? null,
            'status' => 'open',
        ]);

        $this->audit->log('lostfound.reported', $user, auditable: $item);

        return $item;
    }

    /** Candidate matches from the opposite pool (lost ↔ found). */
    public function candidates(LostFoundItem $item, int $limit = 10): \Illuminate\Support\Collection
    {
        $opposite = $item->type === 'lost' ? 'found' : 'lost';
        $terms = preg_split('/\s+/', trim((string) $item->title)) ?: [];

        return LostFoundItem::where('type', $opposite)
            ->where('status', 'open')
            ->where('category', $item->category)
            ->where(function ($q) use ($terms) {
                foreach (array_slice($terms, 0, 5) as $term) {
                    if (mb_strlen($term) >= 2) {
                        $q->orWhere('title', 'like', "%{$term}%")
                          ->orWhere('description', 'like', "%{$term}%");
                    }
                }
            })
            ->latest()
            ->limit($limit)
            ->get();
    }

    public function resolve(LostFoundItem $item, User $actor, ?string $matchedWith = null): LostFoundItem
    {
        if ($item->status === 'resolved') {
            throw new BusinessRuleException('تم إغلاق هذا البلاغ.', 'ALREADY_RESOLVED');
        }

        $item->forceFill([
            'status' => $matchedWith ? 'matched' : 'resolved',
            'matched_with' => $matchedWith,
        ])->save();

        if ($matchedWith) {
            LostFoundItem::whereKey($matchedWith)->update(['status' => 'matched', 'matched_with' => $item->id]);
        }

        $this->audit->log('lostfound.resolved', $actor, auditable: $item);

        return $item->fresh();
    }
}
