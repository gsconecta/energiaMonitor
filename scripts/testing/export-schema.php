<?php

// Exporta solo metadatos; no incluye filas, credenciales, tamaños ni contadores de IDs.
require __DIR__.'/../../vendor/autoload.php';
require_once __DIR__.'/../../tests/Support/SchemaContract.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
if (! in_array(Illuminate\Support\Facades\DB::getDriverName(), ['mysql', 'mariadb'], true)) {
    throw new RuntimeException('El contrato de esquema requiere MySQL/MariaDB.');
}
$pdo = Illuminate\Support\Facades\DB::connection()->getPdo();
$pdo->exec('SET SESSION max_statement_time=5');
$pdo->exec('SET SESSION TRANSACTION READ ONLY');
$pdo->beginTransaction();
try {
    echo json_encode([
        'source' => $argv[1] ?? 'Exportación de solo metadatos; identificar revisión y fecha antes de versionar',
        'schema' => Tests\Support\SchemaContract::capture(),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR).PHP_EOL;
} finally {
    $pdo->rollBack();
}
