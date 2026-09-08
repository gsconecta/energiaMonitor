<?php

putenv('ENERGIAMONITOR_TEST_MARIADB=1');
$arguments = array_slice($argv, 1);
// Unit incluye esquemas SQLite manuales; el contrato MariaDB usa migraciones reales.
$command = [PHP_BINARY, __DIR__.'/../../vendor/bin/pest', '--testsuite=Feature,Integration,Migrations', ...$arguments];
$process = proc_open($command, [STDIN, STDOUT, STDERR], $pipes);
exit(is_resource($process) ? proc_close($process) : 1);
