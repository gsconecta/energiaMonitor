<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DispositivosController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\OrganizacionesController;
use App\Http\Controllers\SeleccionarContextoController;
use App\Http\Controllers\SitiosController;

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
    
    // Organizaciones
    Route::resource('organizaciones', OrganizacionesController::class)
        ->parameters(['organizaciones' => 'organizacion']);
    Route::post('/organizaciones/{organizacion}/usuarios', 
        [OrganizacionesController::class, 'agregarUsuario'])
        ->name('organizaciones.usuarios.store');
    Route::put('/organizaciones/{organizacion}/usuarios/{user}', 
        [OrganizacionesController::class, 'actualizarRolUsuario'])
        ->name('organizaciones.usuarios.update');
    Route::delete('/organizaciones/{organizacion}/usuarios/{user}', 
        [OrganizacionesController::class, 'eliminarUsuario'])
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
});

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
