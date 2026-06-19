<?php

namespace Rafeeq\Modules\AI\Services;

use Rafeeq\Core\Services\BaseService;
use Rafeeq\Infrastructure\Gpt\Contracts\GptClient;
use Rafeeq\Modules\AI\Tools\AssistantToolRegistry;
use Rafeeq\Modules\AI\Models\AiConversation;
use Rafeeq\Modules\AI\Models\AiMessage;
use Rafeeq\Modules\Auth\Models\User;

/**
 * Rafeeq Assistant — an Arabic-first helper that answers students' questions
 * about the platform (subscriptions, door-to-door rides, wallet/CliQ payments,
 * parcels, lost & found, rewards, support).
 *
 * Works with or without an OpenAI key: when AI is unavailable it returns a
 * helpful canned reply guiding the user to the right screen / support.
 */
class AssistantService extends BaseService
{
    private const SYSTEM_PROMPT = <<<'PROMPT'
    أنت "مساعد رفيق"، مساعد ذكي لمنصّة رفيق للنقل والخدمات الطلابية في الأردن.
    أجب بالعربية، بإيجاز ووضوح وبأسلوب ودّي. ساعد الطالب في:
    - الاشتراكات وحجز الرحلات باب-لباب ورحلات Express.
    - المحفظة والدفع عبر CliQ، والنقاط والمكافآت.
    - الطرود والمفقودات والتبادل الطلابي.
    - فتح تذاكر الدعم وتتبّع الرحلات.
    لا تختلق معلومات أو أسعاراً. إن لم تعرف، وجّه الطالب لفتح تذكرة دعم داخل التطبيق.
    PROMPT;

    /** Keep the last N turns as context to bound token usage. */
    private const HISTORY_LIMIT = 12;

    public function __construct(
        private readonly GptClient $gpt,
        private readonly AiUsageService $usage,
        private readonly AssistantToolRegistry $tools,
    ) {}

    public function conversations(User $user)
    {
        return AiConversation::where('user_id', $user->id)->orderByDesc('last_message_at')->get();
    }

    public function history(AiConversation $conversation)
    {
        return $conversation->messages()->where('role', '!=', 'system')->get();
    }

    public function send(User $user, ?AiConversation $conversation, string $message): array
    {
        $conversation ??= AiConversation::create([
            'user_id' => $user->id,
            'title' => mb_substr($message, 0, 40),
            'last_message_at' => now(),
        ]);

        $conversation->messages()->create(['role' => 'user', 'content' => $message]);

        $reply = $this->generate($user, $conversation, $message);
        $tokens = $reply['tokens'] ?? 0;

        $assistantMessage = $conversation->messages()->create([
            'role' => 'assistant',
            'content' => $reply['content'],
            'tokens' => $tokens,
        ]);

        $conversation->forceFill(['last_message_at' => now()])->save();

        return [
            'conversation_id' => $conversation->id,
            'message' => $assistantMessage,
            'ai' => $reply['ai'],
        ];
    }

    /** @return array{content:string, ai:bool, tokens:int} */
    private function generate(User $user, AiConversation $conversation, string $latest): array
    {
        if (! $this->gpt->isEnabled()) {
            return ['content' => $this->fallback($latest), 'ai' => false, 'tokens' => 0];
        }

        // Cost governance: soft monthly per-user token cap.
        if (! $this->usage->withinBudget($user->id)) {
            return ['content' => $this->budgetReached(), 'ai' => false, 'tokens' => 0];
        }

        $messages = [['role' => 'system', 'content' => self::SYSTEM_PROMPT]];

        // Inject a live snapshot of the student's account so answers are accurate
        // (balance, subscription, next trip, points). Never throws.
        $snapshot = $this->accountSnapshot($user);
        if ($snapshot !== '') {
            $messages[] = ['role' => 'system', 'content' => $snapshot];
        }

        foreach ($conversation->messages()->latest()->take(self::HISTORY_LIMIT)->get()->reverse() as $m) {
            /** @var AiMessage $m */
            $messages[] = ['role' => $m->role, 'content' => $m->content];
        }

        // Reuse the answer for an identical context within a short window to
        // avoid paying for duplicate calls (key includes the full prompt).
        $ttl = (int) config('services.openai.reply_cache_ttl', 0);
        $cacheKey = 'ai_reply:'.hash('sha256', json_encode($messages));
        if ($ttl > 0 && ($cached = \Illuminate\Support\Facades\Cache::get($cacheKey)) !== null) {
            return ['content' => $cached, 'ai' => true, 'tokens' => 0];
        }

        try {
            $tools = $this->tools->schemas();
            $totalTokens = 0;
            $usedTool = false;

            // Tool-calling loop: the model may call server-side tools (e.g. open a
            // support ticket, fetch top-up instructions) before giving its final
            // answer. Bounded to avoid runaway loops.
            for ($i = 0; $i < 4; $i++) {
                $result = $this->gpt->chat($messages, [
                    'temperature' => 0.4,
                    'max_tokens' => 600,
                    'tools' => $tools,
                ]);
                $totalTokens += $result->totalTokens();

                if ($result->hasToolCalls() && $i < 3) {
                    $usedTool = true;
                    $messages[] = $this->assistantToolCallMessage($result);
                    foreach ($result->toolCalls as $call) {
                        $output = $this->tools->run($call['name'], $user, $call['arguments']);
                        $messages[] = [
                            'role' => 'tool',
                            'tool_call_id' => $call['id'],
                            'content' => json_encode($output, JSON_UNESCAPED_UNICODE) ?: '{}',
                        ];
                    }

                    continue;
                }

                if ($result->stub || trim($result->content) === '') {
                    return ['content' => $this->fallback($latest), 'ai' => false, 'tokens' => $totalTokens];
                }

                $content = trim($result->content);
                // Don't cache answers produced by side-effecting tools.
                if ($ttl > 0 && ! $usedTool) {
                    \Illuminate\Support\Facades\Cache::put($cacheKey, $content, $ttl);
                }
                $this->usage->forget($user->id);

                return ['content' => $content, 'ai' => true, 'tokens' => $totalTokens];
            }

            return ['content' => $this->fallback($latest), 'ai' => false, 'tokens' => $totalTokens];
        } catch (\Throwable) {
            return ['content' => $this->fallback($latest), 'ai' => false, 'tokens' => 0];
        }
    }

