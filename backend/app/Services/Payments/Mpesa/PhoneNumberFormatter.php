<?php

namespace App\Services\Payments\Mpesa;

use InvalidArgumentException;

class PhoneNumberFormatter
{
    public function normalize(string $phoneNumber): string
    {
        $digits = preg_replace('/\D+/', '', $phoneNumber) ?? '';

        if (str_starts_with($digits, '0')) {
            $digits = '254'.substr($digits, 1);
        } elseif (preg_match('/^(7|1)\d{8}$/', $digits)) {
            $digits = '254'.$digits;
        }

        if (! preg_match('/^254(7|1)\d{8}$/', $digits)) {
            throw new InvalidArgumentException('Use a valid Safaricom number such as 07XXXXXXXX or 01XXXXXXXX.');
        }

        return $digits;
    }

    public function hash(string $normalizedPhoneNumber): string
    {
        return hash_hmac('sha256', $normalizedPhoneNumber, (string) config('app.key'));
    }
}
