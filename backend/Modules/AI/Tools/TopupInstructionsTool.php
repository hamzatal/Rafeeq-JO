<?php

namespace Rafeeq\Modules\AI\Tools;

use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Settings\Services\SettingService;

/**
 * Returns the current CliQ top-up instructions so the assistant can guide a
 * student through charging their wallet (alias, beneficiary, reference rules).
 */
class TopupInstructionsTool implements AssistantTool
{
    public function __construct(private readonly SettingService $settings) {}

    public function name(): string
    {
        return 'get_topup_instructions';
    }

    public function description(): string
    {
        return 'أعطِ تعليمات شحن المحفظة عبر حوالة CliQ (الاسم المستعار، المستفيد، البنك، وقواعد الرقم المرجعي).';
    }

    public function parameters(): array
    {
        return ['type' => 'object', 'properties' => (object) [], 'required' => []];
    }

    public function run(User $user, array $args): array
    {
        $cliq = $this->settings->cliq();

        return [
            'ok' => true,
            'method' => 'CliQ',
            'alias' => $cliq['alias'],
            'beneficiary_name' => $cliq['beneficiary_name'],
            'bank_name' => $cliq['bank_name'],
            'notes' => 'حوّل المبلغ عبر CliQ للاسم المستعار أعلاه، ثم ارفع صورة الإشعار في شاشة المدفوعات. '
                .'تأكّد أن اسم المُرسِل يطابق اسم حسابك ليتم التحقق تلقائياً.',
        ];
    }
}