    /**
     * Rebuild the OpenAI assistant message that carries tool calls so it can be
     * appended to the conversation before the tool results.
     *
     * @return array<string, mixed>
     */
    private function assistantToolCallMessage(\Rafeeq\Infrastructure\Gpt\Data\GptResult $result): array
    {
        $calls = [];
        foreach ($result->toolCalls as $call) {
            $calls[] = [
                'id' => $call['id'],
                'type' => 'function',
                'function' => [
                    'name' => $call['name'],
                    'arguments' => json_encode($call['arguments'], JSON_UNESCAPED_UNICODE) ?: '{}',
                ],
            ];
        }

        return ['role' => 'assistant', 'content' => $result->content ?: null, 'tool_calls' => $calls];
    }

    /** Shown when a user exhausts their monthly assistant token budget. */
    private function budgetReached(): string
    {
        return 'وصلت للحد الشهري المتاح لاستخدام المساعد الذكي. يتجدّد تلقائياً مع بداية الشهر القادم. '
            .'بإمكانك خلال هذه الفترة استخدام التطبيق بشكل كامل أو فتح تذكرة دعم لأي استفسار.';
    }

    /**
     * Build a compact, live snapshot of the user's Rafeeq account for the model.
     * Read-only + fully guarded (returns '' on any failure) so it can never
     * break the assistant.
     */
    private function accountSnapshot(User $user): string
    {
        return \Rafeeq\Core\Support\Safely::value(function () use ($user) {
            $lines = [];

            $balance = \Illuminate\Support\Facades\DB::table('wallets')
                ->where('user_id', $user->id)->value('balance_fils');
            if ($balance !== null) {
                $lines[] = 'رصيد المحفظة: '.number_format($balance / 1000, 2).' د.أ';
            }

            $points = \Illuminate\Support\Facades\DB::table('reward_accounts')
                ->where('user_id', $user->id)->value('points');
            if ($points !== null) {
                $lines[] = "نقاط المكافآت: {$points}";
            }

            $sub = \Illuminate\Support\Facades\DB::table('subscriptions')
                ->join('subscription_plans', 'subscription_plans.id', '=', 'subscriptions.plan_id')
                ->where('subscriptions.student_id', $user->id)
                ->where('subscriptions.status', 'active')
                ->select('subscription_plans.name', 'subscriptions.remaining_rides', 'subscriptions.ends_at')
                ->first();
            if ($sub) {
                $rides = $sub->remaining_rides === null ? 'غير محدود' : $sub->remaining_rides;
                $lines[] = "اشتراك فعّال: {$sub->name} (رحلات متبقية: {$rides})";
            } else {
                $lines[] = 'لا يوجد اشتراك فعّال حالياً.';
            }

            $nextTrip = \Illuminate\Support\Facades\DB::table('trip_passengers')
                ->join('trips', 'trips.id', '=', 'trip_passengers.trip_id')
                ->where('trip_passengers.student_id', $user->id)
                ->whereIn('trips.status', ['scheduled', 'pending', 'started'])
                ->where('trips.scheduled_at', '>=', now())
                ->orderBy('trips.scheduled_at')
                ->value('trips.scheduled_at');
            if ($nextTrip) {
                $lines[] = 'الرحلة القادمة: '.\Illuminate\Support\Carbon::parse($nextTrip)->format('Y-m-d H:i');
            }

            if (empty($lines)) {
                return '';
            }

            return "بيانات حساب الطالب الحالية (استخدمها للإجابة بدقة، ولا تخترع غيرها):\n- ".implode("\n- ", $lines);
        }, default: '', context: 'assistant.snapshot');
    }

    /** Helpful response when AI is not configured/available. */
    private function fallback(string $message): string
    {
        return 'مساعد رفيق الذكي غير مفعّل حالياً. بإمكانك من القائمة الرئيسية: '
            .'طلب رحلة باب-لباب، إدارة الاشتراكات، شحن المحفظة عبر CliQ، إرسال طرد، أو فتح تذكرة دعم. '
            .'لأي استفسار عاجل افتح تذكرة من قسم «الدعم» وسيردّ عليك فريقنا.';
    }
}
