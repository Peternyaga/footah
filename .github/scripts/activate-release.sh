#!/usr/bin/env bash

set -euo pipefail

: "${DEPLOY_PATH:?DEPLOY_PATH is required}"
: "${RELEASE_ID:?RELEASE_ID is required}"
: "${KEEP_RELEASES:?KEEP_RELEASES is required}"
SERVER_PHP_BINARY="${SERVER_PHP_BINARY:-}"

if [[ ! "$DEPLOY_PATH" =~ ^/[A-Za-z0-9._/-]+$ ]] || [[ "$DEPLOY_PATH" == "/" ]]; then
  echo "Refusing unsafe DEPLOY_PATH: $DEPLOY_PATH" >&2
  exit 1
fi
if [[ ! "$RELEASE_ID" =~ ^[A-Za-z0-9._-]+$ ]]; then
  echo "Refusing unsafe RELEASE_ID: $RELEASE_ID" >&2
  exit 1
fi
if [[ ! "$KEEP_RELEASES" =~ ^[1-9][0-9]*$ ]]; then
  echo "KEEP_RELEASES must be a positive integer." >&2
  exit 1
fi
if [[ -n "$SERVER_PHP_BINARY" ]] && [[ ! "$SERVER_PHP_BINARY" =~ ^/[A-Za-z0-9._/-]+$ ]]; then
  echo "Refusing unsafe SERVER_PHP_BINARY: $SERVER_PHP_BINARY" >&2
  exit 1
fi

PHP_CANDIDATES=()
if [[ -n "$SERVER_PHP_BINARY" ]]; then
  PHP_CANDIDATES+=("$SERVER_PHP_BINARY")
fi
PHP_CANDIDATES+=(
  "/opt/cpanel/ea-php85/root/usr/bin/php"
  "/opt/cpanel/ea-php84/root/usr/bin/php"
  "/opt/cpanel/ea-php83/root/usr/bin/php"
  "/opt/alt/php85/usr/bin/php"
  "/opt/alt/php84/usr/bin/php"
  "/opt/alt/php83/usr/bin/php"
  "/opt/plesk/php/8.5/bin/php"
  "/opt/plesk/php/8.4/bin/php"
  "/opt/plesk/php/8.3/bin/php"
  "php85"
  "php84"
  "php83"
  "php"
)

PHP_BIN=""
for candidate in "${PHP_CANDIDATES[@]}"; do
  if command -v "$candidate" >/dev/null 2>&1; then
    version_id="$("$candidate" -r 'echo PHP_VERSION_ID;' 2>/dev/null || true)"
    if [[ "$version_id" =~ ^[0-9]+$ ]] && (( version_id >= 80300 )); then
      PHP_BIN="$candidate"
      break
    fi
  fi
done

if [[ -z "$PHP_BIN" ]]; then
  echo "No PHP 8.3+ CLI binary was found. Set the GitHub variable SERVER_PHP_BINARY to the hosting PHP 8.3 executable." >&2
  exit 1
fi
echo "Using $PHP_BIN ($("$PHP_BIN" -r 'echo PHP_VERSION;'))"

RELEASES_DIR="$DEPLOY_PATH/releases"
SHARED_DIR="$DEPLOY_PATH/shared"
RELEASE_DIR="$RELEASES_DIR/$RELEASE_ID"
ARCHIVE="/tmp/final-whistle-$RELEASE_ID.tar.gz"
CURRENT_LINK="$DEPLOY_PATH/current"
NEXT_LINK="$DEPLOY_PATH/.current-$RELEASE_ID"

test -f "$ARCHIVE" || { echo "Release archive was not uploaded: $ARCHIVE" >&2; exit 1; }
test -f "$SHARED_DIR/backend.env" || { echo "Shared backend.env is missing." >&2; exit 1; }
test ! -e "$RELEASE_DIR" || { echo "Release already exists: $RELEASE_DIR" >&2; exit 1; }

mkdir -p "$RELEASES_DIR" "$SHARED_DIR"
mkdir "$RELEASE_DIR"
tar -xzf "$ARCHIVE" -C "$RELEASE_DIR"
rm -f "$ARCHIVE"

test -f "$RELEASE_DIR/frontend/index.html" || { echo "Frontend package is incomplete." >&2; exit 1; }
test -f "$RELEASE_DIR/backend/artisan" || { echo "Backend package is incomplete." >&2; exit 1; }
test -f "$RELEASE_DIR/backend/vendor/autoload.php" || { echo "Composer dependencies are missing." >&2; exit 1; }

ln -s "$SHARED_DIR/backend.env" "$RELEASE_DIR/backend/.env"

if [ ! -d "$SHARED_DIR/storage" ]; then
  mv "$RELEASE_DIR/backend/storage" "$SHARED_DIR/storage"
else
  rm -rf -- "$RELEASE_DIR/backend/storage"
fi
ln -s "$SHARED_DIR/storage" "$RELEASE_DIR/backend/storage"

mkdir -p "$RELEASE_DIR/backend/bootstrap/cache"
chmod -R ug+rwX "$SHARED_DIR/storage" "$RELEASE_DIR/backend/bootstrap/cache"

cd "$RELEASE_DIR/backend"
"$PHP_BIN" artisan optimize:clear
"$PHP_BIN" artisan migrate --seed --force
"$PHP_BIN" artisan config:cache
"$PHP_BIN" artisan route:cache

ln -s "$RELEASE_DIR" "$NEXT_LINK"
mv -Tf "$NEXT_LINK" "$CURRENT_LINK"

mapfile -t RELEASES < <(
  find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' \
    | sort -rn \
    | cut -d' ' -f2-
)

for ((index=KEEP_RELEASES; index<${#RELEASES[@]}; index++)); do
  old_release="${RELEASES[$index]}"
  if [[ "$old_release" == "$RELEASES_DIR/"* ]] && [[ "$old_release" != "$RELEASE_DIR" ]]; then
    rm -rf -- "$old_release"
  fi
done

echo "Activated release $RELEASE_ID"
