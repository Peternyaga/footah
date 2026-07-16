<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Some CGI/FastCGI hosts move Authorization during an internal rewrite.
// Normalize it before Laravel captures the request so Sanctum can read bearer tokens.
if (empty($_SERVER['HTTP_AUTHORIZATION'])) {
    $authorization = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? null;
    if (! $authorization && function_exists('getallheaders')) {
        $headers = getallheaders();
        $authorization = $headers['Authorization'] ?? $headers['authorization'] ?? null;
    }
    if (is_string($authorization) && $authorization !== '') {
        $_SERVER['HTTP_AUTHORIZATION'] = $authorization;
    }
}

if (file_exists($maintenance = __DIR__.'/current/backend/storage/framework/maintenance.php')) {
    require $maintenance;
}

require __DIR__.'/current/backend/vendor/autoload.php';

/** @var Application $app */
$app = require_once __DIR__.'/current/backend/bootstrap/app.php';

$app->handleRequest(Request::capture());
