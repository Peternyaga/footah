# The Final Whistle

A self-hostable office World Cup final pool with a static Next.js frontend and a Laravel 12 + MySQL API.

## What is implemented

- Participant registration with encrypted Safaricom phone numbers and one entry per phone
- KES 100 M-Pesa STK Push using the same Daraja request pattern as `Peternyaga/shwapy`
- Callback-only payment confirmation with checkout ID, amount, phone, and receipt validation
- Live team totals, private receipts, participant chat, and admin reconciliation
- Automatic betting cutoff and immutable confirmed picks
- Admin winner declaration and deterministic whole-shilling payout calculation
- Audit logging, Sanctum bearer tokens, throttling, CORS, and production environment controls
- Responsive and keyboard-friendly frontend with live status messages

## Project layout

```text
app/                 Next.js frontend
lib/api.ts           Frontend API client and types
backend/             Laravel API, database migrations, M-Pesa services, and tests
dist/                Generated static frontend after npm run build
DEPLOYMENT.md         Complete local and production setup guide
```

## Quick local start

You need Node.js 20+, PHP 8.2+, Composer, and MySQL 8+.

```bash
# Terminal 1: API
cd backend
composer install
cp .env.example .env
php artisan key:generate
# Fill in the database, admin, and M-Pesa values in .env
php artisan migrate --seed
php artisan serve

# Terminal 2: frontend
cd ..
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`. The API runs at `http://localhost:8000`.

For the exact M-Pesa variables, public callback requirements, cPanel/VPS deployment steps, and go-live checklist, read [DEPLOYMENT.md](DEPLOYMENT.md).

Pushes to `main` can deploy automatically through `.github/workflows/deploy.yml`. Configure the repository's `production` environment as described in the GitHub Actions section of [DEPLOYMENT.md](DEPLOYMENT.md).

## Verification

```bash
npm run lint
npm run build

cd backend
php artisan test
vendor/bin/pint --test
```

Never commit either `.env` file or expose the Daraja passkey, consumer secret, Laravel `APP_KEY`, database password, or admin password.
