<?php

use App\Events\DashboardLecturaActualizada;
use App\Models\Dispositivo;
use App\Models\Lectura;
use App\Models\Organizacion;
use App\Models\Sitio;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(function () {
    Schema::dropIfExists('lecturas');
    Schema::dropIfExists('dispositivos');
    Schema::dropIfExists('sitios');
    Schema::dropIfExists('organizaciones');

    Schema::create('organizaciones', function (Blueprint $table) {
        $table->id();
        $table->string('nombre');
        $table->string('codigo')->nullable();
        $table->boolean('activa')->default(true);
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('sitios', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('organizacion_id');
        $table->string('nombre');
        $table->string('codigo')->nullable();
        $table->boolean('activa')->default(true);
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('dispositivos', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('sitio_id');
        $table->string('nombre');
        $table->string('device_id')->nullable();
        $table->string('tipo')->nullable();
        $table->boolean('activo')->default(true);
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('lecturas', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('dispositivo_id');
        $table->timestamp('fecha_lectura');
        $table->decimal('potencia_total_w', 10, 2)->default(0);
        $table->timestamps();
    });
});

afterEach(function () {
    Schema::dropIfExists('lecturas');
    Schema::dropIfExists('dispositivos');
    Schema::dropIfExists('sitios');
    Schema::dropIfExists('organizaciones');
});

it('dispatches a dashboard update event when a reading is created', function () {
    expect(class_exists(DashboardLecturaActualizada::class))->toBeTrue();

    Event::fake([DashboardLecturaActualizada::class]);

    $organizacion = Organizacion::create([
        'nombre' => 'Org Demo',
        'codigo' => 'org-demo',
        'activa' => true,
    ]);
    $sitio = Sitio::create([
        'organizacion_id' => $organizacion->id,
        'nombre' => 'Site Demo',
        'codigo' => 'site-demo',
        'activa' => true,
    ]);
    $dispositivo = Dispositivo::create([
        'sitio_id' => $sitio->id,
        'nombre' => 'Shelly Demo',
        'device_id' => 'demo-1',
        'activo' => true,
    ]);

    $lectura = Lectura::create([
        'dispositivo_id' => $dispositivo->id,
        'fecha_lectura' => now(),
        'potencia_total_w' => 1200,
    ]);

    Event::assertDispatched(
        DashboardLecturaActualizada::class,
        fn (DashboardLecturaActualizada $event) => $event->lecturaId === $lectura->id
            && $event->dispositivoId === $dispositivo->id
            && $event->sitioId === $sitio->id
    );
});
