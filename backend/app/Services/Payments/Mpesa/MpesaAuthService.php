<?php

namespace App\Services\Payments\Mpesa;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class MpesaAuthService
{
    public function getAccessToken(): string
    {
        return Cache::remember('mpesa:daraja-access-token', now()->addMinutes(50), function (): string {
            $consumerKey = (string) config('services.mpesa.consumer_key');
            $consumerSecret = (string) config('services.mpesa.consumer_secret');

            if ($consumerKey === '' || $consumerSecret === '') {
                throw new RuntimeException('M-Pesa consumer credentials are not configured.');
            }

            $baseUrl = config('services.mpesa.env') === 'live'
                ? 'https://api.safaricom.co.ke'
                : 'https://sandbox.safaricom.co.ke';

            $response = Http::withBasicAuth($consumerKey, $consumerSecret)
                ->timeout((int) config('services.mpesa.timeout', 20))
                ->get($baseUrl.'/oauth/v1/generate', ['grant_type' => 'client_credentials']);

            if (! $response->successful()) {
                throw new RuntimeException('Failed to authenticate with the Daraja API.');
            }

            $token = (string) $response->json('access_token');

            if ($token === '') {
                throw new RuntimeException('Daraja access token missing from the response.');
            }

            return $token;
        });
    }
}
