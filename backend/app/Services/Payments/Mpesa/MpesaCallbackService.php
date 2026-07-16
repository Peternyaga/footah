<?php

namespace App\Services\Payments\Mpesa;

use App\Models\Bet;
use App\Services\AuditService;
use Illuminate\Support\Facades\DB;

class MpesaCallbackService
{
    public function __construct(
        private readonly PhoneNumberFormatter $phoneFormatter,
        private readonly AuditService $audit,
    ) {}

    /** @param array<string, mixed> $payload */
    public function handle(array $payload): ?Bet
    {
        $checkoutRequestId = (string) data_get($payload, 'Body.stkCallback.CheckoutRequestID', '');
        if ($checkoutRequestId === '') {
            return null;
        }

        return DB::transaction(function () use ($checkoutRequestId, $payload): ?Bet {
            $bet = Bet::query()->with('user')->where('checkout_request_id', $checkoutRequestId)->lockForUpdate()->first();
            if (! $bet) {
                return null;
            }
            if ($bet->status === Bet::STATUS_CONFIRMED) {
                return $bet;
            }

            $resultCode = (int) data_get($payload, 'Body.stkCallback.ResultCode', -1);
            $description = (string) data_get($payload, 'Body.stkCallback.ResultDesc', 'M-Pesa callback received.');
            $values = $this->metadata($payload);

            $status = match ($resultCode) {
                0 => Bet::STATUS_CONFIRMED,
                1032 => Bet::STATUS_CANCELLED,
                1037 => Bet::STATUS_TIMEOUT,
                default => Bet::STATUS_FAILED,
            };

            if ($resultCode === 0) {
                $amountMatches = (int) round((float) ($values['Amount'] ?? 0)) === $bet->amount;
                $phoneMatches = false;
                try {
                    $phone = $this->phoneFormatter->normalize((string) ($values['PhoneNumber'] ?? ''));
                    $phoneMatches = hash_equals((string) $bet->user->phone_hash, $this->phoneFormatter->hash($phone));
                } catch (\InvalidArgumentException) {
                    $phoneMatches = false;
                }

                if (! $amountMatches || ! $phoneMatches || empty($values['MpesaReceiptNumber'])) {
                    $status = Bet::STATUS_FAILED;
                    $description = 'Successful callback failed amount, phone, or receipt validation.';
                }
            }

            $bet->update([
                'status' => $status,
                'mpesa_receipt_number' => $status === Bet::STATUS_CONFIRMED ? (string) $values['MpesaReceiptNumber'] : null,
                'result_code' => $resultCode,
                'result_description' => $description,
                'raw_callback' => $payload,
                'confirmed_at' => $status === Bet::STATUS_CONFIRMED ? now() : null,
            ]);
            $this->audit->record('bet.callback_received', null, $bet, ['status' => $status, 'result_code' => $resultCode]);

            return $bet->fresh();
        });
    }

    /** @param array<string, mixed> $payload @return array<string, mixed> */
    private function metadata(array $payload): array
    {
        $items = data_get($payload, 'Body.stkCallback.CallbackMetadata.Item', []);
        $values = [];
        foreach (is_array($items) ? $items : [] as $item) {
            if (is_array($item) && isset($item['Name'])) {
                $values[(string) $item['Name']] = $item['Value'] ?? null;
            }
        }

        return $values;
    }
}
