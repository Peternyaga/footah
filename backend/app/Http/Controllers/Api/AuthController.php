<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditService;
use App\Services\Payments\Mpesa\PhoneNumberFormatter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use InvalidArgumentException;

class AuthController extends Controller
{
    public function __construct(
        private readonly PhoneNumberFormatter $phoneFormatter,
        private readonly AuditService $audit,
    ) {}

    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'full_name' => ['required', 'string', 'min:2', 'max:120'],
            'phone_number' => ['required', 'string', 'max:24'],
            'age_confirmed' => ['accepted'],
            'terms_accepted' => ['accepted'],
        ]);

        try {
            $phone = $this->phoneFormatter->normalize($data['phone_number']);
        } catch (InvalidArgumentException $exception) {
            return response()->json(['message' => $exception->getMessage(), 'errors' => ['phone_number' => [$exception->getMessage()]]], 422);
        }

        $phoneHash = $this->phoneFormatter->hash($phone);
        if (User::query()->where('phone_hash', $phoneHash)->exists()) {
            return response()->json(['message' => 'This phone number is already registered on this device-independent pool. Contact the organiser if you lost access.'], 409);
        }

        $user = User::create([
            'public_id' => (string) Str::uuid(),
            'name' => trim($data['full_name']),
            'phone_number' => $phone,
            'phone_hash' => $phoneHash,
            'phone_last_four' => substr($phone, -4),
            'role' => User::ROLE_PARTICIPANT,
            'terms_accepted_at' => now(),
            'age_confirmed_at' => now(),
        ]);
        $token = $user->createToken('participant-web', ['participant'])->plainTextToken;
        $this->audit->record('participant.registered', $user, $user, [], $request);

        return response()->json(['data' => ['token' => $token, 'participant' => $this->participant($user)]], 201);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->participant($request->user())]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Signed out.']);
    }

    /** @return array<string, mixed> */
    private function participant(User $user): array
    {
        return ['id' => $user->public_id, 'name' => $user->name, 'phone_last_four' => $user->phone_last_four, 'role' => $user->role];
    }
}
