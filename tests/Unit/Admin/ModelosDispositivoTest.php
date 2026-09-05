<?php

use App\Models\Dispositivo;
use App\Models\ModeloDispositivo;
use App\Models\Organizacion;
use App\Models\Sitio;
use App\Models\User;
use Database\Seeders\ModeloDispositivoSeeder;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Support\EsquemaDispositivos;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(function () {
    EsquemaDispositivos::crear();
    (new ModeloDispositivoSeeder)->run();
    $this->admin = User::factory()->create(['rol_global' => 'admin']);
});

afterEach(fn () => EsquemaDispositivos::eliminar());

function modeloValido(array $cambios = []): array
{
    return array_merge([
        'codigo' => 'shelly-em-gen1',
        'fabricante' => 'Shelly',
        'familia' => 'EM Gen1',
        'nombre' => 'Shelly EM',
        'driver' => 'shelly_cloud',
        'num_canales' => 2,
        'modo_canales_por_defecto' => 'circuitos',
        'modo_canales_configurable' => false,
        'magnitudes' => ['potencia_activa', 'tension'],
        'activo' => true,
        'notas' => null,
    ], $cambios);
}

function dispositivoConModelo(ModeloDispositivo $modelo, array $extra = []): Dispositivo
{
    $org = Organizacion::create(['nombre' => 'Org', 'activa' => true]);
    $sitio = Sitio::create(['organizacion_id' => $org->id, 'nombre' => 'Sitio', 'activa' => true]);

    return Dispositivo::create(array_merge([
        'sitio_id' => $sitio->id,
        'modelo_dispositivo_id' => $modelo->id,
        'device_id' => 'dev-'.uniqid(),
        'nombre' => 'Equipo',
    ], $extra));
}

it('muestra el catálogo a técnicos y administradores', function () {
    $tecnico = User::factory()->create(['rol_global' => 'tecnico']);

    $this->actingAs($tecnico)->get('/admin/modelos-dispositivo')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/ModelosDispositivo/Index')
            ->has('modelos', 5)
            ->has('modelos.0', fn (Assert $modelo) => $modelo
                ->hasAll(['id', 'codigo', 'fabricante', 'familia', 'nombre', 'driver', 'driver_label', 'driver_disponible',
                    'num_canales', 'modo_canales_por_defecto', 'modo_canales_configurable', 'magnitudes', 'activo', 'notas', 'dispositivos_count'])));
});

it('bloquea el catálogo a los clientes', function () {
    $cliente = User::factory()->create(['rol_global' => 'cliente']);

    $this->actingAs($cliente)->get('/admin/modelos-dispositivo')->assertForbidden();
    $this->actingAs($cliente)->post('/admin/modelos-dispositivo', modeloValido())->assertForbidden();
});

it('crea un modelo válido', function () {
    $this->actingAs($this->admin)
        ->post('/admin/modelos-dispositivo', modeloValido())
        ->assertRedirect(route('admin.modelos-dispositivo.index'));

    $modelo = ModeloDispositivo::where('codigo', 'shelly-em-gen1')->first();

    expect($modelo)->not->toBeNull()
        ->and($modelo->num_canales)->toBe(2)
        ->and($modelo->magnitudes)->toBe(['potencia_activa', 'tension']);
});

it('rechaza driver desconocido, canales fuera de rango y código repetido', function () {
    $this->actingAs($this->admin)
        ->from('/admin/modelos-dispositivo/create')
        ->post('/admin/modelos-dispositivo', modeloValido(['driver' => 'zigbee', 'num_canales' => 4, 'codigo' => 'shelly-3em']))
        ->assertRedirect('/admin/modelos-dispositivo/create')
        ->assertSessionHasErrors(['driver', 'num_canales', 'codigo']);
});

it('no permite bajar los canales por debajo de los configurados en sus dispositivos', function () {
    $modelo = ModeloDispositivo::where('codigo', 'shelly-pro-3em')->first();
    dispositivoConModelo($modelo, ['tipo_canal_3' => 'red_electrica', 'nombre' => 'Cuadro taller']);

    $this->actingAs($this->admin)
        ->from("/admin/modelos-dispositivo/{$modelo->id}/edit")
        ->put("/admin/modelos-dispositivo/{$modelo->id}", modeloValido(['num_canales' => 2, 'driver' => 'shelly_cloud']))
        ->assertSessionHasErrors('num_canales');

    expect($modelo->fresh()->num_canales)->toBe(3);
    expect(session('errors')->first('num_canales'))->toContain('Cuadro taller');
});

it('no permite cambiar el driver de un modelo con dispositivos', function () {
    $modelo = ModeloDispositivo::where('codigo', 'shelly-pro-3em')->first();
    dispositivoConModelo($modelo);

    $this->actingAs($this->admin)
        ->put("/admin/modelos-dispositivo/{$modelo->id}", modeloValido(['num_canales' => 3, 'driver' => 'modbus_tcp']))
        ->assertSessionHasErrors('driver');

    expect($modelo->fresh()->driver->value)->toBe('shelly_cloud');
});

it('en edición conserva el código y permite desactivar aunque tenga dispositivos', function () {
    $modelo = ModeloDispositivo::where('codigo', 'shelly-pro-3em')->first();
    dispositivoConModelo($modelo);

    $this->actingAs($this->admin)
        ->put("/admin/modelos-dispositivo/{$modelo->id}", modeloValido(['codigo' => 'otro-codigo', 'num_canales' => 3, 'driver' => 'shelly_cloud', 'activo' => false]))
        ->assertRedirect(route('admin.modelos-dispositivo.index'));

    expect($modelo->fresh()->codigo)->toBe('shelly-pro-3em')
        ->and($modelo->fresh()->activo)->toBeFalse();
});

it('no elimina un modelo con dispositivos y sí uno sin ellos', function () {
    $conUso = ModeloDispositivo::where('codigo', 'shelly-3em')->first();
    dispositivoConModelo($conUso);
    $sinUso = ModeloDispositivo::where('codigo', 'circutor-cvm-e3-mini-mc-wieth')->first();

    $this->actingAs($this->admin)->delete("/admin/modelos-dispositivo/{$conUso->id}")->assertSessionHasErrors('error');
    $this->actingAs($this->admin)->delete("/admin/modelos-dispositivo/{$sinUso->id}")->assertRedirect(route('admin.modelos-dispositivo.index'));

    expect(ModeloDispositivo::find($conUso->id))->not->toBeNull()
        ->and(ModeloDispositivo::find($sinUso->id))->toBeNull();
});

it('las páginas de alta y edición reciben las opciones de los enums', function () {
    $modelo = ModeloDispositivo::where('codigo', 'shelly-3em')->first();

    $this->actingAs($this->admin)->get('/admin/modelos-dispositivo/create')
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/ModelosDispositivo/Create')
            ->has('opciones.drivers', 3)
            ->has('opciones.modos', 2)
            ->has('opciones.magnitudes', 12));

    $this->actingAs($this->admin)->get("/admin/modelos-dispositivo/{$modelo->id}/edit")
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/ModelosDispositivo/Edit')
            ->where('modelo.codigo', 'shelly-3em')
            ->has('opciones.drivers', 3));
});
