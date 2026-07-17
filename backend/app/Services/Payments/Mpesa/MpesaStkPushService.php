<?php

namespace App\Services\Payments\Mpesa;

use App\Models\Bet;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class MpesaStkPushService
{
    public function __construct(private readonly MpesaAuthService $mpesaAuthService) {}

    /** @return array{request: array<string, mixed>, response: array<string, mixed>} */
    public function initiate(Bet $bet, string $phoneNumber): array
    {
        $token = $this->mpesaAuthService->getAccessToken();
        $timestamp = now()->format('YmdHis');
        $shortCode = (string) config('services.mpesa.shortcode');
        $passkey = (string) config('services.mpesa.passkey');
        $callbackUrl = (string) config('services.mpesa.callback_url');
        $partyB = (string) (config('services.mpesa.party_b') ?: $shortCode);

        if ($shortCode === '' || $passkey === '' || $callbackUrl === '' || $partyB === '') {
            throw new RuntimeException('M-Pesa STK Push environment variables are incomplete.');
        }

        $endpoint = config('services.mpesa.env') === 'live'
            ? 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
            : 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

        $payload = [
            'BusinessShortCode' => $shortCode,
            'Password' => base64_encode($shortCode.$passkey.$timestamp),
            'Timestamp' => $timestamp,
            'TransactionType' => (string) config('services.mpesa.transaction_type'),
            'Amount' => $bet->amount,
            'PartyA' => $phoneNumber,
            'PartyB' => $partyB,
            'PhoneNumber' => $phoneNumber,
            'CallBackURL' => $callbackUrl,
            'AccountReference' => substr((string) config('services.mpesa.account_reference').'-'.$bet->public_id, 0, 12),
            'TransactionDesc' => 'FinalWhistle',
        ];

        $response = Http::withToken($token)
            ->acceptJson()
            ->timeout((int) config('services.mpesa.timeout', 20))
            ->post($endpoint, $payload);

        $result = $response->json() ?? [];

        if (! $response->successful() || ! is_array($result)) {
            throw new RuntimeException((string) ($result['errorMessage'] ?? 'STK Push request failed.'));
        }

        $safePayload = $payload;
        unset($safePayload['Password']);

        return ['request' => $safePayload, 'response' => $result];
    }
}
