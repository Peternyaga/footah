# Setup and deployment

## 1. What you need

- A frontend domain, for example `pool.example.com`
- A backend domain, for example `api.pool.example.com`
- HTTPS on both domains; Safaricom must reach the callback over public HTTPS
- PHP 8.3 or newer with `curl`, `ctype`, `fileinfo`, `mbstring`, `openssl`, `pdo_mysql`, `tokenizer`, and `xml`
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

For cPanel/static hosting, upload the contents of `dist/cpanel/` to the frontend domain's public directory, usually `public_html/`. Do not upload the parent `dist/` folder itself. The browser expects media at paths such as `/assets/videos/dna-performance-background.mp4` and `/assets/music/world-cup-2026-anthem-dna-ultralight.mp3`, and `dist/cpanel/` preserves that exact layout.

The build also creates `dist/assets/` for the ChatGPT Sites runtime. If you use that older manual flow, upload the contents of `dist/assets/`, not the parent `dist/` folder. The generated `dist/server/` files are not needed on ordinary cPanel static hosting.

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

## 8. GitHub Actions deployment

The repository includes `.github/workflows/deploy.yml`. It runs tests, builds both applications, uploads an immutable release over SSH, runs Laravel migrations and the idempotent seeder, switches the `current` symlink atomically, retains recent releases, and checks both public URLs. It runs on pushes to `main` and can also be started manually.

Create a GitHub Environment named `production` under **Settings → Environments**. Put the following non-sensitive values under **Environment variables**:

| Variable | Example | Required | Purpose |
| --- | --- | --- | --- |
| `DEPLOY_HOST` | `203.0.113.10` or `server.example.com` | Yes | SSH server hostname; do not include a scheme |
| `DEPLOY_USER` | `deploy` | Yes | Restricted SSH deployment user |
| `DEPLOY_PORT` | `22` | No | SSH port; defaults to `22` |
| `DEPLOY_PATH` | `/var/www/final-whistle` | Yes | Release root owned by the deployment user |
| `FRONTEND_URL` | `https://pool.example.com` | Yes | Public frontend URL and deployment health check |
| `NEXT_PUBLIC_API_BASE_URL` | `https://api.pool.example.com/api` | Yes | API URL compiled into the frontend |
| `NODE_VERSION` | `20` | No | GitHub build version; defaults to `20` |
| `PHP_VERSION` | `8.3` | No | GitHub build version; match the server PHP version |
| `SERVER_PHP_BINARY` | `/opt/cpanel/ea-php83/root/usr/bin/php` | No | Server PHP 8.3+ CLI path; common hosting paths are detected automatically |
| `KEEP_RELEASES` | `5` | No | Number of releases retained for manual rollback |

Add these under **Environment secrets**:

| Secret | Required | Purpose |
| --- | --- | --- |
| `DEPLOY_SSH_KEY` | Yes | Private key for the restricted deployment user; use a dedicated key without an interactive passphrase |
| `DEPLOY_KNOWN_HOSTS` | Yes | Verified OpenSSH `known_hosts` entry for the server, preventing host spoofing |
| `BACKEND_ENV` | Yes | The complete multiline production Laravel `.env` file |

`BACKEND_ENV` should contain at least:

```dotenv
APP_NAME="The Final Whistle API"
APP_ENV=production
APP_KEY=base64:generate-a-real-key
APP_DEBUG=false
APP_URL=https://api.pool.example.com
LOG_CHANNEL=stack
LOG_LEVEL=warning

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=final_whistle
DB_USERNAME=final_whistle
DB_PASSWORD=replace-with-the-production-database-password

CACHE_STORE=database
SESSION_DRIVER=database
QUEUE_CONNECTION=database

FRONTEND_URL=https://pool.example.com
POOL_EVENT_NAME="2026 World Cup Final"
POOL_ENTRY_FEE=100
POOL_BETTING_CLOSES_AT="2026-07-19T22:00:00+03:00"
POOL_COST_DEDUCTION=0

ADMIN_NAME="Pool Organiser"
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=replace-with-a-long-unique-password

MPESA_ENV=live
MPESA_CONSUMER_KEY=your-live-consumer-key
MPESA_CONSUMER_SECRET=your-live-consumer-secret
MPESA_SHORTCODE=your-live-shortcode
MPESA_PASSKEY=your-live-passkey
MPESA_PARTY_B=your-live-shortcode
MPESA_TRANSACTION_TYPE=CustomerPayBillOnline
MPESA_ACCOUNT_REFERENCE=FinalWhistle
MPESA_CALLBACK_URL=https://api.pool.example.com/api/mpesa/callback
MPESA_TIMEOUT=20
```

Generate `APP_KEY` once with `php artisan key:generate --show` and keep it unchanged across deployments and restores. Changing it prevents Laravel from decrypting stored phone numbers.

### One-time server preparation

The workflow assumes a Linux server with `bash`, `tar`, `find`, and PHP CLI 8.2+ plus the required extensions. As an administrator, prepare the release root and grant it to the restricted deployment user:

```bash
sudo mkdir -p /var/www/final-whistle/{releases,shared}
sudo chown -R deploy:www-data /var/www/final-whistle
sudo chmod -R 2775 /var/www/final-whistle
```

Configure the web server document roots as follows, then issue TLS certificates:

```text
pool.example.com      /var/www/final-whistle/current/frontend
api.pool.example.com  /var/www/final-whistle/current/backend/public
```

The deployment user must be able to write inside `DEPLOY_PATH`; the PHP web-server user must be able to write to `shared/storage`. The database must already exist and accept connections from the API server. The first deployment creates all tables and the initial admin account.

Create a dedicated SSH key locally, install only its public key in the deployment user's `~/.ssh/authorized_keys`, and save the private key as `DEPLOY_SSH_KEY`. Obtain the server's host-key line with `ssh-keyscan -p 22 server.example.com`, independently verify its fingerprint with your host/provider, and then save the verified line as `DEPLOY_KNOWN_HOSTS`.

For stronger release control, add required reviewers and restrict deployment branches to `main` on the GitHub `production` environment. GitHub only exposes that environment's variables and secrets to a job after its protection rules pass.
