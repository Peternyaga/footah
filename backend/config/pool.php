<?php

return [
    'event_name' => env('POOL_EVENT_NAME', '2026 World Cup Final'),
    'entry_fee' => (int) env('POOL_ENTRY_FEE', 100),
    'betting_closes_at' => env('POOL_BETTING_CLOSES_AT', '2026-07-19T22:00:00+03:00'),
    'cost_deduction' => (int) env('POOL_COST_DEDUCTION', 0),
    'frontend_url' => env('FRONTEND_URL', 'http://localhost:3000'),
    'admin_name' => env('ADMIN_NAME', 'Pool Organiser'),
    'admin_email' => env('ADMIN_EMAIL', 'admin@example.com'),
    'admin_password' => env('ADMIN_PASSWORD'),
];
