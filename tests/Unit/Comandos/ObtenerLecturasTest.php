<?php

use App\Events\DashboardLecturaActualizada;
use App\Models\Dispositivo;
use App\Models\Lectura;
use App\Models\ModeloDispositivo;
use App\Models\Organizacion;
use App\Models\Sitio;
use App\Services\EvaluadorUmbrales;
use App\Services\Lectores\LectorDispositivo;
use App\Services\Lectores\LecturaNoDisponible;
use App\Services\Lectores\ShellyCloudLector;
use Database\Seeders\ModeloDispositivoSeeder;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Event;
use Tests\Support\EsquemaDispositivos;
use Tests\TestCase;

uses(TestCase::class);

/** Lector de pruebas: responde por device_id con un array de lectura o lanzando la excepción indicada. */
class LectorFalso implements LectorDispositivo
{
    /** @param array<string, array|\Throwable> $respuestas */
    public function __construct(private array $respuestas) {}

    public function leer(Dispositivo $dispositivo, int $timeoutSegundos = 10): array
    {
        $respuesta = $this->respuestas[$dispositivo->device_id] ?? throw new LecturaNoDisponible('sin respuesta preparada');

        if ($respuesta instanceof Throwable) {
            throw $respuesta;
        }

        return $respuesta + ['dispositivo_id' => $dispositivo->id];
    }

    public function pausaEntreLecturasMs(): int
    {
        return 0;
    }
}

beforeEach(function () {
    EsquemaDispositivos::crear();
    Event::fake([DashboardLecturaActualizada::class]);
    $this->mock(EvaluadorUmbrales::class)->shouldReceive('evaluar')->andReturn([]);
    (new ModeloDispositivoSeeder)->run();

    $org = Organizacion::create(['nombre' => 'Org', 'activa' => true, 'shelly_api_key' => 'k', 'shelly_server' => 'https://s']);
    $this->sitio = Sitio::create(['organizacion_id' => $org->id, 'nombre' => 'Sitio', 'activa' => true]);
});

afterEach(fn () => EsquemaDispositivos::eliminar());

function lecturaDePrueba(float $potencia = 100.0): array
{
    return ['fecha_lectura' => now(), 'potencia_total_w' => $potencia, 'energia_total_kwh' => 1.0];
}

function dispositivoDePrueba(TestCase $test, string $deviceId, ?string $codigoModelo = null): Dispositivo
{
    return Dispositivo::create([
        'sitio_id' => $test->sitio->id,
        'device_id' => $deviceId,
        'nombre' => "Equipo {$deviceId}",
        'modelo_dispositivo_id' => $codigoModelo ? ModeloDispositivo::where('codigo', $codigoModelo)->value('id') : null,
        'activo' => true,
    ]);
}

it('lee un dispositivo sin modelo con el lector de Shelly Cloud', function () {
    dispositivoDePrueba($this, 'legado');
    app()->instance(ShellyCloudLector::class, new LectorFalso(['legado' => lecturaDePrueba(250)]));

    $codigo = Artisan::call('lecturas:obtener');

    expect($codigo)->toBe(0)
        ->and(Lectura::count())->toBe(1)
        ->and((float) Lectura::first()->potencia_total_w)->toBe(250.0)
        ->and(Artisan::output())->toContain('Exitosos');
});

it('omite los dispositivos cuyo driver no tiene lector sin contarlos como error', function () {
    dispositivoDePrueba($this, 'cvm', 'circutor-cvm-mini-mc-itf-bacnet-c2');
    dispositivoDePrueba($this, 'shelly', 'shelly-pro-3em');
    app()->instance(ShellyCloudLector::class, new LectorFalso(['shelly' => lecturaDePrueba()]));

    $codigo = Artisan::call('lecturas:obtener');

    expect($codigo)->toBe(0)
        ->and(Lectura::count())->toBe(1)
        ->and(Artisan::output())->toContain('Omitidos')->toContain('1');
});

it('un fallo de lectura no detiene el resto', function () {
    dispositivoDePrueba($this, 'roto', 'shelly-3em');
    dispositivoDePrueba($this, 'sano', 'shelly-3em');
    app()->instance(ShellyCloudLector::class, new LectorFalso([
        'roto' => new LecturaNoDisponible('formato de respuesta desconocido'),
        'sano' => lecturaDePrueba(),
    ]));

    $codigo = Artisan::call('lecturas:obtener');

    expect($codigo)->toBe(0)
        ->and(Lectura::count())->toBe(1)
        ->and(Artisan::output())->toContain('formato de respuesta desconocido');
});

it('devuelve fallo cuando todo son errores', function () {
    dispositivoDePrueba($this, 'roto', 'shelly-3em');
    app()->instance(ShellyCloudLector::class, new LectorFalso(['roto' => new LecturaNoDisponible('HTTP 500')]));

    expect(Artisan::call('lecturas:obtener'))->toBe(1)
        ->and(Lectura::count())->toBe(0);
});

it('con --dispositivo devuelve fallo si el modelo no tiene lector', function () {
    $cvm = dispositivoDePrueba($this, 'cvm', 'circutor-cvm-e3-mini-mc-wieth');

    expect(Artisan::call('lecturas:obtener', ['--dispositivo' => $cvm->id]))->toBe(1)
        ->and(Artisan::output())->toContain('sin lector');
});

it('mantiene el alias antiguo del comando', function () {
    expect(Artisan::call('shelly:obtener-lecturas'))->toBe(0)
        ->and(Artisan::output())->toContain('No hay dispositivos');
});
