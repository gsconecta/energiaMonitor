<?php

function runTestingBootstrap(array $overrides): array
{
    $code = 'require '.var_export(dirname(__DIR__).'/bootstrap.php', true).'; echo json_encode([getenv("APP_ENV"), getenv("DB_CONNECTION"), getenv("DB_DATABASE"), getenv("DB_URL"), getenv("BROADCAST_CONNECTION")]);';
    $process = proc_open([PHP_BINARY, '-r', $code], [['pipe', 'r'], ['pipe', 'w'], ['pipe', 'w']], $pipes, null, array_merge(getenv(), $overrides));
    fclose($pipes[0]);
    $stdout = stream_get_contents($pipes[1]);
    $stderr = stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);

    return [proc_close($process), $stdout, $stderr];
}

it('ignora conexiones heredadas al ejecutar la suite SQLite', function () {
    [$status, $output] = runTestingBootstrap([
        'ENERGIAMONITOR_TEST_MARIADB' => '0', 'APP_ENV' => 'production',
        'DB_CONNECTION' => 'mysql', 'DB_DATABASE' => 'production',
        'DB_URL' => 'mysql://synthetic:synthetic@production.invalid/production',
        'BROADCAST_CONNECTION' => 'reverb',
    ]);
    expect($status)->toBe(0)->and(json_decode($output, true))->toBe(['testing', 'sqlite', ':memory:', '', 'null']);
});

it('rechaza bases o hosts ajenos al entorno de pruebas antes de arrancar Laravel', function (array $overrides) {
    [$status, , $error] = runTestingBootstrap(['ENERGIAMONITOR_TEST_MARIADB' => '1', ...$overrides]);
    expect($status)->not->toBe(0)->and($error)->toContain('requieren una BD');
})->with([
    [['TEST_DB_DATABASE' => 'production']],
    [['TEST_DB_DATABASE' => 'energiamonitor_test', 'TEST_DB_HOST' => 'production.invalid']],
]);
