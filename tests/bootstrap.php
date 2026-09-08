<?php

// No cargar .env ni conexiones/cache de la aplicación al ejecutar pruebas.
$integration = getenv('ENERGIAMONITOR_TEST_MARIADB') === '1';
$database = getenv('TEST_DB_DATABASE') ?: 'energiamonitor_test';
$host = getenv('TEST_DB_HOST') ?: '127.0.0.1';
if ($integration && (! preg_match('/^energiamonitor_test(?:_[a-z0-9]+)*$/', $database)
    || ! in_array($host, ['127.0.0.1', 'localhost', '::1'], true))) {
    throw new RuntimeException('Las pruebas MariaDB requieren una BD energiamonitor_test[_...] en localhost.');
}

$values = [
    'APP_ENV' => 'testing',
    'APP_KEY' => 'base64:'.base64_encode(random_bytes(32)),
    'APP_URL' => 'http://localhost',
    'APP_CONFIG_CACHE' => __DIR__.'/../storage/framework/testing-config-unused.php',
    'APP_ROUTES_CACHE' => __DIR__.'/../storage/framework/testing-routes-unused.php',
    'DB_URL' => '',
    'DB_FOREIGN_KEYS' => 'true',
    'DB_CONNECTION' => $integration ? 'mariadb' : 'sqlite',
    'DB_DATABASE' => $integration ? $database : ':memory:',
    'DB_HOST' => $host,
    'DB_PORT' => getenv('TEST_DB_PORT') ?: '3307',
    'DB_SOCKET' => $integration ? (getenv('TEST_DB_SOCKET') ?: '') : '',
    'DB_USERNAME' => getenv('TEST_DB_USERNAME') ?: 'energiamonitor_test',
    'DB_PASSWORD' => getenv('TEST_DB_PASSWORD') ?: '',
    'CACHE_STORE' => 'array',
    'SESSION_DRIVER' => 'array',
    'QUEUE_CONNECTION' => 'sync',
    'BROADCAST_CONNECTION' => 'null',
    'MAIL_MAILER' => 'array',
    'BCRYPT_ROUNDS' => '4',
];
foreach ($values as $key => $value) {
    putenv("{$key}={$value}");
    $_ENV[$key] = $_SERVER[$key] = $value;
}
foreach (['APP_CONFIG_CACHE', 'APP_ROUTES_CACHE'] as $key) {
    if (file_exists($values[$key])) {
        throw new RuntimeException('Elimine la caché de pruebas antes de ejecutar la suite.');
    }
}
require __DIR__.'/../vendor/autoload.php';
