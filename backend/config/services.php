<?php

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
        'env' => env('MPESA_ENV', 'sandbox'),
        'consumer_key' => env('MPESA_ENV') === 'live'
            ? env('MPESA_CONSUMER_KEY')
            : env('MPESA_CONSUMER_KEY_SANDBOX'),
        'consumer_secret' => env('MPESA_ENV') === 'live'
            ? env('MPESA_CONSUMER_SECRET')
            : env('MPESA_CONSUMER_SECRET_SANDBOX'),
        'shortcode' => env('MPESA_ENV') === 'live'
            ? env('MPESA_SHORTCODE')
            : env('MPESA_SHORTCODE_SANDBOX'),
        'passkey' => env('MPESA_ENV') === 'live'
            ? env('MPESA_PASSKEY')
            : env('MPESA_PASSKEY_SANDBOX'),
        'party_b' => env('MPESA_PARTY_B'),
        'transaction_type' => env('MPESA_TRANSACTION_TYPE', 'CustomerPayBillOnline'),
        'account_reference' => env('MPESA_ACCOUNT_REFERENCE', 'FinalWhistle'),
        'callback_url' => env('MPESA_CALLBACK_URL'),
        'timeout' => (int) env('MPESA_TIMEOUT', 20),
    ],

];
