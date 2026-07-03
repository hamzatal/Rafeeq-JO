<?php

namespace Rafeeq\Modules\Wallet\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Wallet\Resources\WalletResource;
use Rafeeq\Modules\Wallet\Resources\WalletTransactionResource;
use Rafeeq\Modules\Wallet\Services\WalletService;
use Rafeeq\Shared\Enums\WalletTxnType;

class WalletController extends Controller
{
    public function __construct(private readonly WalletService $wallet) {}

    public function show(Request $request): JsonResponse
    {
        return $this->ok(new WalletResource($this->wallet->forUser($request->user())));
    }

    public function transactions(Request $request): JsonResponse
    {
        $wallet = $this->wallet->forUser($request->user());

        return $this->ok(
            WalletTransactionResource::collection($wallet->transactions()->paginate((int) $request->query('per_page', 30)))
        );
    }

    /** Returns CliQ transfer instructions for topping up (no credit until confirmed). */
    public function topupInstructions(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'amount_fils' => ['required', 'integer', 'min:1000'], // >= 1 JOD
        ]);

        $reference = 'WALLET-'.strtoupper(substr($request->user()->id, 0, 6)).'-'.now()->format('ymdHis');

        $cliq = app(\Rafeeq\Modules\Settings\Services\SettingService::class)->cliq();

        return $this->ok([
            'method' => 'cliq',
            'alias' => $cliq['alias'],
            'beneficiary' => $cliq['beneficiary_name'],
            'bank' => $cliq['bank_name'],
            'amount_fils' => $validated['amount_fils'],
            'amount_jod' => round($validated['amount_fils'] / 1000, 3),
            'reference' => $reference,
            'note' => 'حوّل المبلغ عبر CliQ ثم ارفع إشعار التحويل ليتم اعتماد الشحن.',
        ], 'تعليمات الشحن عبر CliQ.');
    }

    /** Admin: confirm a CliQ top-up and credit the user's wallet. */
    public function adminCredit(Request $request): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['required', 'uuid', 'exists:users,id'],
            'amount_fils' => ['required', 'integer', 'min:1'],
            'reference' => ['nullable', 'string', 'max:100'],
        ]);

        $user = User::findOrFail($data['user_id']);
        $wallet = $this->wallet->forUser($user);
        $txn = $this->wallet->adminTopup($wallet, $data['amount_fils'], $data['reference'] ?? null);

        return $this->ok([
            'wallet' => new WalletResource($wallet->fresh()),
            'transaction' => new WalletTransactionResource($txn),
        ], 'تم شحن الرصيد.');
    }

    /** Admin: list a specific user's recent wallet transactions (to review / reverse). */
    public function adminTransactions(Request $request): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['required', 'uuid', 'exists:users,id'],
        ]);

        $user = User::findOrFail($data['user_id']);
        $wallet = $this->wallet->forUser($user);

        return $this->ok([
            'wallet' => new WalletResource($wallet),
            'transactions' => WalletTransactionResource::collection(
                $wallet->transactions()->latest()->limit((int) $request->query('limit', 20))->get()
            ),
        ]);
    }

    /**
     * Admin: reverse a manual top-up / adjustment credit entered by mistake
     * (e.g. charged 100 instead of 10). Non-destructive — records a balancing
     * Adjustment debit and flags the original.
     */
    public function adminReverse(Request $request): JsonResponse
    {
        $data = $request->validate([
            'transaction_id' => ['required', 'uuid', 'exists:wallet_transactions,id'],
            'reason' => ['nullable', 'string', 'max:200'],
        ]);

        $original = \Rafeeq\Modules\Wallet\Models\WalletTransaction::findOrFail($data['transaction_id']);
        $reversal = $this->wallet->reverseTransaction($original, $data['reason'] ?? null);

        return $this->ok([
            'wallet' => new WalletResource($original->wallet->fresh()),
            'reversal' => new WalletTransactionResource($reversal),
        ], 'تم عكس الشحن.');
    }
}
