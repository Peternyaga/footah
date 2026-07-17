<?php

namespace App\Console\Commands;

use App\Services\Payments\Mpesa\MpesaAuthService;
use Illuminate\Console\Command;
use Throwable;

class CheckMpesaAuthentication extends Command
{
    protected $signature = 'mpesa:check-auth {--fresh : Discard the cached token before authenticating}';

    protected $description = 'Verify the configured Daraja OAuth credentials without displaying secrets';

    public function handle(MpesaAuthService $auth): int
    {
        try {
            if ($this->option('fresh')) {
                $auth->forgetAccessToken();
            }

            $auth->getAccessToken();
            $this->info('Daraja OAuth authentication succeeded for '.config('services.mpesa.env').'.');

            return self::SUCCESS;
        } catch (Throwable $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }
    }
}
