<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DispositivosController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\OrganizacionesController;
use App\Http\Controllers\SeleccionarContextoController;
use App\Http\Controllers\SitiosController;
use App\Http\Controllers\Admin\ControlPanelController;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/seleccionar-contexto', [SeleccionarContextoController::class, 'index'])
        ->name('seleccionar-contexto');
    Route::post('/seleccionar-contexto', [SeleccionarContextoController::class, 'store'])
        ->name('seleccionar-contexto.store');
    Route::delete('/seleccionar-contexto', [SeleccionarContextoController::class, 'destroy'])
        ->name('limpiar-contexto');
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/informes', [\App\Http\Controllers\InformesController::class, 'index'])->name('informes');

    // Organizaciones
    Route::resource('organizaciones', OrganizacionesController::class)
        ->parameters(['organizaciones' => 'organizacion']);
    Route::post(
        '/organizaciones/{organizacion}/usuarios',
        [OrganizacionesController::class, 'agregarUsuario']
    )
        ->name('organizaciones.usuarios.store');
    Route::put(
        '/organizaciones/{organizacion}/usuarios/{user}',
        [OrganizacionesController::class, 'actualizarRolUsuario']
    )
        ->name('organizaciones.usuarios.update');
    Route::delete(
        '/organizaciones/{organizacion}/usuarios/{user}',
        [OrganizacionesController::class, 'eliminarUsuario']
    )
        ->name('organizaciones.usuarios.destroy');

    // Sitios
    Route::resource('sitios', SitiosController::class);

    // Dispositivos
    Route::resource('dispositivos', DispositivosController::class);
    Route::post('/dispositivos/{dispositivo}/toggle-activo', [DispositivosController::class, 'toggleActivo'])
        ->name('dispositivos.toggle-activo');
    Route::post('/dispositivos/{dispositivo}/sincronizar', [DispositivosController::class, 'sincronizar'])
        ->name('dispositivos.sincronizar');

    // Búsqueda de lugares para selector de localización
    Route::get('/api/location/search', [LocationController::class, 'search'])
        ->name('location.search');

    // Panel de Control Global (Técnicos)
    Route::get('/admin/control-panel', [ControlPanelController::class, 'index'])
        ->name('admin.control-panel');
    Route::post('/admin/impersonate/{organizacion}/{sitio}', [ControlPanelController::class, 'impersonate'])
        ->name('admin.impersonate');

    // Credenciales Shelly (Globales)
    Route::resource('admin/credenciales-shelly', \App\Http\Controllers\Admin\CredencialShellyController::class)
        ->names('admin.credenciales-shelly')
        ->parameters(['credenciales-shelly' => 'credencial']);
});

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';

Route::get('/debug-shelly-prod', function () {
    $out = "=== DIAGNOSTICO DE CREDENCIALES (PRODUCCION) ===\n";
    $credenciales = \App\Models\CredencialShelly::all();

    foreach ($credenciales as $c) {
        $raw = $c->getAttributes()['api_key'] ?? 'null';
        $out .= "\nCredencial ID: {$c->id} | Nombre: {$c->nombre}\n";
        $out .= "  Raw length: " . strlen($raw) . "\n";

        try {
            $dec = decrypt($raw);
            $out .= "  [EXITO] Decrypted length: " . strlen($dec) . "\n";
        } catch (\Exception $e) {
            $out .= "  [ERROR] Al descifrar: " . $e->getMessage() . "\n";
            if (strlen($raw) < 200 && preg_match('/^[a-zA-Z0-9\-_]+$/', $raw)) {
                $out .= "  [INFO] Parece texto plano.\n";
            }
        }
    }

    $out .= "\n=== COMPARACION DIRECTA ORG VS CRED ===\n";
    $c1 = \App\Models\CredencialShelly::find(1);
    $org1 = \App\Models\Organizacion::find(1);

    if ($c1 && $org1) {
        $rawC1 = $c1->getAttributes()['api_key'] ?? '';
        $rawOrg1 = $org1->getAttributes()['shelly_api_key'] ?? '';

        $out .= "Raw C1:   " . substr($rawC1, 0, 30) . "... (len: " . strlen($rawC1) . ")\n";
        $out .= "Raw Org1: " . substr($rawOrg1, 0, 30) . "... (len: " . strlen($rawOrg1) . ")\n";

        $out .= "¿Son idénticos literal? " . ($rawC1 === $rawOrg1 ? 'SI' : 'NO') . "\n";

        // Ver las diferencias reales
        $c1Data = json_decode(base64_decode($rawC1), true);
        $org1Data = json_decode(base64_decode($rawOrg1), true);

        $out .= "\nEstructura C1:\n";
        $out .= "  IV: " . substr($c1Data['iv'] ?? '', 0, 10) . "...\n";
        $out .= "  Value: " . substr($c1Data['value'] ?? '', 0, 10) . "...\n";
        $out .= "  MAC: " . substr($c1Data['mac'] ?? '', 0, 10) . "...\n";

        $out .= "\nEstructura Org1:\n";
        $out .= "  IV: " . substr($org1Data['iv'] ?? '', 0, 10) . "...\n";
        $out .= "  Value: " . substr($org1Data['value'] ?? '', 0, 10) . "...\n";
        $out .= "  MAC: " . substr($org1Data['mac'] ?? '', 0, 10) . "...\n";
    }

    return response($out)->header('Content-Type', 'text/plain');
});
