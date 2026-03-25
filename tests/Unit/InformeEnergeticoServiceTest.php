<?php

use App\Models\Dispositivo;
use App\Models\Lectura;
use App\Models\Organizacion;
use App\Models\Sitio;
use App\Models\User;
use App\Services\InformeEnergeticoService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(function () {
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
        $table->enum('rol_global', ['cliente', 'tecnico', 'admin'])->default('cliente');
        $table->rememberToken()->nullable();
        $table->timestamps();
    });

    Schema::create('organizaciones', function (Blueprint $table) {
        $table->id();
        $table->string('nombre');
        $table->string('codigo')->unique();
        $table->string('tipo_perfil')->default('industrial');
        $table->boolean('activa')->default(true);
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('organizacion_user', function (Blueprint $table) {
        $table->unsignedBigInteger('organizacion_id');
        $table->unsignedBigInteger('user_id');
        $table->string('rol');
        $table->timestamps();
    });

    Schema::create('sitios', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('organizacion_id');
        $table->string('nombre');
        $table->string('codigo');
        $table->boolean('activa')->default(true);
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('dispositivos', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('sitio_id');
        $table->string('nombre');
        $table->integer('num_fases')->nullable();
        $table->string('tipo_canal_1')->nullable();
        $table->string('tipo_canal_2')->nullable();
        $table->string('tipo_canal_3')->nullable();
        $table->string('color_canal_1')->nullable();
        $table->string('color_canal_2')->nullable();
        $table->string('color_canal_3')->nullable();
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
        $table->float('voltaje_promedio')->nullable();
        $table->float('voltaje_canal_1')->nullable();
        $table->float('voltaje_canal_2')->nullable();
        $table->float('voltaje_canal_3')->nullable();
        $table->float('corriente_canal_1')->nullable();
        $table->float('corriente_canal_2')->nullable();
        $table->float('corriente_canal_3')->nullable();
        $table->float('pf_canal_1')->nullable();
        $table->float('pf_canal_2')->nullable();
        $table->float('pf_canal_3')->nullable();
        $table->float('reactiva_canal_1_var')->nullable();
        $table->float('reactiva_canal_2_var')->nullable();
        $table->float('reactiva_canal_3_var')->nullable();
        $table->float('reactiva_total_var')->nullable();
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
});

it('sums all red phases for interval energy in industrial trifasic reports', function () {
    $user = User::factory()->create(['rol_global' => 'admin']);

    $organizacion = Organizacion::create([
        'nombre' => 'Planta Demo',
        'codigo' => 'planta-demo',
        'tipo_perfil' => 'industrial',
        'activa' => true,
    ]);

    $organizacion->users()->attach($user->id, ['rol' => 'owner']);

    $sitio = Sitio::create([
        'organizacion_id' => $organizacion->id,
        'nombre' => 'Nave 1',
        'codigo' => 'nave-1',
        'activa' => true,
    ]);

    $dispositivo = Dispositivo::create([
        'sitio_id' => $sitio->id,
        'nombre' => 'Principal Trifásico',
        'num_fases' => 3,
        'tipo_canal_1' => 'red_electrica',
        'tipo_canal_2' => 'red_electrica',
        'tipo_canal_3' => 'red_electrica',
        'activo' => true,
    ]);

    foreach (['2026-03-20 10:00:00', '2026-03-20 11:00:00'] as $fecha) {
        Lectura::create([
            'dispositivo_id' => $dispositivo->id,
            'fecha_lectura' => $fecha,
            'potencia_canal_1_w' => 1000,
            'potencia_canal_2_w' => 2000,
            'potencia_canal_3_w' => 3000,
            'voltaje_canal_1' => 229,
            'voltaje_canal_2' => 230,
            'voltaje_canal_3' => 231,
            'reactiva_total_var' => 450,
        ]);
    }

    $this->actingAs($user);

    $request = Request::create('/informes', 'GET', [
        'periodo' => 'personalizado',
        'intervalo' => '1h',
        'fecha_desde' => '2026-03-20',
        'fecha_hasta' => '2026-03-20',
        'dispositivo_id' => $dispositivo->id,
    ]);

    $session = app('session')->driver();
    $session->start();
    $session->put([
        'organizacion_actual_id' => $organizacion->id,
        'sitio_actual_id' => $sitio->id,
    ]);
    $request->setLaravelSession($session);

    $payload = app(InformeEnergeticoService::class)->buildReport($request);

    expect($payload)->toBeArray();
    expect($payload['datos'])->toBeArray();
    expect(collect($payload['datos'])->sum('consumo_kwh'))->toBe(6.0);
    expect(collect($payload['datos'])->sum('importacion_kwh'))->toBe(6.0);
    expect(collect($payload['datos'])->sum('consumo_canal_1_kwh'))->toBe(1.0);
    expect(collect($payload['datos'])->sum('consumo_canal_2_kwh'))->toBe(2.0);
    expect(collect($payload['datos'])->sum('consumo_canal_3_kwh'))->toBe(3.0);
    expect(collect($payload['datos'])->pluck('voltaje_red_electrica')->filter()->unique()->values()->all())
        ->toBe([230.0]);
});
