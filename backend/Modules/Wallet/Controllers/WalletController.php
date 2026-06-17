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

        return $this->ok([
            'method' => 'cliq',
            'alias' => config('services.cliq.alias'),
            'beneficiary' => config('services.cliq.beneficiary_name'),
            'bank' => config('services.cliq.bank_name'),
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
        $txn = $this->wallet->credit($wallet, $data['amount_fils'], WalletTxnType::Topup, 'شحن معتمد من الإدارة', $data['reference'] ?? null);

        return $this->ok([
            'wallet' => new WalletResource($wallet->fresh()),
            'transaction' => new WalletTransactionResource($txn),
        ], 'تم شحن الرصيد.');
    }
}
