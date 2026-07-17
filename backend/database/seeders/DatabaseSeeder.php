<?php

namespace Database\Seeders;

use App\Models\PoolSetting;
use App\Models\Team;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $match = PoolSetting::firstOrCreate(['id' => 1], [
            'event_name' => config('pool.event_name'),
            'entry_fee' => config('pool.entry_fee'),
            'betting_closes_at' => config('pool.betting_closes_at'),
            'status' => PoolSetting::STATUS_OPEN,
            'cost_deduction' => config('pool.cost_deduction'),
        ]);
        Team::firstOrCreate(['code' => 'A'], ['match_id' => $match->id, 'name' => 'Argentina', 'route' => 'Finalist · Messi leads the holders', 'color' => '#74c7f5', 'color_secondary' => '#ffffff', 'active' => true, 'display_order' => 1]);
        Team::firstOrCreate(['code' => 'B'], ['match_id' => $match->id, 'name' => 'Spain', 'route' => "Finalist · Lamine Yamal's Roja", 'color' => '#d61920', 'color_secondary' => '#ffd43b', 'active' => true, 'display_order' => 2]);
        Team::query()->whereIn('code', ['A', 'B'])->whereNull('match_id')->update(['match_id' => $match->id]);

        if (filled(config('pool.admin_password'))) {
            $admin = User::firstOrNew(['email' => strtolower((string) config('pool.admin_email'))]);
            $admin->fill([
                'name' => config('pool.admin_name'),
                'role' => User::ROLE_ADMIN,
                'password' => Hash::make((string) config('pool.admin_password')),
            ]);
            $admin->public_id ??= (string) Str::uuid();
            $admin->save();
        }
    }
}
