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

    $out .= "\n=== ORGANIZACIONES ===\n";
    $orgs = \App\Models\Organizacion::whereNotNull('credencial_shelly_id')->orWhereNotNull('shelly_api_key')->get();
    foreach ($orgs as $org) {
        $rawOld = $org->getAttributes()['shelly_api_key'] ?? 'null';
        $out .= "Org ID: {$org->id} | Nombre: {$org->nombre} | Old Raw len: " . strlen($rawOld) . "\n";
        try {
            $dec = decrypt($rawOld);
            $out .= "  [EXITO Old Key] Decrypted: " . strlen($dec) . "\n";
        } catch (\Exception $e) {
            $out .= "  [ERROR Old Key] " . $e->getMessage() . "\n";
        }
    }

    return response($out)->header('Content-Type', 'text/plain');
});
