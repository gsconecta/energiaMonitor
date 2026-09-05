<?php

use App\Events\DashboardLecturaActualizada;
use App\Models\Dispositivo;
use App\Models\ModeloDispositivo;
use App\Models\Organizacion;
use App\Models\Sitio;
use App\Models\User;
use Database\Seeders\ModeloDispositivoSeeder;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Event;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Support\EsquemaDispositivos;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(function () {
    EsquemaDispositivos::crear();
    Event::fake([DashboardLecturaActualizada::class]);
    (new ModeloDispositivoSeeder)->run();
    $this->admin = User::factory()->create(['rol_global' => 'admin']);
    $org = Organizacion::create(['nombre' => 'Org', 'codigo' => 'org', 'activa' => true]);
    $this->sitio = Sitio::create(['organizacion_id' => $org->id, 'nombre' => 'Sitio', 'codigo' => 'sitio', 'activa' => true]);
});

afterEach(fn () => EsquemaDispositivos::eliminar());

function idModelo(string $codigo): int
{
    return ModeloDispositivo::where('codigo', $codigo)->value('id');
}

function payloadDispositivo(TestCase $test, array $cambios = []): array
{
    return array_merge([
        'sitio_id' => $test->sitio->id,
        'device_id' => 'dev-1',
        'nombre' => 'Cuadro',
        'modelo_dispositivo_id' => idModelo('shelly-pro-3em'),
        'modo_canales' => 'circuitos',
        'num_fases' => null,
        'tipo_canal_1' => 'red_electrica',
        'tipo_canal_2' => null,
        'tipo_canal_3' => null,
        'invertir_sentido_canal_1' => false,
        'activo' => true,
        'conexion' => [],
    ], $cambios);
}

it('exige un modelo activo al crear', function () {
    $this->actingAs($this->admin)
        ->post('/dispositivos', payloadDispositivo($this, ['modelo_dispositivo_id' => null]))
        ->assertSessionHasErrors('modelo_dispositivo_id');

    ModeloDispositivo::where('codigo', 'shelly-3em')->update(['activo' => false]);

    $this->actingAs($this->admin)
        ->post('/dispositivos', payloadDispositivo($this, ['modelo_dispositivo_id' => idModelo('shelly-3em')]))
        ->assertSessionHasErrors('modelo_dispositivo_id');
});

it('rechaza canales por encima de los del modelo', function () {
    $this->actingAs($this->admin)
        ->post('/dispositivos', payloadDispositivo($this, [
            'modelo_dispositivo_id' => idModelo('shelly-pro-em-50'),
            'tipo_canal_3' => 'fotovoltaica',
        ]))
        ->assertSessionHasErrors('tipo_canal_3');
});

it('exige los campos de conexión del driver y los guarda en configuracion.conexion', function () {
    $this->actingAs($this->admin)
        ->post('/dispositivos', payloadDispositivo($this, [
            'modelo_dispositivo_id' => idModelo('circutor-cvm-e3-mini-mc-wieth'),
            'modo_canales' => 'fases',
        ]))
        ->assertSessionHasErrors('conexion.host');

    $this->actingAs($this->admin)
        ->post('/dispositivos', payloadDispositivo($this, [
            'modelo_dispositivo_id' => idModelo('circutor-cvm-e3-mini-mc-wieth'),
            'modo_canales' => 'fases',
            'tipo_canal_1' => 'red_electrica',
            'invertir_sentido_canal_1' => true,
            'conexion' => ['host' => '192.168.1.50', 'port' => 502, 'unit_id' => 1],
        ]))
        ->assertRedirect(route('dispositivos.index'));

    $dispositivo = Dispositivo::where('device_id', 'dev-1')->first();

    expect($dispositivo->conexion())->toBe(['host' => '192.168.1.50', 'port' => 502, 'unit_id' => 1])
        ->and($dispositivo->num_fases)->toBe(3)
        ->and($dispositivo->tipo_canal_3)->toBe('red_electrica')
        ->and($dispositivo->invertir_sentido_canal_3)->toBeTrue()
        ->and($dispositivo->modoCanales()->value)->toBe('fases');
});

