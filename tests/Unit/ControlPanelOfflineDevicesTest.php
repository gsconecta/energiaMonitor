<?php

use App\Models\Dispositivo;
use App\Models\Lectura;
use App\Models\Organizacion;
use App\Models\Sitio;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(function () {
    Schema::dropIfExists('alertas_umbral');
    Schema::dropIfExists('umbrales_funcionamiento');
    Schema::dropIfExists('lecturas');
    Schema::dropIfExists('dispositivos');
    Schema::dropIfExists('sitios');
    Schema::dropIfExists('organizaciones');
    Schema::dropIfExists('users');

    Schema::create('users', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('email')->unique();
        $table->timestamp('email_verified_at')->nullable();
        $table->string('password');
        $table->enum('rol_global', ['cliente', 'tecnico', 'admin'])->default('cliente');
        $table->rememberToken()->nullable();
        $table->timestamps();
    });

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

    Schema::create('umbrales_funcionamiento', function (Blueprint $table) {
        $table->id();
        $table->string('nombre')->nullable();
        $table->timestamps();
    });

    Schema::create('alertas_umbral', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('umbral_funcionamiento_id')->nullable();
        $table->unsignedBigInteger('lectura_id')->nullable();
        $table->unsignedBigInteger('dispositivo_id')->nullable();
        $table->string('metrica')->nullable();
        $table->string('canal')->nullable();
        $table->decimal('valor_leido', 12, 2)->nullable();
        $table->decimal('valor_minimo', 12, 2)->nullable();
        $table->decimal('valor_maximo', 12, 2)->nullable();
        $table->string('severidad')->nullable();
        $table->boolean('resuelta')->default(false);
        $table->timestamp('resuelta_at')->nullable();
        $table->timestamps();
    });
});

afterEach(function () {
    Carbon::setTestNow();

    Schema::dropIfExists('alertas_umbral');
    Schema::dropIfExists('umbrales_funcionamiento');
    Schema::dropIfExists('lecturas');
    Schema::dropIfExists('dispositivos');
    Schema::dropIfExists('sitios');
    Schema::dropIfExists('organizaciones');
    Schema::dropIfExists('users');
});

it('only lists devices whose latest reading is older than the offline threshold', function () {
    Carbon::setTestNow('2026-03-25 12:00:00');

    $user = User::factory()->create(['rol_global' => 'tecnico']);

    $organizacion = Organizacion::create([
        'nombre' => 'Org Demo',
        'codigo' => 'org-demo',
        'activa' => true,
    ]);

    $sitio = Sitio::create([
        'organizacion_id' => $organizacion->id,
        'nombre' => 'Sitio Demo',
        'codigo' => 'sitio-demo',
        'activa' => true,
    ]);

    $dispositivoOnline = Dispositivo::create([
        'sitio_id' => $sitio->id,
        'nombre' => 'Dispositivo online',
        'device_id' => 'online-1',
        'activo' => true,
    ]);

    $dispositivoOffline = Dispositivo::create([
        'sitio_id' => $sitio->id,
        'nombre' => 'Dispositivo offline',
        'device_id' => 'offline-1',
        'activo' => true,
    ]);

    Lectura::create([
        'dispositivo_id' => $dispositivoOnline->id,
        'fecha_lectura' => now()->subMinutes(20),
        'potencia_total_w' => 100,
    ]);

    Lectura::create([
        'dispositivo_id' => $dispositivoOnline->id,
        'fecha_lectura' => now()->subMinute(),
        'potencia_total_w' => 110,
    ]);

    Lectura::create([
        'dispositivo_id' => $dispositivoOffline->id,
        'fecha_lectura' => now()->subMinutes(6),
        'potencia_total_w' => 90,
    ]);

    $this->actingAs($user)
        ->get('/admin/control-panel')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/ControlPanel')
            ->where('metricasGlobales.dispositivos_offline_count', 1)
            ->has('dispositivosOffline', 1)
            ->where('dispositivosOffline.0.nombre', 'Dispositivo offline'));
});
