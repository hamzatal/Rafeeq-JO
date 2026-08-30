<?php

namespace Rafeeq\Modules\Wallet\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Wallet\Models\WalletTransaction;
use Rafeeq\Modules\Wallet\Resources\WalletResource;
use Rafeeq\Modules\Wallet\Resources\WalletTransactionResource;
use Rafeeq\Modules\Wallet\Services\WalletService;

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
            WalletTransactionResource::collection($wallet->transactions()->paginate($this->perPage($request, 30)))
        );
    }

    /** Admin: confirm a CliQ top-up and credit the user's wallet. */
    public function adminCredit(Request $request): JsonResponse
    {
        // A manual credit mints balance, so it is capped and must be justified.
        // Previously this accepted min:1 with no ceiling and an optional
        // reference, which was weaker than the user's own top-up (min:1000).
        $max = (int) config('rafeeq.admin_credit_max_fils', 50000);

        $data = $request->validate([
            'user_id' => ['required', 'uuid', 'exists:users,id'],
            'amount_fils' => ['required', 'integer', 'min:1000', 'max:'.$max],
            'reason' => ['required', 'string', 'min:10', 'max:200'],
            'reference' => ['nullable', 'string', 'max:100'],
        ]);

        $user = User::findOrFail($data['user_id']);
        $wallet = $this->wallet->forUser($user);
        $txn = $this->wallet->adminTopup(
            $wallet,
            $data['amount_fils'],
            $data['reference'] ?? null,
            $data['reason'],
            $request->user(),
        );

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
                $wallet->transactions()->latest()->limit($this->limit($request, 20))->get()
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
            'reason' => ['required', 'string', 'min:10', 'max:200'],
        ]);

        $original = WalletTransaction::findOrFail($data['transaction_id']);
        $reversal = $this->wallet->reverseTransaction($original, $data['reason']);

        return $this->ok([
            'wallet' => new WalletResource($original->wallet->fresh()),
            'reversal' => new WalletTransactionResource($reversal),
        ], 'تم عكس الشحن.');
    }
}
