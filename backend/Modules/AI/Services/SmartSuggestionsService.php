<?php

namespace Rafeeq\Modules\AI\Services;

use Carbon\Carbon;
use Carbon\CarbonInterface;
use Rafeeq\Core\Support\Safely;
use Rafeeq\Infrastructure\Gpt\Contracts\GptClient;
use Rafeeq\Modules\Addresses\Models\SavedAddress;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Students\Models\StudentProfile;
use Rafeeq\Modules\Universities\Models\University;

/**
 * Context-aware ride suggestions for the student home screen.
 *
 * The suggestion set is deterministic (built from saved addresses, the
 * student's university, and the time of day) so it is fast and testable; a
 * short, friendly headline is optionally personalised by GPT and falls back to
 * a time-based Arabic greeting when AI is unavailable. Fully guarded.
 */
class SmartSuggestionsService
{
    public function __construct(private readonly GptClient $gpt) {}

    /**
     * @return array{headline:string, suggestions:list<array<string,mixed>>}
     */
    public function for(User $user, ?CarbonInterface $now = null): array
    {
        $now = $now ? Carbon::instance($now) : Carbon::now();
        $hour = (int) $now->format('G');
        $isMorning = $hour >= 5 && $hour < 12;

        $home = SavedAddress::where('user_id', $user->id)->where('label', 'home')->first();
        $uniAddr = SavedAddress::where('user_id', $user->id)->where('label', 'university')->first();

        $profile = StudentProfile::where('user_id', $user->id)->first();
        $university = $profile?->university_id ? University::find($profile->university_id) : null;

        $uniPoint = $this->point($uniAddr)
            ?? ($university && $university->lat !== null
                ? ['lat' => (float) $university->lat, 'lng' => (float) $university->lng, 'title' => $university->name_ar]
                : null);
        $homePoint = $this->point($home);

        $toUni = $uniPoint ? [
            'id' => 'to_university', 'kind' => 'to_university', 'icon' => 'book-open',
            'title' => 'الذهاب إلى الجامعة', 'subtitle' => $uniPoint['title'], 'destination' => $uniPoint,
        ] : null;

        $toHome = $homePoint ? [
            'id' => 'to_home', 'kind' => 'to_home', 'icon' => 'home',
            'title' => 'العودة إلى البيت', 'subtitle' => $homePoint['title'], 'destination' => $homePoint,
        ] : null;

        // Order by daypart: mornings lean toward campus, later toward home.
        $ordered = $isMorning ? [$toUni, $toHome] : [$toHome, $toUni];

        $suggestions = [];
        foreach ($ordered as $s) {
            if ($s !== null) {
                $suggestions[] = $s;
            }
        }
        // Always offer a generic "new ride" entry point.
        $suggestions[] = [
            'id' => 'new', 'kind' => 'new', 'icon' => 'search',
            'title' => 'طلب رحلة جديدة', 'subtitle' => 'حدّد وجهتك', 'destination' => null,
        ];

        return [
            'headline' => $this->headline($user, $isMorning),
            'suggestions' => $suggestions,
        ];
    }

    /** @return array{lat:float, lng:float, title:string}|null */
    private function point(?SavedAddress $a): ?array
    {
        if (! $a || $a->lat === null || $a->lng === null) {
            return null;
        }

        return ['lat' => (float) $a->lat, 'lng' => (float) $a->lng, 'title' => $a->title ?: $a->address_text];
    }

    /** Friendly one-liner: GPT-personalised when available, deterministic otherwise. */
    private function headline(User $user, bool $isMorning): string
    {
        $first = trim(explode(' ', trim((string) $user->full_name))[0]);
        $suffix = $first !== '' ? "، {$first}" : '';
        $base = $isMorning ? "صباح الخير{$suffix} 👋 جاهز للجامعة؟" : "مساء الخير{$suffix} 👋 رجعة للبيت؟";

        if (! $this->gpt->isEnabled()) {
            return $base;
        }

        return Safely::value(function () use ($first, $isMorning, $base) {
            $result = $this->gpt->chat([
                ['role' => 'system', 'content' => 'أنت مساعد رفيق. اكتب سطراً ودّياً قصيراً جداً (أقل من ١٠ كلمات) يشجّع الطالب على حجز رحلته الآن. بالعربية فقط.'],
                ['role' => 'user', 'content' => ($isMorning ? 'الوقت صباحاً' : 'الوقت مساءً').($first !== '' ? "، اسم الطالب: {$first}" : '')],
            ], ['temperature' => 0.7, 'max_tokens' => 40]);

            $line = trim($result->content);

            return ($result->stub || $line === '') ? $base : $line;
        }, default: $base, context: 'ai.suggestions.headline');
    }
}