it('solo permite cambiar el modo de canales si el modelo es configurable', function () {
    $this->actingAs($this->admin)
        ->post('/dispositivos', payloadDispositivo($this, ['modelo_dispositivo_id' => idModelo('shelly-pro-em-50'), 'modo_canales' => 'fases']))
        ->assertSessionHasErrors('modo_canales');

    $this->actingAs($this->admin)
        ->post('/dispositivos', payloadDispositivo($this, ['modelo_dispositivo_id' => idModelo('shelly-pro-3em'), 'modo_canales' => 'circuitos']))
        ->assertRedirect(route('dispositivos.index'));
});

it('obliga a asignar modelo al editar un dispositivo de legado', function () {
    $legado = Dispositivo::create(['sitio_id' => $this->sitio->id, 'device_id' => 'viejo', 'nombre' => 'Viejo']);

    $this->actingAs($this->admin)
        ->put("/dispositivos/{$legado->id}", payloadDispositivo($this, ['device_id' => 'viejo', 'modelo_dispositivo_id' => null]))
        ->assertSessionHasErrors('modelo_dispositivo_id');

    $this->actingAs($this->admin)
        ->put("/dispositivos/{$legado->id}", payloadDispositivo($this, ['device_id' => 'viejo']))
        ->assertRedirect(route('dispositivos.index'));

    expect($legado->fresh()->modeloDispositivo->codigo)->toBe('shelly-pro-3em');
});

it('el listado expone los modelos y el nombre del modelo de cada dispositivo', function () {
    Dispositivo::create(['sitio_id' => $this->sitio->id, 'device_id' => 'a', 'nombre' => 'A', 'modelo_dispositivo_id' => idModelo('shelly-pro-3em')]);

    $this->actingAs($this->admin)->get('/dispositivos')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Dispositivos/Index')
            ->has('modelos', 5)
            ->has('modelos.0', fn (Assert $m) => $m->hasAll(['id', 'fabricante', 'nombre', 'activo', 'driver', 'driver_label', 'driver_disponible', 'num_canales', 'modo_canales_por_defecto', 'modo_canales_configurable', 'campos_conexion']))
            ->where('dispositivos.0.modelo', 'Shelly Pro 3EM')
            ->where('dispositivos.0.driver_disponible', true)
            ->where('dispositivos.0.modo_canales', 'circuitos'));
});

it('la ficha resume la conexión y avisa si no hay lector', function () {
    $cvm = Dispositivo::create([
        'sitio_id' => $this->sitio->id, 'device_id' => 'cvm', 'nombre' => 'CVM',
        'modelo_dispositivo_id' => idModelo('circutor-cvm-e3-mini-mc-wieth'),
        'configuracion' => ['conexion' => ['host' => '10.0.0.5', 'port' => 502, 'unit_id' => 7]],
    ]);

    $this->actingAs($this->admin)->get("/dispositivos/{$cvm->id}")
        ->assertInertia(fn (Assert $page) => $page
            ->where('dispositivo.driver_label', 'Modbus TCP')
            ->where('dispositivo.driver_disponible', false)
            ->where('dispositivo.conexion_resumen', '10.0.0.5:502 · unidad 7'));
});

it('sincronizar muestra el motivo cuando el comando falla', function () {
    $cvm = Dispositivo::create(['sitio_id' => $this->sitio->id, 'device_id' => 'cvm', 'nombre' => 'CVM', 'modelo_dispositivo_id' => idModelo('circutor-cvm-e3-mini-mc-wieth')]);

    Artisan::shouldReceive('call')->once()->with('lecturas:obtener', ['--dispositivo' => $cvm->id])->andReturn(1);
    Artisan::shouldReceive('output')->once()->andReturn("Omitido: el modelo usa Modbus TCP, que aún no tiene lector disponible\n");

    $this->actingAs($this->admin)
        ->from('/dispositivos')
        ->post("/dispositivos/{$cvm->id}/sincronizar")
        ->assertRedirect('/dispositivos')
        ->assertSessionHas('error', fn (string $mensaje) => str_contains($mensaje, 'no tiene lector'));
});
