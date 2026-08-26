<?php

namespace Rafeeq\Core\Retention;

/**
 * Every retention commitment in one place.
 *
 * Why this exists rather than a period hard-coded in each prune command: the privacy
 * notice promises specific durations, and four of the six promised were never
 * implemented. A commitment that lives only in a Markdown file and in a `->subDays(30)`
 * somewhere is a commitment nobody can verify. Here it is a single table that the
 * commands read, the tests assert against, and `rafeeq:retention-report` prints — so
 * drift between the document and the behaviour becomes visible instead of silent.
 *
 * Each entry says WHAT is pruned, AFTER HOW LONG, and WHY that number and not another.
 * The "why" matters most: a retention period without a justification is a number
 * someone will quietly raise the first time it inconveniences them.
 */
final class RetentionPolicy
{
    /**
     * @return array<string, array{days:int, table:string, column:string, reason:string, command:string}>
     */
    public static function all(): array
    {
        return [
            'otp_codes' => [
                'days' => 1,
                'table' => 'otp_codes',
                'column' => 'created_at',
                'command' => 'rafeeq:prune-otps',
                'reason' => 'A login code is useful for minutes. Keeping it for a day is already '
                    .'generous, and keeping it longer only creates something worth stealing. '
                    .'The privacy notice previously claimed 12 months, which was both wrong '
                    .'and worse than the truth.',
            ],
            'trip_tracking' => [
                'days' => 30,
                'table' => 'trip_tracking',
                'column' => 'recorded_at',
                'command' => 'rafeeq:prune-retention',
                'reason' => 'The GPS trail of a completed trip is evidence in a dispute, and the '
                    .'dispute window is 30 days. After that it is a movement history with no '
                    .'purpose, which is exactly the kind of data that should not exist.',
            ],
            'driver_locations' => [
                'days' => 7,
                'table' => 'driver_locations',
                'column' => 'recorded_at',
                'command' => 'rafeeq:prune-retention',
                'reason' => 'This is a worker\'s location OUTSIDE any trip — collected for the '
                    .'ghost-trip watch. It had no pruning at all, so the table was an '
                    .'indefinite movement log of every captain. Seven days covers the fraud '
                    .'review window and nothing beyond it.',
            ],
            'chat_messages' => [
                'days' => 30,
                'table' => 'chat_messages',
                'column' => 'created_at',
                'command' => 'rafeeq:prune-retention',
                'reason' => 'In-trip chat is operational context for a dispute, on the same '
                    .'window as the tracking it accompanies.',
            ],
            'ai_messages' => [
                'days' => 30,
                'table' => 'ai_messages',
                'column' => 'created_at',
                'command' => 'rafeeq:prune-retention',
                'reason' => 'Assistant transcripts are a convenience, not a record. They carry '
                    .'whatever the user typed, so the shortest defensible window applies.',
            ],
            'rafeeq_notifications' => [
                'days' => 60,
                'table' => 'rafeeq_notifications',
                'column' => 'created_at',
                'command' => 'rafeeq:prune-retention',
                'reason' => 'A notification the user has not opened in two months will not be '
                    .'opened. Read ones are pruned sooner by the command.',
            ],
            'support_tickets' => [
                'days' => 365,
                'table' => 'support_tickets',
                'column' => 'created_at',
                'command' => 'rafeeq:prune-retention',
                'reason' => 'A closed ticket is the history of a complaint, and complaints recur. '
                    .'A year lets a pattern be seen; longer serves nobody.',
            ],
            'driver_documents_rejected' => [
                'days' => 30,
                'table' => 'driver_documents',
                'column' => 'updated_at',
                'command' => 'rafeeq:prune-retention',
                'reason' => 'A REJECTED identity document has no remaining purpose, and these are '
                    .'the most sensitive files in the system: national ID, licence, insurance, '
                    .'criminal record certificate. They were never deleted — not on '
                    .'rejection, not on resignation. Thirty days is an appeal window.',
            ],
            /*
             * Conversation shells. Found by `rafeeq:retention-report` itself, which
             * flags any growing table with no policy — none of these three appeared in
             * five rounds of audit, because nothing was looking.
             *
             * Pruned by emptiness rather than by age: a conversation whose messages are
             * gone is a row pointing at nothing.
             */
            'chat_conversations' => [
                'days' => 60,
                'table' => 'chat_conversations',
                'column' => 'updated_at',
                'command' => 'rafeeq:prune-retention',
                'reason' => 'A conversation outlives its messages, so the shell is left behind '
                    .'once chat_messages is pruned at 30 days. Sixty days clears the shells '
                    .'after their content is already gone.',
            ],
            'ai_conversations' => [
                'days' => 60,
                'table' => 'ai_conversations',
                'column' => 'updated_at',
                'command' => 'rafeeq:prune-retention',
                'reason' => 'Same shape as chat_conversations: the transcript goes at 30 days '
                    .'and the shell would otherwise remain forever.',
            ],
            'risk_flags' => [
                'days' => 180,
                'table' => 'risk_flags',
                'column' => 'created_at',
                'command' => 'rafeeq:prune-retention',
                'reason' => 'A resolved fraud flag is a pattern for six months and noise after. '
                    .'UNRESOLVED flags are exempt — an open flag is an open case.',
            ],

            'audit_logs' => [
                'days' => 730,
                'table' => 'audit_logs',
                'column' => 'created_at',
                'command' => 'rafeeq:prune-retention',
                'reason' => 'Two years, and financial actions are EXEMPT — they are kept for the '
                    .'statutory accounting period. Pruning the audit trail of a money movement '
                    .'would destroy the only defence in a dispute, so the command filters on '
                    .'action rather than trimming the table wholesale.',
            ],
        ];
    }

    /** The "when did this happen" column for a policy. */
    public static function column(string $key): string
    {
        return self::all()[$key]['column'] ?? 'created_at';
    }

    /** Days for a policy key, or null when there is no such policy. */
    public static function days(string $key): ?int
    {
        return self::all()[$key]['days'] ?? null;
    }

    /**
     * Audit actions that survive the audit-log window, because they document money.
     *
     * Matched as prefixes: `wallet.` covers credit, reversal, debt and settlement.
     */
    public static function exemptAuditPrefixes(): array
    {
        return ['wallet.', 'payment.', 'payout.', 'trip.boarded', 'trip.booking_cancelled', 'account.'];
    }
}
