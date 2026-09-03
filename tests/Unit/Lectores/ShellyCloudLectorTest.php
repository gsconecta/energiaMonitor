<?php

use App\Models\Dispositivo;
use App\Models\Organizacion;
use App\Models\Sitio;
use App\Services\Lectores\LecturaNoDisponible;
use App\Services\Lectores\ShellyCloudLector;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(function () {
    Schema::dropIfExists('dispositivos');
    Schema::dropIfExists('sitios');
    Schema::dropIfExists('organizaciones');

    Schema::create('organizaciones', function (Blueprint $table) {
        $table->id();
        $table->string('nombre');
        $table->boolean('activa')->default(true);
        $table->text('shelly_api_key')->nullable();
        $table->string('shelly_server')->nullable();
        $table->unsignedBigInteger('credencial_shelly_id')->nullable();
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('sitios', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('organizacion_id');
        $table->string('nombre');
        $table->boolean('activa')->default(true);
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('dispositivos', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('sitio_id');
        $table->string('device_id')->unique();
        $table->string('nombre');
        $table->boolean('activo')->default(true);
        $table->unsignedTinyInteger('num_fases')->nullable();
        $table->json('configuracion')->nullable();
        $table->timestamps();
        $table->softDeletes();
    });
});

function dispositivoShellyDePrueba(array $organizacion = []): Dispositivo
{
    $org = Organizacion::create(array_merge([
        'nombre' => 'Org Test',
        'activa' => true,
        'shelly_api_key' => 'clave-de-prueba',
        'shelly_server' => 'https://shelly-eu.example',
    ], $organizacion));

    $sitio = Sitio::create(['organizacion_id' => $org->id, 'nombre' => 'Sitio', 'activa' => true]);

    return Dispositivo::create([
        'sitio_id' => $sitio->id,
        'device_id' => 'abc123',
        'nombre' => 'Medidor',
        'activo' => true,
    ]);
}

function respuestaShelly(string $fixture): string
{
    return file_get_contents(base_path("tests/Fixtures/shelly/{$fixture}.json"));
}

it('normaliza el formato trifásico em:0', function () {
    Http::fake(['shelly-eu.example/*' => Http::response(respuestaShelly('pro-3em'))]);

    $lectura = (new ShellyCloudLector)->leer(dispositivoShellyDePrueba());

    expect($lectura['potencia_total_w'])->toBe(800.0)
        ->and($lectura['potencia_canal_1_w'])->toBe(500.0)
        ->and($lectura['energia_total_kwh'])->toBe(1750.875)
        ->and($lectura['energia_retornada_kwh'])->toBe(17.5)
        ->and($lectura['voltaje_promedio'])->toBe(230.2)
        ->and($lectura['reactiva_canal_1_var'])->toBe(283.95)
        ->and($lectura['wifi_conectado'])->toBe(1)
        ->and($lectura['wifi_rssi'])->toBe(-55)
        ->and($lectura['uptime_segundos'])->toBe(86400)
        ->and($lectura['fecha_lectura']->timestamp)->toBe(1756900000)
        ->and($lectura['datos_raw']['device_status']['em:0']['a_act_power'])->toBe(500.0);

    Http::assertSent(fn ($request) => str_contains($request->url(), 'id=abc123')
        && str_contains($request->url(), 'auth_key=clave-de-prueba'));
});

it('normaliza el formato de dos canales em1:x', function () {
    Http::fake(['shelly-eu.example/*' => Http::response(respuestaShelly('pro-em-50'))]);

    $lectura = (new ShellyCloudLector)->leer(dispositivoShellyDePrueba());

    expect($lectura['potencia_total_w'])->toBe(460.0)
        ->and($lectura['potencia_canal_2_w'])->toBe(-230.0)
        ->and($lectura['potencia_canal_3_w'])->toBe(0.0)
        ->and($lectura['energia_total_kwh'])->toBe(130.5)
        ->and($lectura['energia_retornada_kwh'])->toBe(80.25)
        ->and($lectura['datos_raw']['em1:1']['act_power'])->toBe(-230.0);
});

it('normaliza el formato antiguo emeters convirtiendo Wh a kWh', function () {
    Http::fake(['shelly-eu.example/*' => Http::response(respuestaShelly('3em-gen1'))]);

    $lectura = (new ShellyCloudLector)->leer(dispositivoShellyDePrueba());

    expect($lectura['potencia_total_w'])->toBe(700.0)
        ->and($lectura['energia_canal_1_kwh'])->toBe(150.0)
        ->and($lectura['energia_total_kwh'])->toBe(230.0)
        ->and($lectura['energia_retornada_kwh'])->toBe(2.0)
        ->and($lectura['corriente_neutro'])->toBe(0.8)
        ->and($lectura['wifi_conectado'])->toBe(1)
        ->and($lectura['uptime_segundos'])->toBe(7200);
});

it('rechaza un formato de respuesta desconocido en vez de guardar ceros', function () {
    Http::fake(['shelly-eu.example/*' => Http::response(respuestaShelly('desconocido'))]);

    (new ShellyCloudLector)->leer(dispositivoShellyDePrueba());
})->throws(LecturaNoDisponible::class, 'formato de respuesta desconocido');

it('rechaza una respuesta con isok falso', function () {
    Http::fake(['shelly-eu.example/*' => Http::response(['isok' => false, 'errors' => ['invalid_token' => 'bad']])]);

    (new ShellyCloudLector)->leer(dispositivoShellyDePrueba());
})->throws(LecturaNoDisponible::class, 'respuesta inválida');

it('rechaza un error HTTP', function () {
    Http::fake(['shelly-eu.example/*' => Http::response('Unauthorized', 401)]);

    (new ShellyCloudLector)->leer(dispositivoShellyDePrueba());
})->throws(LecturaNoDisponible::class, 'HTTP 401');

it('rechaza un dispositivo cuya organización no tiene credencial', function () {
    Http::fake();

    (new ShellyCloudLector)->leer(dispositivoShellyDePrueba(['shelly_api_key' => null, 'shelly_server' => null]));
})->throws(LecturaNoDisponible::class, 'organización sin credencial Shelly');

it('pausa un segundo entre lecturas', function () {
    expect((new ShellyCloudLector)->pausaEntreLecturasMs())->toBe(1000);
});
