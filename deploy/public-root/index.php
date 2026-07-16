<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

if (file_exists($maintenance = __DIR__.'/current/backend/storage/framework/maintenance.php')) {
    require $maintenance;
}

require __DIR__.'/current/backend/vendor/autoload.php';

/** @var Application $app */
$app = require_once __DIR__.'/current/backend/bootstrap/app.php';

$app->handleRequest(Request::capture());
