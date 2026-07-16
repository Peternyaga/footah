<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AdminAuthController extends Controller
{
    public function __construct(private readonly AuditService $audit) {}

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email'], 'password' => ['required', 'string', 'max:255']]);
        $admin = User::query()->where('email', strtolower($data['email']))->where('role', User::ROLE_ADMIN)->first();

        if (! $admin || ! Hash::check($data['password'], (string) $admin->password)) {
            return response()->json(['message' => 'Invalid administrator credentials.'], 422);
        }

        $admin->tokens()->where('name', 'admin-web')->delete();
        $token = $admin->createToken('admin-web', ['admin'])->plainTextToken;
        $this->audit->record('admin.login', $admin, $admin, [], $request);

        return response()->json(['data' => ['token' => $token, 'admin' => ['name' => $admin->name, 'email' => $admin->email]]]);
    }
}
