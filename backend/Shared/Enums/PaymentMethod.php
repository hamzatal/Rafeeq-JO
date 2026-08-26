<?php

namespace Rafeeq\Shared\Enums;

/**
 * How a rider settles a fare.
 *
 * Cash exists because of who the riders are: students aged 18–22, many of whom have
 * no bank account, and CliQ top-ups need one. Requiring a funded wallet before the
 * first ride turns the wallet into a barrier in front of the product rather than a
 * convenience inside it.
 *
 * But cash is added in a specific shape, and the shape is the whole point:
 *
 *   The fare is still SET AND RECORDED by the platform at the published band price.
 *   The captain collects the notes, not the price. Nothing is negotiated in the
 *   vehicle, and the trip carries the same ledger row it would have carried on
 *   wallet — which is what keeps the tariff auditable and keeps "no undeclared
 *   amounts" true.
 *
 *   And the money flow inverts. On wallet the platform holds the fare and pays the
 *   captain their share. On cash the captain already holds the whole fare, so they
 *   OWE the platform its commission — the commission becomes a receivable, debited
 *   from the captain's wallet the moment boarding is confirmed.
 *
 * That inversion is why cash is not simply "skip the debit": it turns the platform
 * into a creditor, which needs a ceiling. See RideBillingService and
 * `rafeeq.captain_debt_ceiling_fils`.
 */
enum PaymentMethod: string
{
    /** Debited from the rider's wallet. The platform holds the fare. */
    case Wallet = 'wallet';

    /** Handed to the captain in the vehicle, at the price the app displayed. */
    case Cash = 'cash';

    public function label(): string
    {
        return match ($this) {
            self::Wallet => 'المحفظة',
            self::Cash => 'نقداً للكابتن',
        };
    }

    /** Does the platform end up owed money by the captain for this method? */
    public function createsCaptainDebt(): bool
    {
        return $this === self::Cash;
    }

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
