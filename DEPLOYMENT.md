# Setup and deployment

## 1. What you need

- A frontend domain, for example `pool.example.com`
- A backend domain, for example `api.pool.example.com`
- HTTPS on both domains; Safaricom must reach the callback over public HTTPS
- PHP 8.2 or newer with `curl`, `ctype`, `fileinfo`, `mbstring`, `openssl`, `pdo_mysql`, `tokenizer`, and `xml`
- Composer 2, Node.js 20 or newer, and npm
- MySQL 8+ or MariaDB 10.6+
- A Safaricom Daraja app and either sandbox credentials or an approved live shortcode/passkey

The frontend is static. The backend must run on a PHP host whose document root can point to `backend/public`. A VPS, Laravel-compatible managed host, or cPanel account with document-root control works. The ChatGPT Sites preview cannot run this PHP backend.

## 2. Local development

Create a MySQL database and user:

```sql
CREATE DATABASE final_whistle CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'final_whistle'@'localhost' IDENTIFIED BY 'replace-with-a-strong-password';
GRANT ALL PRIVILEGES ON final_whistle.* TO 'final_whistle'@'localhost';
FLUSH PRIVILEGES;
```

Prepare the API:

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

Before `migrate --seed`, edit `backend/.env` and set at least:

```dotenv
APP_URL=http://localhost:8000
DB_DATABASE=final_whistle
DB_USERNAME=final_whistle
DB_PASSWORD=replace-with-a-strong-password
FRONTEND_URL=http://localhost:3000
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=replace-with-a-long-unique-password
```

Prepare the frontend in a second terminal:

```bash
cp .env.example .env.local
npm install
npm run dev
```

For a real sandbox callback while developing, expose port 8000 using an HTTPS tunnel and set `MPESA_CALLBACK_URL` to `https://your-tunnel.example/api/mpesa/callback`. Restart the API after changing configuration. Safaricom cannot call `localhost`.

## 3. M-Pesa configuration

The service follows the Shwapy pattern: OAuth access token, timestamped base64 password, STK `processrequest`, and asynchronous callback processing.

Sandbox:

```dotenv
MPESA_ENV=sandbox
MPESA_CONSUMER_KEY_SANDBOX=your-sandbox-consumer-key
MPESA_CONSUMER_SECRET_SANDBOX=your-sandbox-consumer-secret
MPESA_SHORTCODE_SANDBOX=174379
MPESA_PASSKEY_SANDBOX=your-sandbox-passkey
MPESA_PARTY_B=174379
MPESA_TRANSACTION_TYPE=CustomerPayBillOnline
MPESA_ACCOUNT_REFERENCE=FinalWhistle
MPESA_CALLBACK_URL=https://your-public-api.example/api/mpesa/callback
```

Live:

```dotenv
MPESA_ENV=live
MPESA_CONSUMER_KEY=your-live-consumer-key
MPESA_CONSUMER_SECRET=your-live-consumer-secret
MPESA_SHORTCODE=your-live-shortcode
MPESA_PASSKEY=your-live-passkey
MPESA_PARTY_B=your-live-shortcode
MPESA_TRANSACTION_TYPE=CustomerPayBillOnline
MPESA_ACCOUNT_REFERENCE=FinalWhistle
MPESA_CALLBACK_URL=https://api.pool.example.com/api/mpesa/callback
```

Use `CustomerPayBillOnline` for a PayBill shortcode. If Safaricom provisions a different transaction type for your shortcode, use the value they provide. Live credentials, shortcode ownership, passkey, and production access must all be approved in Daraja before real collections will work.

## 4. Production backend

Upload the repository, then from `backend/` run:

```bash
composer install --no-dev --optimize-autoloader
cp .env.example .env
php artisan key:generate
php artisan migrate --seed --force
php artisan config:cache
php artisan route:cache
```

Production environment essentials:

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.pool.example.com
LOG_LEVEL=warning
FRONTEND_URL=https://pool.example.com
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=final_whistle
DB_USERNAME=final_whistle
DB_PASSWORD=replace-with-a-strong-password
POOL_ENTRY_FEE=100
POOL_BETTING_CLOSES_AT="2026-07-19T22:00:00+03:00"
POOL_COST_DEDUCTION=0
```

Point the backend virtual host/document root at `backend/public`, never at `backend/`. Ensure the web-server user can write to `backend/storage` and `backend/bootstrap/cache`. Keep `.env`, `vendor`, application source, and logs outside public web access.

`ADMIN_PASSWORD` is used by the seeder to create or update the organiser. After the first successful seed, you may remove that variable and run `php artisan config:cache` again; the hashed password remains in MySQL. To intentionally change it later, set a new value and run `php artisan db:seed --force`.

No queue worker or cron job is required for the implemented flow. M-Pesa confirmation arrives synchronously at the callback endpoint and is saved immediately.

## 5. Production frontend

Set the API URL before building because it is compiled into the static bundle:

```dotenv
NEXT_PUBLIC_API_BASE_URL=https://api.pool.example.com/api
```

Then build:

```bash
npm ci
npm run build
```

Upload the contents of `dist/assets/` to the frontend domain's public directory. The generated `dist/worker.js` is for the ChatGPT Sites runtime and is not needed on an ordinary static host. If your host supports a Node/Next deployment instead, it can run the normal Next build, but static hosting is sufficient for this app.

## 6. Go-live checklist

- Replace both finalist names/routes in the admin dashboard.
- Confirm the EAT cutoff time and KES 100 fee before accepting entries.
- Confirm the deduction policy; `0` distributes the entire confirmed pot.
- Test one sandbox success, one cancelled prompt, and one timeout.
- Verify a successful callback changes the receipt and public pot without admin intervention.
- Verify an amount or phone mismatch is rejected and appears for admin review.
- Confirm the callback URL returns HTTP 200 and is not behind basic authentication, a VPN, or a bot challenge.
- Enable automated MySQL backups and retain Laravel logs securely.
- Test the admin login, winner double-confirmation, payout totals, and manual payout receipts.
- Switch to live credentials only after Safaricom approves production access.
- Never mark a payment confirmed from the participant's browser; use callback confirmation or documented admin reconciliation after checking M-Pesa records.

## 7. Updating an existing deployment

```bash
git pull
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache
php artisan route:cache
npm ci
npm run build
```

Upload the new `dist/assets/` contents and keep the existing production `.env` and `APP_KEY`. Changing `APP_KEY` makes previously encrypted phone numbers unreadable.
