<?php

use App\Enums\DriverDispositivo;
use App\Enums\ModoCanales;
use App\Models\Dispositivo;
use App\Models\ModeloDispositivo;
use App\Models\Organizacion;
use App\Models\Sitio;
use App\Services\Dispositivos\AsignadorModeloLegado;
use Database\Seeders\ModeloDispositivoSeeder;
use Tests\Support\EsquemaDispositivos;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(fn () => EsquemaDispositivos::crear());
afterEach(fn () => EsquemaDispositivos::eliminar());

function sitioDePrueba(): Sitio
{
    $org = Organizacion::create(['nombre' => 'Org', 'activa' => true]);

    return Sitio::create(['organizacion_id' => $org->id, 'nombre' => 'Sitio', 'activa' => true]);
}

it('siembra el catálogo inicial de forma idempotente', function () {
    (new ModeloDispositivoSeeder)->run();
    (new ModeloDispositivoSeeder)->run();

    expect(ModeloDispositivo::count())->toBe(5)
        ->and(ModeloDispositivo::pluck('codigo')->sort()->values()->all())->toBe([
            'circutor-cvm-e3-mini-mc-wieth', 'circutor-cvm-mini-mc-itf-bacnet-c2',
            'shelly-3em', 'shelly-pro-3em', 'shelly-pro-em-50',
        ]);

    $pro3em = ModeloDispositivo::where('codigo', 'shelly-pro-3em')->first();
    $cvm = ModeloDispositivo::where('codigo', 'circutor-cvm-mini-mc-itf-bacnet-c2')->first();

    expect($pro3em->driver)->toBe(DriverDispositivo::ShellyCloud)
        ->and($pro3em->num_canales)->toBe(3)
        ->and($pro3em->modo_canales_por_defecto)->toBe(ModoCanales::Fases)
        ->and($pro3em->modo_canales_configurable)->toBeTrue()
        ->and($pro3em->magnitudes)->toContain('frecuencia')
        ->and($cvm->driver)->toBe(DriverDispositivo::BacnetIp)
        ->and($cvm->driver->disponible())->toBeFalse()
        ->and($cvm->modo_canales_configurable)->toBeFalse();
});

it('un dispositivo sin modelo se lee con Shelly Cloud y sin conexión extra', function () {
    $dispositivo = Dispositivo::create(['sitio_id' => sitioDePrueba()->id, 'device_id' => 'd1', 'nombre' => 'Legado']);

    expect($dispositivo->driver())->toBe(DriverDispositivo::ShellyCloud)
        ->and($dispositivo->conexion())->toBe([])
        ->and($dispositivo->modoCanales())->toBe(ModoCanales::Circuitos)
        ->and($dispositivo->nombreModelo())->toBeNull();
});

it('un dispositivo con modelo expone driver, conexión y nombre del modelo', function () {
    (new ModeloDispositivoSeeder)->run();
    $modelo = ModeloDispositivo::where('codigo', 'circutor-cvm-e3-mini-mc-wieth')->first();

    $dispositivo = Dispositivo::create([
        'sitio_id' => sitioDePrueba()->id,
        'modelo_dispositivo_id' => $modelo->id,
        'device_id' => 'cvm-1',
        'nombre' => 'Cuadro general',
        'modo_canales' => ModoCanales::Fases,
        'configuracion' => ['conexion' => ['host' => '192.168.1.50', 'port' => 502, 'unit_id' => 1]],
    ]);

    expect($dispositivo->driver())->toBe(DriverDispositivo::ModbusTcp)
        ->and($dispositivo->conexion())->toBe(['host' => '192.168.1.50', 'port' => 502, 'unit_id' => 1])
        ->and($dispositivo->nombreModelo())->toBe('Circutor CVM-E3-MINI-MC-WiEth')
        ->and($dispositivo->getNombreCanal(2))->toBe('L2');
});

it('un modelo no es borrable mientras lo use un dispositivo, aunque esté eliminado', function () {
    (new ModeloDispositivoSeeder)->run();
    $modelo = ModeloDispositivo::where('codigo', 'shelly-3em')->first();

    expect($modelo->esBorrable())->toBeTrue();

    $dispositivo = Dispositivo::create(['sitio_id' => sitioDePrueba()->id, 'modelo_dispositivo_id' => $modelo->id, 'device_id' => 'd2', 'nombre' => 'X']);
    $dispositivo->delete();

    expect($modelo->fresh()->esBorrable())->toBeFalse();
});

it('mapea el texto de modelo antiguo a un código del catálogo', function (?string $texto, ?string $codigo) {
    expect((new AsignadorModeloLegado)->codigoPara($texto))->toBe($codigo);
})->with([
    ['SHEM-3', 'shelly-3em'],
    ['Shelly EM3', 'shelly-3em'],
    ['  shelly em3 ', 'shelly-3em'],
    ['Shelly Pro 3EM', 'shelly-pro-3em'],
    ['Shelly Pro EM 50', 'shelly-pro-em-50'],
    ['Shelly Plug S', null],
    ['', null],
    [null, null],
]);

it('asigna modelo a los dispositivos de legado y deja el resto sin modelo', function () {
    (new ModeloDispositivoSeeder)->run();
    $sitio = sitioDePrueba();
    $conocido = Dispositivo::create(['sitio_id' => $sitio->id, 'device_id' => 'a', 'nombre' => 'A']);
    $desconocido = Dispositivo::create(['sitio_id' => $sitio->id, 'device_id' => 'b', 'nombre' => 'B']);
    $conocido->forceFill(['modelo_legacy' => 'SHEM-3', 'modo_canales' => 'fases'])->save();
    $desconocido->forceFill(['modelo_legacy' => 'Otro'])->save();

    $resultado = (new AsignadorModeloLegado)->asignarTodos();

    expect($resultado)->toBe(['asignados' => 1, 'sin_modelo' => 1])
        ->and($conocido->fresh()->modeloDispositivo->codigo)->toBe('shelly-3em')
        ->and($conocido->fresh()->modoCanales())->toBe(ModoCanales::Circuitos)
        ->and($desconocido->fresh()->modelo_dispositivo_id)->toBeNull();
});
