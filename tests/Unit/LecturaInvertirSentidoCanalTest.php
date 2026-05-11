<?php

use App\Models\Dispositivo;
use App\Models\Lectura;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(function () {
    Schema::dropIfExists('lecturas');
    Schema::dropIfExists('dispositivos');

    Schema::create('dispositivos', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('sitio_id')->nullable();
        $table->string('device_id')->nullable();
        $table->string('nombre');
        $table->unsignedTinyInteger('num_fases')->nullable();
        $table->string('tipo_canal_1')->nullable();
        $table->string('tipo_canal_2')->nullable();
        $table->string('tipo_canal_3')->nullable();
        $table->boolean('invertir_sentido_canal_1')->default(false);
        $table->boolean('invertir_sentido_canal_2')->default(false);
        $table->boolean('invertir_sentido_canal_3')->default(false);
        $table->boolean('activo')->default(true);
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('lecturas', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('dispositivo_id');
        $table->timestamp('fecha_lectura');
        $table->float('potencia_canal_1_w')->nullable();
        $table->float('potencia_canal_2_w')->nullable();
        $table->float('potencia_canal_3_w')->nullable();
        $table->timestamps();
    });
});

afterEach(function () {
    Schema::dropIfExists('lecturas');
    Schema::dropIfExists('dispositivos');
});

it('does not invert a photovoltaic channel when its invert flag is disabled', function () {
    $dispositivo = Dispositivo::create([
        'nombre' => 'FV sin invertir',
        'tipo_canal_1' => 'fotovoltaica',
    ]);

    $lectura = Lectura::create([
        'dispositivo_id' => $dispositivo->id,
        'fecha_lectura' => now(),
        'potencia_canal_1_w' => 1200,
    ]);

    $lectura->setRelation('dispositivo', $dispositivo->fresh());

    expect($dispositivo->fresh()->invierteSentidoCanal(1))->toBeFalse();
    expect($lectura->obtenerPotenciaFotovoltaica())->toBe(1200.0);
    expect($lectura->obtenerGeneracionFotovoltaica())->toBe(1200.0);
});

it('inverts only channels with the invert flag enabled', function () {
    $dispositivo = Dispositivo::create([
        'nombre' => 'Canales mixtos',
        'tipo_canal_1' => 'fotovoltaica',
        'tipo_canal_2' => 'red_electrica',
        'invertir_sentido_canal_1' => true,
        'invertir_sentido_canal_2' => true,
    ]);

    $lectura = Lectura::create([
        'dispositivo_id' => $dispositivo->id,
        'fecha_lectura' => now(),
        'potencia_canal_1_w' => -1500,
        'potencia_canal_2_w' => 500,
    ]);

    $lectura->setRelation('dispositivo', $dispositivo->fresh());

    expect($dispositivo->fresh()->invierteSentidoCanal(1))->toBeTrue();
    expect($lectura->obtenerPotenciaFotovoltaica())->toBe(1500.0);
    expect($lectura->obtenerPotenciaRedElectrica())->toBe(-500.0);
    expect($lectura->calcularConsumoCasa())->toBe(1000.0);
});
