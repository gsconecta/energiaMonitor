<?php

use App\Http\Controllers\Admin\ControlPanelController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DispositivosController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\OrganizacionesController;
use App\Http\Controllers\SeleccionarContextoController;
use App\Http\Controllers\SitiosController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/seleccionar-contexto', [SeleccionarContextoController::class, 'index'])
        ->name('seleccionar-contexto');
    Route::post('/seleccionar-contexto', [SeleccionarContextoController::class, 'store'])
        ->name('seleccionar-contexto.store');
    Route::post('/seleccionar-contexto/entrar-panel', [SeleccionarContextoController::class, 'enterPanel'])
        ->name('seleccionar-contexto.enter-panel');
    Route::delete('/seleccionar-contexto', [SeleccionarContextoController::class, 'destroy'])
        ->name('limpiar-contexto');
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/informes', [\App\Http\Controllers\InformesController::class, 'index'])->name('informes');
    Route::get('/informes/exportar', [\App\Http\Controllers\InformesController::class, 'export'])->name('informes.export');

    Route::resource('organizaciones', OrganizacionesController::class)
        ->parameters(['organizaciones' => 'organizacion']);
    Route::post(
        '/organizaciones/{organizacion}/usuarios',
        [OrganizacionesController::class, 'agregarUsuario']
    )->name('organizaciones.usuarios.store');
    Route::put(
        '/organizaciones/{organizacion}/usuarios/{user}',
        [OrganizacionesController::class, 'actualizarRolUsuario']
    )->name('organizaciones.usuarios.update');
    Route::delete(
        '/organizaciones/{organizacion}/usuarios/{user}',
        [OrganizacionesController::class, 'eliminarUsuario']
    )->name('organizaciones.usuarios.destroy');

    Route::resource('sitios', SitiosController::class);

    Route::resource('dispositivos', DispositivosController::class);
    Route::post('/dispositivos/{dispositivo}/toggle-activo', [DispositivosController::class, 'toggleActivo'])
        ->name('dispositivos.toggle-activo');
    Route::post('/dispositivos/{dispositivo}/sincronizar', [DispositivosController::class, 'sincronizar'])
        ->name('dispositivos.sincronizar');

    Route::get('/api/location/search', [LocationController::class, 'search'])
        ->name('location.search');
    Route::get('/api/location/aemet-code', [LocationController::class, 'aemetCode'])
        ->name('location.aemet-code');

    Route::get('/admin/control-panel', [ControlPanelController::class, 'index'])
        ->name('admin.control-panel');
    Route::post('/admin/impersonate/{organizacion}/{sitio}', [ControlPanelController::class, 'impersonate'])
        ->name('admin.impersonate');
    Route::post('/admin/alertas-umbral/resolver-multiple', [ControlPanelController::class, 'resolverAlertasUmbral'])
        ->name('admin.alertas-umbral.resolver-multiple');
    Route::post('/admin/alertas-umbral/{alertaUmbral}/resolver', [ControlPanelController::class, 'resolverAlertaUmbral'])
        ->name('admin.alertas-umbral.resolver');

    Route::resource('admin/credenciales-shelly', \App\Http\Controllers\Admin\CredencialShellyController::class)
        ->names('admin.credenciales-shelly')
        ->parameters(['credenciales-shelly' => 'credencial']);

    Route::get('/admin/usuarios', [\App\Http\Controllers\Admin\UserAdminController::class, 'index'])
        ->name('admin.usuarios.index');
    Route::put('/admin/usuarios/{user}', [\App\Http\Controllers\Admin\UserAdminController::class, 'update'])
        ->name('admin.usuarios.update');
    Route::delete('/admin/usuarios/{user}', [\App\Http\Controllers\Admin\UserAdminController::class, 'destroy'])
        ->name('admin.usuarios.destroy');
    Route::post('/admin/usuarios/{user}/organizaciones', [\App\Http\Controllers\Admin\UserAdminController::class, 'addOrganizacion'])
        ->name('admin.usuarios.add-org');
    Route::put('/admin/usuarios/{user}/organizaciones/{organizacion}', [\App\Http\Controllers\Admin\UserAdminController::class, 'updateOrganizacionRol'])
        ->name('admin.usuarios.update-org-rol');
    Route::delete('/admin/usuarios/{user}/organizaciones/{organizacion}', [\App\Http\Controllers\Admin\UserAdminController::class, 'removeOrganizacion'])
        ->name('admin.usuarios.remove-org');

    Route::get('/admin/umbrales', [\App\Http\Controllers\Admin\UmbralFuncionamientoController::class, 'index'])
        ->name('admin.umbrales.index');
    Route::post('/admin/umbrales', [\App\Http\Controllers\Admin\UmbralFuncionamientoController::class, 'store'])
        ->name('admin.umbrales.store');
    Route::put('/admin/umbrales/{umbral}', [\App\Http\Controllers\Admin\UmbralFuncionamientoController::class, 'update'])
        ->name('admin.umbrales.update');
    Route::delete('/admin/umbrales/{umbral}', [\App\Http\Controllers\Admin\UmbralFuncionamientoController::class, 'destroy'])
        ->name('admin.umbrales.destroy');
    Route::post('/admin/umbrales/{umbral}/toggle-activo', [\App\Http\Controllers\Admin\UmbralFuncionamientoController::class, 'toggleActivo'])
        ->name('admin.umbrales.toggle-activo');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
