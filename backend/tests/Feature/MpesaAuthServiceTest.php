<?php

namespace Tests\Feature;

use App\Services\Payments\Mpesa\MpesaAuthService;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Tests\TestCase;

class MpesaAuthServiceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.mpesa.env' => 'sandbox',
            'services.mpesa.consumer_key' => 'consumer-key',
            'services.mpesa.consumer_secret' => 'consumer-secret',
            'services.mpesa.timeout' => 20,
        ]);
        Cache::clear();
    }

    public function test_it_uses_basic_auth_and_the_client_credentials_grant(): void
    {
        Http::fake([
            'https://sandbox.safaricom.co.ke/oauth/v1/generate*' => Http::response([
                'access_token' => 'sandbox-token',
                'expires_in' => 3599,
            ]),
        ]);

        $this->assertSame('sandbox-token', app(MpesaAuthService::class)->getAccessToken());

        Http::assertSent(function (Request $request): bool {
            return str_starts_with($request->url(), 'https://sandbox.safaricom.co.ke/oauth/v1/generate?')
                && str_contains($request->url(), 'grant_type=client_credentials')
                && $request->hasHeader('Authorization', 'Basic '.base64_encode('consumer-key:consumer-secret'));
        });
    }

    public function test_cached_tokens_are_scoped_to_the_environment_and_consumer_key(): void
    {
        Http::fake(function (Request $request) {
            $replacement = $request->hasHeader('Authorization', 'Basic '.base64_encode('replacement-key:consumer-secret'));

            return Http::response(['access_token' => $replacement ? 'replacement-token' : 'first-token']);
        });
        $service = app(MpesaAuthService::class);
        $this->assertSame('first-token', $service->getAccessToken());

        config(['services.mpesa.consumer_key' => 'replacement-key']);

        $this->assertSame('replacement-token', $service->getAccessToken());
    }

    public function test_authentication_errors_include_safe_daraja_diagnostics(): void
    {
        Http::fake([
            'https://sandbox.safaricom.co.ke/oauth/v1/generate*' => Http::response([
                'errorCode' => '400.008.01',
                'errorMessage' => 'Invalid authentication type passed',
            ], 400),
        ]);

        try {
            app(MpesaAuthService::class)->getAccessToken();
            $this->fail('Expected Daraja authentication to fail.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('sandbox (HTTP 400)', $exception->getMessage());
            $this->assertStringContainsString('400.008.01: Invalid authentication type passed', $exception->getMessage());
            $this->assertStringNotContainsString('consumer-secret', $exception->getMessage());
        }
    }
}
