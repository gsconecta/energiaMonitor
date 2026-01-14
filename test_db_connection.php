<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

try {
    $connection = DB::connection()->getPdo();
    echo "✓ Conexión exitosa a la base de datos\n";
    echo "Host: " . config('database.connections.mysql.host') . "\n";
    echo "Database: " . config('database.connections.mysql.database') . "\n";
    echo "Username: " . config('database.connections.mysql.username') . "\n";
} catch (Exception $e) {
    echo "✗ Error de conexión:\n";
    echo $e->getMessage() . "\n";
    echo "\nPosibles soluciones:\n";
    echo "1. Verificar que las credenciales en .env sean correctas\n";
    echo "2. Verificar que el usuario MySQL tenga permisos desde tu IP (192.168.200.14)\n";
    echo "3. Verificar que MySQL permita conexiones remotas\n";
}





