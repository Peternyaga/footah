<?php

namespace Tests\Feature;

use App\Models\Bet;
use App\Models\Payout;
use App\Models\PoolSetting;
use App\Models\Team;
use App\Models\User;
use App\Services\Payments\Mpesa\PhoneNumberFormatter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

class PoolFlowTest extends TestCase
{
    use RefreshDatabase;

    private Team $teamA;

    private Team $teamB;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'app.key' => 'base64:'.base64_encode(str_repeat('k', 32)),
            'services.mpesa.env' => 'sandbox',
            'services.mpesa.consumer_key' => 'consumer-key',
            'services.mpesa.consumer_secret' => 'consumer-secret',
            'services.mpesa.shortcode' => '174379',
            'services.mpesa.passkey' => 'sandbox-passkey',
            'services.mpesa.party_b' => '174379',
            'services.mpesa.transaction_type' => 'CustomerPayBillOnline',
            'services.mpesa.account_reference' => 'FinalPool',
            'services.mpesa.callback_url' => 'https://api.example.test/api/mpesa/callback',
        ]);
        Cache::clear();

        $match = PoolSetting::create([
            'event_name' => 'Office final',
            'entry_fee' => 100,
            'betting_closes_at' => now()->addDay(),
            'status' => PoolSetting::STATUS_OPEN,
            'cost_deduction' => 0,
        ]);
        $this->teamA = Team::create(['match_id' => $match->id, 'code' => 'A', 'name' => 'Team A', 'color' => '#ef634d', 'color_secondary' => '#f0b24e', 'active' => true, 'display_order' => 1]);
        $this->teamB = Team::create(['match_id' => $match->id, 'code' => 'B', 'name' => 'Team B', 'color' => '#376fdc', 'color_secondary' => '#58c6ff', 'active' => true, 'display_order' => 2]);
    }

    public function test_participant_registration_normalizes_and_protects_the_phone_number(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'full_name' => 'Peter Nyaga',
            'phone_number' => '0712 345 678',
            'password' => 'correct-horse',
            'password_confirmation' => 'correct-horse',
            'age_confirmed' => true,
            'terms_accepted' => true,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.participant.name', 'Peter Nyaga')
            ->assertJsonPath('data.participant.phone_last_four', '5678')
            ->assertJsonMissingPath('data.participant.phone_number');

        $user = User::where('phone_last_four', '5678')->firstOrFail();
        $this->assertSame('254712345678', $user->phone_number);
        $this->assertNotSame('254712345678', $user->getRawOriginal('phone_number'));

        $this->postJson('/api/auth/register', [
            'full_name' => 'Duplicate Player',
            'phone_number' => '254712345678',
            'password' => 'correct-horse',
            'password_confirmation' => 'correct-horse',
            'age_confirmed' => true,
            'terms_accepted' => true,
        ])->assertConflict();
    }

    public function test_participant_can_log_in_with_their_phone_and_password(): void
    {
        $registration = $this->postJson('/api/auth/register', [
            'full_name' => 'Peter Nyaga',
            'phone_number' => '0712 345 678',
            'password' => 'correct-horse',
            'password_confirmation' => 'correct-horse',
            'age_confirmed' => true,
            'terms_accepted' => true,
        ])->assertCreated();

        $this->withToken((string) $registration->json('data.token'))
            ->postJson('/api/auth/logout')
            ->assertOk();

        $login = $this->postJson('/api/auth/login', [
            'phone_number' => '+254 712 345 678',
            'password' => 'correct-horse',
        ])->assertOk()
            ->assertJsonPath('data.participant.name', 'Peter Nyaga')
            ->assertJsonStructure(['data' => ['token', 'participant']]);

        $token = (string) $login->json('data.token');
        $this->withToken($token)->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('data.name', 'Peter Nyaga');

        $this->postJson('/api/auth/login', [
            'phone_number' => '0712345678',
            'password' => 'correct-horse',
        ])->assertOk();

        $this->withToken($token)->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('data.name', 'Peter Nyaga');

        $this->postJson('/api/auth/login', [
            'phone_number' => '0712345678',
            'password' => 'wrong-password',
        ])->assertUnprocessable()
            ->assertJsonPath('message', 'The phone number or password is incorrect.');
    }

    public function test_hosting_safe_authorization_header_authenticates_participant(): void
    {
        $token = $this->registerParticipant('Hosted Player', '0712345678');

        $this->withHeader('X-Authorization', 'Bearer '.$token)
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('data.name', 'Hosted Player');

        $this->withHeader('X-Authorization', 'Bearer '.$token)
            ->putJson('/api/vote', ['team_id' => $this->teamA->id])
            ->assertOk()
            ->assertJsonPath('data.team.id', $this->teamA->id);
    }

    public function test_authenticated_participant_can_vote_and_change_their_vote(): void
    {
        $token = $this->registerParticipant('Voting Player', '0712345678');

        $this->withToken($token)->getJson('/api/me/vote')
            ->assertOk()
            ->assertJsonPath('data', null);

        $this->withToken($token)->putJson('/api/vote', ['team_id' => $this->teamA->id])
            ->assertOk()
            ->assertJsonPath('data.team.id', $this->teamA->id);

        $this->withToken($token)->putJson('/api/vote', ['team_id' => $this->teamB->id])
            ->assertOk()
            ->assertJsonPath('data.team.id', $this->teamB->id);

        $this->assertDatabaseCount('votes', 1);
        $this->assertDatabaseHas('votes', ['team_id' => $this->teamB->id]);

        $this->getJson('/api/pool')
            ->assertOk()
            ->assertJsonPath('data.teams.0.votes', 0)
            ->assertJsonPath('data.teams.1.votes', 1);
    }

    public function test_stk_push_is_confirmed_only_after_a_valid_callback(): void
    {
        Http::fake([
            'https://sandbox.safaricom.co.ke/oauth/v1/generate*' => Http::response(['access_token' => 'access-token'], 200),
            'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest' => Http::response([
                'MerchantRequestID' => 'merchant-1',
                'CheckoutRequestID' => 'checkout-1',
                'ResponseCode' => '0',
                'CustomerMessage' => 'Success. Request accepted for processing',
            ], 200),
        ]);

        $token = $this->registerParticipant('Alice Player', '0712345678');

        $this->withToken($token)->postJson('/api/bets', ['team_id' => $this->teamA->id])
            ->assertAccepted()
            ->assertJsonPath('data.status', Bet::STATUS_PROCESSING);

        $this->assertDatabaseHas('bets', [
            'checkout_request_id' => 'checkout-1',
            'status' => Bet::STATUS_PROCESSING,
            'mpesa_receipt_number' => null,
        ]);

        Http::assertSent(fn ($request): bool => $request->url() === 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
            && $request['Amount'] === 100
            && $request['PhoneNumber'] === '254712345678'
            && $request['CallBackURL'] === 'https://api.example.test/api/mpesa/callback');

        $this->postJson('/api/mpesa/callback', $this->callbackPayload('checkout-1', 100, 254712345678, 'SGH1234567'))
            ->assertOk()
            ->assertJsonPath('ResultCode', 0);

        $this->assertDatabaseHas('bets', [
            'checkout_request_id' => 'checkout-1',
            'status' => Bet::STATUS_CONFIRMED,
            'mpesa_receipt_number' => 'SGH1234567',
        ]);

        $this->getJson('/api/pool')
            ->assertOk()
            ->assertJsonPath('data.total_pool', 100)
            ->assertJsonPath('data.confirmed_entries', 1);
    }

    public function test_a_success_callback_with_mismatched_payment_details_is_rejected(): void
    {
        $user = $this->participant('Mismatch Player', '0711111111');
        Bet::create([
            'public_id' => (string) Str::uuid(),
            'user_id' => $user->id,
            'match_id' => $this->teamA->match_id,
            'team_id' => $this->teamA->id,
            'amount' => 100,
            'status' => Bet::STATUS_PROCESSING,
            'checkout_request_id' => 'checkout-mismatch',
            'initiated_at' => now(),
        ]);

        $this->postJson('/api/mpesa/callback', $this->callbackPayload('checkout-mismatch', 50, 254711111111, 'SGH7654321'))
            ->assertOk();

        $this->assertDatabaseHas('bets', [
            'checkout_request_id' => 'checkout-mismatch',
            'status' => Bet::STATUS_FAILED,
            'mpesa_receipt_number' => null,
        ]);
    }

    public function test_admin_settlement_distributes_integer_shillings_deterministically(): void
    {
        PoolSetting::query()->update(['cost_deduction' => 1]);
        $admin = User::create([
            'public_id' => (string) Str::uuid(),
            'name' => 'Pool Admin',
            'email' => 'admin@example.test',
            'role' => User::ROLE_ADMIN,
            'password' => 'password',
        ]);

        foreach ([
            ['Winner One', '0710000001', $this->teamA],
            ['Winner Two', '0710000002', $this->teamA],
            ['Winner Three', '0710000003', $this->teamA],
            ['Other One', '0710000004', $this->teamB],
            ['Other Two', '0710000005', $this->teamB],
        ] as [$name, $phone, $team]) {
            $user = $this->participant($name, $phone);
            Bet::create([
                'public_id' => (string) Str::uuid(),
                'user_id' => $user->id,
                'match_id' => $team->match_id,
                'team_id' => $team->id,
                'amount' => 100,
                'status' => Bet::STATUS_CONFIRMED,
                'mpesa_receipt_number' => 'RCPT'.$user->id,
                'confirmed_at' => now(),
            ]);
        }

        $token = $admin->createToken('test-admin', ['admin'])->plainTextToken;
        $this->withToken($token)->postJson('/api/admin/settle', ['winner_team_id' => $this->teamA->id])
            ->assertOk()
            ->assertJsonPath('data.total_pool', 500)
            ->assertJsonPath('data.cost_deduction', 1);

        $this->assertSame([167, 166, 166], Payout::query()->orderBy('id')->pluck('amount')->all());
        $this->assertDatabaseHas('pool_settings', ['status' => PoolSetting::STATUS_SETTLED, 'winner_team_id' => $this->teamA->id]);
    }

    public function test_admin_can_create_close_and_settle_a_match_with_teams(): void
    {
        $admin = User::create([
            'public_id' => (string) Str::uuid(),
            'name' => 'Match Admin',
            'email' => 'matches@example.test',
            'role' => User::ROLE_ADMIN,
            'password' => 'password',
        ]);
        $token = $admin->createToken('test-admin', ['admin'])->plainTextToken;

        $created = $this->withToken($token)->postJson('/api/admin/matches', [
            'event_name' => 'Office Semi Final',
            'entry_fee' => 150,
            'betting_closes_at' => now()->addDays(2)->toIso8601String(),
            'teams' => [['name' => 'Lions'], ['name' => 'Eagles']],
        ])->assertCreated()
            ->assertJsonPath('data.event_name', 'Office Semi Final')
            ->assertJsonCount(2, 'data.teams');

        $matchId = (int) $created->json('data.id');
        $winnerId = (int) $created->json('data.teams.0.id');

        $participantToken = $this->registerParticipant('Two Match Voter', '0712000099');
        $this->withToken($participantToken)->putJson('/api/vote', ['team_id' => $this->teamA->id])->assertOk();
        $this->withToken($participantToken)->putJson('/api/vote', ['team_id' => $winnerId])->assertOk();
        $this->assertDatabaseCount('votes', 2);

        $this->withToken($token)->patchJson('/api/admin/matches/'.$matchId, ['status' => PoolSetting::STATUS_CLOSED])
            ->assertOk()
            ->assertJsonPath('data.status', PoolSetting::STATUS_CLOSED);

        $this->withToken($token)->postJson('/api/admin/settle', ['winner_team_id' => $winnerId])
            ->assertOk()
            ->assertJsonPath('data.winner_team_id', $winnerId);

        $this->assertDatabaseHas('pool_settings', ['id' => $matchId, 'status' => PoolSetting::STATUS_SETTLED, 'winner_team_id' => $winnerId]);
        $this->assertDatabaseCount('pool_settings', 2);
    }

    public function test_repeated_deployment_seeding_preserves_admin_edited_teams(): void
    {
        $this->teamA->update(['name' => 'Official Finalist']);

        $this->seed();

        $this->assertDatabaseHas('teams', ['code' => 'A', 'name' => 'Official Finalist']);
        $this->assertDatabaseCount('teams', 2);
        $this->assertDatabaseCount('pool_settings', 1);
    }

    private function registerParticipant(string $name, string $phone): string
    {
        return (string) $this->postJson('/api/auth/register', [
            'full_name' => $name,
            'phone_number' => $phone,
            'password' => 'correct-horse',
            'password_confirmation' => 'correct-horse',
            'age_confirmed' => true,
            'terms_accepted' => true,
        ])->assertCreated()->json('data.token');
    }

    private function participant(string $name, string $phone): User
    {
        $formatter = app(PhoneNumberFormatter::class);
        $normalized = $formatter->normalize($phone);

        return User::create([
            'public_id' => (string) Str::uuid(),
            'name' => $name,
            'phone_number' => $normalized,
            'phone_hash' => $formatter->hash($normalized),
            'phone_last_four' => substr($normalized, -4),
            'role' => User::ROLE_PARTICIPANT,
            'terms_accepted_at' => now(),
            'age_confirmed_at' => now(),
        ]);
    }

    /** @return array<string, mixed> */
    private function callbackPayload(string $checkoutId, int $amount, int $phone, string $receipt): array
    {
        return ['Body' => ['stkCallback' => [
            'MerchantRequestID' => 'merchant-1',
            'CheckoutRequestID' => $checkoutId,
            'ResultCode' => 0,
            'ResultDesc' => 'The service request is processed successfully.',
            'CallbackMetadata' => ['Item' => [
                ['Name' => 'Amount', 'Value' => $amount],
                ['Name' => 'MpesaReceiptNumber', 'Value' => $receipt],
                ['Name' => 'TransactionDate', 'Value' => 20260716172000],
                ['Name' => 'PhoneNumber', 'Value' => $phone],
            ]],
        ]]];
    }
}
