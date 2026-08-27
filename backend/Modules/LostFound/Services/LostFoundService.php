<?php

namespace Rafeeq\Modules\LostFound\Services;

use Illuminate\Support\Collection;
use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Core\Support\Safely;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\LostFound\Models\LostFoundItem;
use Rafeeq\Modules\Notifications\Services\NotificationService;
use Rafeeq\Shared\Enums\NotificationType;

/**
 * Lost & Found board. Students report lost or found items; the opposite
 * pool is searched for candidate matches (simple keyword/category match now;
 * upgradable to GPT semantic matching in the AI phase).
 */
class LostFoundService extends BaseService
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly NotificationService $notifications,
    ) {}

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
    public function candidates(LostFoundItem $item, int $limit = 10): Collection
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

    /**
     * Close a report, optionally linking it to its counterpart.
     *
     * ── What was wrong here ────────────────────────────────────────────────────
     *
     * `$matchedWith` arrived unvalidated from the request and went straight into
     * `LostFoundItem::whereKey($matchedWith)->update([...])`. Any authenticated user
     * could therefore reach into ANY other user's row and flip it to `matched`.
     * The two writes also ran outside a transaction, so a failure between them left
     * a half-linked pair that nothing would ever detect.
     *
     * Three things fix it, and all three are needed:
     *
     *  1. The counterpart must be a genuine candidate — opposite type, same
     *     category, still open. Existence alone is not enough: a valid uuid that
     *     is somebody's unrelated closed report is exactly the abuse.
     *  2. Both writes are one transaction, and the counterpart update is
     *     CONDITIONAL on it still being open — so two people racing to claim the
     *     same found item cannot both win.
     *  3. The counterpart's owner is notified and the link is audited against
     *     BOTH rows. A match is a claim about someone else's property; it should
     *     never be something that happens to them silently.
     */
    public function resolve(LostFoundItem $item, User $actor, ?string $matchedWith = null): LostFoundItem
    {
        if (in_array($item->status, ['resolved', 'matched'], true)) {
            throw new BusinessRuleException('تم إغلاق هذا البلاغ.', 'ALREADY_RESOLVED');
        }

        return $this->transaction(function () use ($item, $actor, $matchedWith) {
            $counterpart = $matchedWith === null ? null : $this->assertMatchable($item, $matchedWith);

            $item->forceFill([
                'status' => $counterpart ? 'matched' : 'resolved',
                'matched_with' => $counterpart?->id,
            ])->save();

            if ($counterpart) {
                // Conditional on still being open — the guard against a race where
                // two reporters claim the same counterpart at once.
                $claimed = LostFoundItem::whereKey($counterpart->id)
                    ->where('status', 'open')
                    ->update(['status' => 'matched', 'matched_with' => $item->id]);

                if ($claimed === 0) {
                    throw new BusinessRuleException('تم ربط هذا البلاغ بغيره قبل قليل.', 'MATCH_TAKEN');
                }

                $this->audit->log('lostfound.matched', $actor, auditable: $counterpart, changes: [
                    'matched_with' => $item->id,
                    'by_reporter' => $actor->id,
                ]);

                $this->notifyCounterpart($counterpart, $item);
            }

            $this->audit->log('lostfound.resolved', $actor, auditable: $item);

            return $item->fresh();
        });
    }

    /**
     * The counterpart must actually be the other half of this report.
     *
     * Locked while checked, so its status cannot change between the check and the
     * conditional update above.
     */
    private function assertMatchable(LostFoundItem $item, string $matchedWith): LostFoundItem
    {
        if ($matchedWith === $item->id) {
            throw new BusinessRuleException('لا يمكن ربط البلاغ بنفسه.', 'SELF_MATCH');
        }

        $counterpart = LostFoundItem::whereKey($matchedWith)->lockForUpdate()->first();

        if ($counterpart === null || $counterpart->status !== 'open') {
            throw new BusinessRuleException('البلاغ المقابل غير متاح للربط.', 'MATCH_UNAVAILABLE');
        }

        // A lost item matches a found one, never another lost one.
        if ($counterpart->type === $item->type) {
            throw new BusinessRuleException('لا يمكن ربط بلاغَين من النوع نفسه.', 'MATCH_SAME_TYPE');
        }

        if ($counterpart->category !== $item->category) {
            throw new BusinessRuleException('البلاغان من فئتين مختلفتين.', 'MATCH_CATEGORY_MISMATCH');
        }

        return $counterpart;
    }

    /**
     * Tell the other reporter their report was linked.
     *
     * Best-effort: a notification failure must not roll back a completed match. But
     * it is attempted, because the alternative is that someone else closes your
     * report and you find out by noticing it is gone.
     */
    private function notifyCounterpart(LostFoundItem $counterpart, LostFoundItem $item): void
    {
        $owner = $counterpart->reporter;

        // The reporter FK is nullable in principle (an erased account), and a
        // notification to nobody is not worth an exception inside a completed match.
        if (! $owner instanceof User) {
            return;
        }

        Safely::run(fn () => $this->notifications->notify(
            $owner,
            NotificationType::General,
            'تم ربط بلاغك بمفقود مطابق',
            'بلاغك «'.mb_substr((string) $counterpart->title, 0, 40).'» رُبط ببلاغ مقابل. افتح المفقودات للمراجعة.',
            ['lost_found_id' => $counterpart->id, 'matched_with' => $item->id],
        ), context: 'lostfound.notify_counterpart');
    }
}
