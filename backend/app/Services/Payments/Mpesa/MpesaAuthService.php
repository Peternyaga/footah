<?php

namespace App\Services\Payments\Mpesa;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class MpesaAuthService
{
    public function getAccessToken(): string
    {
        [$environment, $consumerKey, $consumerSecret] = $this->credentials();
        $cacheKey = $this->cacheKey($environment, $consumerKey);
        $cachedToken = Cache::get($cacheKey);

        if (is_string($cachedToken) && $cachedToken !== '') {
            return $cachedToken;
        }

        return Cache::lock($cacheKey.':lock', 15)->block(10, function () use ($cacheKey, $consumerKey, $consumerSecret, $environment): string {
            $cachedToken = Cache::get($cacheKey);
            if (is_string($cachedToken) && $cachedToken !== '') {
                return $cachedToken;
            }

            $baseUrl = $environment === 'live'
                ? 'https://api.safaricom.co.ke'
                : 'https://sandbox.safaricom.co.ke';

            $response = Http::withBasicAuth($consumerKey, $consumerSecret)
                ->acceptJson()
                ->connectTimeout(10)
                ->timeout((int) config('services.mpesa.timeout', 20))
                ->get($baseUrl.'/oauth/v1/generate', ['grant_type' => 'client_credentials']);

            if (! $response->successful()) {
                $errorCode = trim((string) ($response->json('errorCode') ?? $response->json('requestId') ?? ''));
                $errorMessage = trim((string) ($response->json('errorMessage') ?? $response->json('message') ?? ''));
                $details = implode(': ', array_filter([$errorCode, $errorMessage]));

                throw new RuntimeException(sprintf(
                    'Daraja authentication failed for %s (HTTP %d)%s.',
                    $environment,
                    $response->status(),
                    $details === '' ? '' : ': '.$details,
                ));
            }

            $token = trim((string) $response->json('access_token'));
            if ($token === '') {
                throw new RuntimeException('Daraja access token missing from the response.');
            }

            $expiresIn = max(120, (int) $response->json('expires_in', 3600));
            Cache::put($cacheKey, $token, now()->addSeconds($expiresIn - 60));

            return $token;
        });
    }

    public function forgetAccessToken(): void
    {
        [$environment, $consumerKey] = $this->credentials();
        Cache::forget($this->cacheKey($environment, $consumerKey));
    }

    /** @return array{string, string, string} */
    private function credentials(): array
    {
        $environment = strtolower(trim((string) config('services.mpesa.env', 'sandbox')));
        if (! in_array($environment, ['sandbox', 'live'], true)) {
            throw new RuntimeException('MPESA_ENV must be sandbox, live, or production.');
        }

        $consumerKey = trim((string) config('services.mpesa.consumer_key'));
        $consumerSecret = trim((string) config('services.mpesa.consumer_secret'));
        if ($consumerKey === '' || $consumerSecret === '') {
            throw new RuntimeException('M-Pesa consumer credentials are not configured for '.$environment.'.');
        }

        return [$environment, $consumerKey, $consumerSecret];
    }

    private function cacheKey(string $environment, string $consumerKey): string
    {
        return 'mpesa:daraja-access-token:'.$environment.':'.substr(hash('sha256', $consumerKey), 0, 16);
    }
}
