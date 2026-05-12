<?php

use App\Events\DashboardLecturaActualizada;
use App\Models\Dispositivo;
use App\Models\Lectura;
use App\Models\Organizacion;
use App\Models\Sitio;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-05-12 12:00:00'));

    Schema::dropIfExists('lecturas');
    Schema::dropIfExists('dispositivos');
    Schema::dropIfExists('sitios');
    Schema::dropIfExists('organizacion_user');
    Schema::dropIfExists('organizaciones');
    Schema::dropIfExists('users');

    Schema::create('users', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('email')->unique();
        $table->timestamp('email_verified_at')->nullable();
        $table->string('password');
        $table->enum('rol_global', ['super_admin', 'admin', 'tecnico', 'cliente'])->default('cliente');
        $table->rememberToken();
        $table->timestamps();
    });

    Schema::create('organizaciones', function (Blueprint $table) {
        $table->id();
        $table->string('nombre');
        $table->string('codigo')->unique()->nullable();
        $table->enum('tipo_perfil', ['residencial', 'industrial'])->default('industrial');
        $table->boolean('activa')->default(true);
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('organizacion_user', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('organizacion_id');
        $table->unsignedBigInteger('user_id');
        $table->string('rol')->default('admin');
        $table->timestamps();
    });

    Schema::create('sitios', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('organizacion_id');
        $table->string('nombre');
        $table->string('codigo')->nullable();
        $table->string('ubicacion')->nullable();
        $table->decimal('latitud', 10, 7)->nullable();
        $table->decimal('longitud', 10, 7)->nullable();
        $table->text('descripcion')->nullable();
        $table->boolean('activa')->default(true);
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('dispositivos', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('sitio_id');
        $table->string('device_id')->unique();
        $table->string('nombre');
        $table->unsignedTinyInteger('num_fases')->nullable();
        $table->string('nombre_canal_1')->nullable();
        $table->string('nombre_canal_2')->nullable();
        $table->string('nombre_canal_3')->nullable();
        $table->string('color_canal_1')->nullable();
        $table->string('color_canal_2')->nullable();
        $table->string('color_canal_3')->nullable();
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
        $table->float('potencia_total_w')->nullable();
        $table->float('potencia_canal_1_w')->nullable();
        $table->float('potencia_canal_2_w')->nullable();
        $table->float('potencia_canal_3_w')->nullable();
        $table->float('energia_canal_1_kwh')->nullable();
        $table->float('energia_canal_2_kwh')->nullable();
        $table->float('energia_canal_3_kwh')->nullable();
        $table->float('voltaje_canal_1')->nullable();
        $table->float('voltaje_canal_2')->nullable();
        $table->float('voltaje_canal_3')->nullable();
        $table->timestamps();
    });

    Event::fake([DashboardLecturaActualizada::class]);
});

afterEach(function () {
    Schema::dropIfExists('lecturas');
    Schema::dropIfExists('dispositivos');
    Schema::dropIfExists('sitios');
    Schema::dropIfExists('organizacion_user');
    Schema::dropIfExists('organizaciones');
    Schema::dropIfExists('users');

    Carbon::setTestNow();
});

it('exposes the full device status contract in the site show payload', function () {
    $user = User::factory()->create(['rol_global' => 'cliente']);

    $organizacion = Organizacion::create([
        'nombre' => 'Fabrica Norte',
        'codigo' => 'fab-norte',
        'tipo_perfil' => 'industrial',
        'activa' => true,
    ]);
    $organizacion->users()->attach($user->id, ['rol' => 'admin']);

    $sitio = Sitio::create([
        'organizacion_id' => $organizacion->id,
        'nombre' => 'Nave 1',
        'codigo' => 'nave-1',
        'activa' => true,
    ]);

    $dispositivo = Dispositivo::create([
        'sitio_id' => $sitio->id,
        'device_id' => 'em3-nave-1',
        'nombre' => 'Cuadro general',
        'num_fases' => 2,
        'nombre_canal_1' => 'L1 Solar',
        'nombre_canal_2' => 'L2 Red',
        'tipo_canal_1' => 'fotovoltaica',
        'tipo_canal_2' => 'red_electrica',
        'color_canal_1' => '#f59e0b',
        'color_canal_2' => '#2563eb',
        'invertir_sentido_canal_1' => true,
        'activo' => true,
    ]);

    Lectura::create([
        'dispositivo_id' => $dispositivo->id,
        'fecha_lectura' => Carbon::parse('2026-05-12 11:58:00'),
        'potencia_total_w' => 500,
        'potencia_canal_1_w' => -1200,
        'potencia_canal_2_w' => 1700,
        'energia_canal_1_kwh' => 44.5,
        'energia_canal_2_kwh' => 88.2,
        'voltaje_canal_1' => 230.5,
        'voltaje_canal_2' => 229.9,
    ]);

    $response = $this->actingAs($user)->get("/sitios/{$sitio->id}");

    $response->assertOk();

    $props = $response->viewData('page')['props'];
    $device = $props['sitio']['dispositivos'][0];

    expect($device)
        ->toMatchArray([
            'id' => $dispositivo->id,
            'nombre' => 'Cuadro general',
            'device_id' => 'em3-nave-1',
            'activo' => true,
            'num_fases' => 2,
            'nombre_canal_1' => 'L1 Solar',
            'nombre_canal_2' => 'L2 Red',
            'tipo_canal_1' => 'fotovoltaica',
            'tipo_canal_2' => 'red_electrica',
            'color_canal_1' => '#f59e0b',
            'color_canal_2' => '#2563eb',
            'estado_conexion' => 'online',
        ])
        ->and($device['ultima_lectura'])
        ->toMatchArray([
            'fecha_lectura' => '2026-05-12T09:58:00.000000Z',
            'fecha_lectura_human' => '2 minutos antes',
            'potencia_total_w' => 500.0,
            'potencia_canal_1_w' => 1200.0,
            'potencia_canal_2_w' => 1700.0,
            'energia_canal_1_kwh' => 44.5,
            'energia_canal_2_kwh' => 88.2,
            'voltaje_canal_1' => 230.5,
            'voltaje_canal_2' => 229.9,
        ]);
});
