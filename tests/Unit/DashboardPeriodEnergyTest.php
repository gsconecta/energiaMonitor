<?php

use App\Models\Dispositivo;
use App\Models\Lectura;
use App\Models\Organizacion;
use App\Models\Sitio;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-05-12 12:30:00'));
    config(['broadcasting.default' => 'null']);

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
        $table->enum('rol_global', ['super_admin', 'admin', 'cliente'])->default('cliente');
        $table->rememberToken();
        $table->timestamps();
    });

    Schema::create('organizaciones', function (Blueprint $table) {
        $table->id();
        $table->string('nombre');
        $table->string('codigo')->unique()->nullable();
        $table->enum('tipo_perfil', ['residencial', 'industrial'])->default('residencial');
        $table->boolean('activa')->default(true);
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('organizacion_user', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('organizacion_id');
        $table->unsignedBigInteger('user_id');
        $table->string('rol')->default('usuario');
        $table->timestamps();
    });

    Schema::create('sitios', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('organizacion_id');
        $table->string('nombre');
        $table->string('codigo')->nullable();
        $table->decimal('latitud', 10, 7)->nullable();
        $table->decimal('longitud', 10, 7)->nullable();
        $table->string('codigo_municipio_aemet')->nullable();
        $table->boolean('activo')->default(true);
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('dispositivos', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('sitio_id');
        $table->string('device_id')->unique();
        $table->string('nombre');
        $table->string('modelo')->nullable();
        $table->integer('num_fases')->default(1);
        $table->string('tipo_canal_1')->nullable();
        $table->string('tipo_canal_2')->nullable();
        $table->string('tipo_canal_3')->nullable();
        $table->string('nombre_canal_1')->nullable();
        $table->string('nombre_canal_2')->nullable();
        $table->string('nombre_canal_3')->nullable();
        $table->string('color_canal_1')->nullable();
        $table->string('color_canal_2')->nullable();
        $table->string('color_canal_3')->nullable();
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
        $table->float('energia_total_kwh')->nullable();
        $table->float('energia_retornada_kwh')->nullable();
        $table->float('energia_canal_1_kwh')->nullable();
        $table->float('energia_canal_2_kwh')->nullable();
        $table->float('energia_canal_3_kwh')->nullable();
        $table->float('voltaje')->nullable();
        $table->float('corriente')->nullable();
        $table->float('factor_potencia')->nullable();
        $table->float('potencia_reactiva_var')->nullable();
        $table->integer('wifi_rssi')->nullable();
        $table->boolean('wifi_conectado')->default(true);
        $table->integer('uptime_segundos')->nullable();
        $table->boolean('online')->default(true);
        $table->timestamps();
    });
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

function createResidentialDashboardContext(): array
{
    $user = User::factory()->create(['rol_global' => 'cliente']);
    $organizacion = Organizacion::create([
        'nombre' => 'Casa Solar',
        'codigo' => 'casa-solar',
        'tipo_perfil' => 'residencial',
        'activa' => true,
    ]);
    $organizacion->users()->attach($user->id, ['rol' => 'admin']);

    $sitio = Sitio::create([
        'organizacion_id' => $organizacion->id,
        'nombre' => 'Casa',
        'codigo' => 'casa',
        'activo' => true,
    ]);

    $dispositivo = Dispositivo::create([
        'sitio_id' => $sitio->id,
        'device_id' => 'solar-01',
        'nombre' => 'Solar',
        'tipo_canal_1' => 'fotovoltaica',
        'tipo_canal_2' => 'red_electrica',
        'invertir_sentido_canal_1' => true,
        'activo' => true,
    ]);

    return [$user, $organizacion, $sitio, $dispositivo];
}

it('calcula la generacion solar del periodo desde potencia cuando el contador FV no avanza', function () {
    [$user, $organizacion, $sitio, $dispositivo] = createResidentialDashboardContext();

    foreach (['10:00:00', '11:00:00', '12:00:00'] as $hora) {
        Lectura::create([
            'dispositivo_id' => $dispositivo->id,
            'fecha_lectura' => "2026-05-12 {$hora}",
            'potencia_total_w' => -4000,
            'potencia_canal_1_w' => -4000,
            'potencia_canal_2_w' => 0,
            'energia_canal_1_kwh' => 1000,
            'energia_canal_2_kwh' => 2000,
            'energia_retornada_kwh' => 0,
            'online' => true,
        ]);
    }

    $response = $this->actingAs($user)
        ->withSession([
            'organizacion_actual_id' => $organizacion->id,
            'sitio_actual_id' => $sitio->id,
        ])
        ->get('/dashboard?periodo=hoy');

    $response->assertOk();

    $props = $response->viewData('page')['props'];

    expect($props['metricas']['produccion_fotovoltaica_actual_kw'])->toBe(4.0)
        ->and($props['metricas']['generacion_fotovoltaica_kwh'])->toBe(8.0);
});

it('expone una etiqueta legible del periodo seleccionado para el dashboard', function () {
    [$user, $organizacion, $sitio, $dispositivo] = createResidentialDashboardContext();

    Lectura::create([
        'dispositivo_id' => $dispositivo->id,
        'fecha_lectura' => '2026-05-11 12:00:00',
        'potencia_total_w' => -1000,
        'potencia_canal_1_w' => -1000,
        'energia_canal_1_kwh' => 1000,
        'online' => true,
    ]);

    $response = $this->actingAs($user)
        ->withSession([
            'organizacion_actual_id' => $organizacion->id,
            'sitio_actual_id' => $sitio->id,
        ])
        ->get('/dashboard?periodo=ayer');

    $response->assertOk();

    $props = $response->viewData('page')['props'];

    expect($props['periodo_label'])->toBe('Ayer');
});

it('calcula la independencia energetica del periodo con las energias finales del dashboard', function () {
    [$user, $organizacion, $sitio, $dispositivo] = createResidentialDashboardContext();

    foreach (['10:00:00', '11:00:00', '12:00:00'] as $hora) {
        Lectura::create([
            'dispositivo_id' => $dispositivo->id,
            'fecha_lectura' => "2026-05-12 {$hora}",
            'potencia_total_w' => 5000,
            'potencia_canal_1_w' => -4000,
            'potencia_canal_2_w' => 1000,
            'energia_canal_1_kwh' => 1000,
            'energia_canal_2_kwh' => 2000,
            'energia_retornada_kwh' => 0,
            'online' => true,
        ]);
    }

    $response = $this->actingAs($user)
        ->withSession([
            'organizacion_actual_id' => $organizacion->id,
            'sitio_actual_id' => $sitio->id,
        ])
        ->get('/dashboard?periodo=hoy');

    $response->assertOk();

    $props = $response->viewData('page')['props'];

    expect($props['metricas']['generacion_fotovoltaica_kwh'])->toBe(8.0)
        ->and($props['metricas']['importacion_red_kwh'])->toBe(2.0)
        ->and($props['metricas']['consumo_casa_kwh'])->toBe(10.0)
        ->and($props['metricas']['independencia_energetica_pct'])->toBe(80.0);
});

it('mantiene la energia retornada coherente con la generacion solar integrada', function () {
    [$user, $organizacion, $sitio, $dispositivo] = createResidentialDashboardContext();

    $contadoresRetornada = [
        '10:00:00' => 1000,
        '11:00:00' => 6000,
        '12:00:00' => 11000,
    ];

    foreach ($contadoresRetornada as $hora => $energiaRetornada) {
        Lectura::create([
            'dispositivo_id' => $dispositivo->id,
            'fecha_lectura' => "2026-05-12 {$hora}",
            'potencia_total_w' => 3000,
            'potencia_canal_1_w' => -4000,
            'potencia_canal_2_w' => -1000,
            'energia_canal_1_kwh' => 1000,
            'energia_canal_2_kwh' => 2000,
            'energia_retornada_kwh' => $energiaRetornada,
            'online' => true,
        ]);
    }

    $response = $this->actingAs($user)
        ->withSession([
            'organizacion_actual_id' => $organizacion->id,
            'sitio_actual_id' => $sitio->id,
        ])
        ->get('/dashboard?periodo=hoy');

    $response->assertOk();

    $metricas = $response->viewData('page')['props']['metricas'];

    expect($metricas['generacion_fotovoltaica_kwh'])->toBe(8.0)
        ->and($metricas['energia_retornada_kwh'])->toBe(2.0)
        ->and($metricas['exportacion_red_kwh'])->toBe(2.0)
        ->and($metricas['consumo_casa_kwh'])->toBe(6.0);
});

it('muestra la edad de ultima lectura como pasada aunque el timestamp venga unos segundos adelantado', function () {
    [$user, $organizacion, $sitio, $dispositivo] = createResidentialDashboardContext();

    Lectura::create([
        'dispositivo_id' => $dispositivo->id,
        'fecha_lectura' => '2026-05-12 12:30:44',
        'potencia_total_w' => 1200,
        'potencia_canal_1_w' => -800,
        'potencia_canal_2_w' => 400,
        'energia_canal_1_kwh' => 1000,
        'energia_canal_2_kwh' => 2000,
        'energia_retornada_kwh' => 0,
        'online' => true,
    ]);

    $response = $this->actingAs($user)
        ->withSession([
            'organizacion_actual_id' => $organizacion->id,
            'sitio_actual_id' => $sitio->id,
        ])
        ->get('/dashboard?periodo=hoy');

    $response->assertOk();

    $props = $response->viewData('page')['props'];

    expect($props['metricas']['ultima_actualizacion_human'])->toBe('hace menos de 1 minuto')
        ->and($props['dispositivos'][0]['ultima_lectura']['fecha_lectura_human'])->toBe('hace menos de 1 minuto');
});
