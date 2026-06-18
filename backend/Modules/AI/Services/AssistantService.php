<?php

namespace Rafeeq\Modules\AI\Services;

use Rafeeq\Core\Services\BaseService;
use Rafeeq\Infrastructure\Gpt\Contracts\GptClient;
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

    public function __construct(private readonly GptClient $gpt) {}

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

        $reply = $this->generate($conversation, $message);
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
    private function generate(AiConversation $conversation, string $latest): array
    {
        if (! $this->gpt->isEnabled()) {
            return ['content' => $this->fallback($latest), 'ai' => false, 'tokens' => 0];
        }

        $messages = [['role' => 'system', 'content' => self::SYSTEM_PROMPT]];
        foreach ($conversation->messages()->latest()->take(self::HISTORY_LIMIT)->get()->reverse() as $m) {
            /** @var AiMessage $m */
            $messages[] = ['role' => $m->role, 'content' => $m->content];
        }

        try {
            $result = $this->gpt->chat($messages, ['temperature' => 0.4, 'max_tokens' => 600]);
            if ($result->stub || trim($result->content) === '') {
                return ['content' => $this->fallback($latest), 'ai' => false, 'tokens' => 0];
            }

            return ['content' => trim($result->content), 'ai' => true, 'tokens' => $result->totalTokens()];
        } catch (\Throwable) {
            return ['content' => $this->fallback($latest), 'ai' => false, 'tokens' => 0];
        }
    }

    /** Helpful response when AI is not configured/available. */
    private function fallback(string $message): string
    {
        return 'مساعد رفيق الذكي غير مفعّل حالياً. بإمكانك من القائمة الرئيسية: '
            .'طلب رحلة باب-لباب، إدارة الاشتراكات، شحن المحفظة عبر CliQ، إرسال طرد، أو فتح تذكرة دعم. '
            .'لأي استفسار عاجل افتح تذكرة من قسم «الدعم» وسيردّ عليك فريقنا.';
    }
}
