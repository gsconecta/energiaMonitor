<?php

use App\Models\Dispositivo;
use App\Models\ModeloDispositivo;
use App\Models\Organizacion;
use App\Models\Sitio;
use Database\Seeders\ModeloDispositivoSeeder;
use Tests\Support\EsquemaDispositivos;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(function () {
    EsquemaDispositivos::crear();
    (new ModeloDispositivoSeeder)->run();
    config(['app.api_key' => 'clave-de-prueba']);

    $this->organizacion = Organizacion::create(['nombre' => 'Org', 'codigo' => 'org', 'activa' => true]);
    $this->sitio = Sitio::create(['organizacion_id' => $this->organizacion->id, 'nombre' => 'Sitio', 'codigo' => 'sitio', 'activa' => true]);
});

afterEach(fn () => EsquemaDispositivos::eliminar());

/**
 * Tras la Tarea 7, /dispositivos-activos-por-organizacion pasó a devolver nombreModelo()
 * ("Shelly Pro 3EM") mientras /sql-dispositivos-activos seguía documentando modelo_legacy
 * ("SHEM-3"): antes coincidían. n8n es un consumidor externo que no controlamos y el spec no
 * pedía cambiarle el contrato, así que ambos deben seguir devolviendo el mismo valor de siempre.
 */
it('el endpoint agrupado por organización devuelve modelo_legacy, no el nombre del catálogo', function () {
    $dispositivo = Dispositivo::create([
        'sitio_id' => $this->sitio->id,
        'device_id' => 'dev-1',
        'nombre' => 'Cuadro',
        'modelo_dispositivo_id' => ModeloDispositivo::where('codigo', 'shelly-pro-3em')->value('id'),
        'activo' => true,
    ]);
    $dispositivo->forceFill(['modelo_legacy' => 'SHEM-3'])->save();

    $respuesta = $this->getJson('/api/dispositivos-activos-por-organizacion', ['X-API-Key' => 'clave-de-prueba'])
        ->assertOk()
        ->json();

    expect($dispositivo->fresh()->nombreModelo())->toBe('Shelly Pro 3EM')
        ->and($respuesta[0]['dispositivos'][0]['modelo'])->toBe('SHEM-3');
});

it('la consulta SQL directa sigue documentando modelo_legacy con el alias modelo', function () {
    $respuesta = $this->getJson('/api/sql-dispositivos-activos', ['X-API-Key' => 'clave-de-prueba'])
        ->assertOk()
        ->json();

    expect($respuesta['sql'])->toContain('d.modelo_legacy AS modelo');
});
