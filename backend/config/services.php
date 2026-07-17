<?php

$mpesaEnvironment = strtolower(trim((string) env('MPESA_ENV', 'sandbox')));
$mpesaEnvironment = match ($mpesaEnvironment) {
    'live', 'prod', 'production' => 'live',
    'sandbox', 'test', 'testing' => 'sandbox',
    default => $mpesaEnvironment,
};
$firstMpesaValue = static function (string ...$names): ?string {
    foreach ($names as $name) {
        $value = env($name);
        if (is_string($value) && trim($value) !== '') {
            return trim($value);
        }
    }

    return null;
};
$mpesaIsLive = $mpesaEnvironment === 'live';

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'mpesa' => [
        'env' => $mpesaEnvironment,
        'consumer_key' => $mpesaIsLive
            ? $firstMpesaValue('MPESA_CONSUMER_KEY')
            : $firstMpesaValue('MPESA_CONSUMER_KEY_SANDBOX', 'MPESA_CONSUMER_KEY'),
        'consumer_secret' => $mpesaIsLive
            ? $firstMpesaValue('MPESA_CONSUMER_SECRET')
            : $firstMpesaValue('MPESA_CONSUMER_SECRET_SANDBOX', 'MPESA_CONSUMER_SECRET'),
        'shortcode' => $mpesaIsLive
            ? $firstMpesaValue('MPESA_SHORTCODE')
            : $firstMpesaValue('MPESA_SHORTCODE_SANDBOX', 'MPESA_SHORTCODE'),
        'passkey' => $mpesaIsLive
            ? $firstMpesaValue('MPESA_PASSKEY')
            : $firstMpesaValue('MPESA_PASSKEY_SANDBOX', 'MPESA_PASSKEY'),
        'party_b' => env('MPESA_PARTY_B'),
        'transaction_type' => env('MPESA_TRANSACTION_TYPE', 'CustomerPayBillOnline'),
        'account_reference' => env('MPESA_ACCOUNT_REFERENCE', 'FinalWhistle'),
        'callback_url' => env('MPESA_CALLBACK_URL'),
        'timeout' => (int) env('MPESA_TIMEOUT', 20),
    ],

];
