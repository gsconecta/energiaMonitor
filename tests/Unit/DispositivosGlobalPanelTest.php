<?php

use App\Models\Dispositivo;
use App\Models\Lectura;
use App\Models\Organizacion;
use App\Models\Sitio;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schema;
use Inertia\Testing\AssertableInertia as Assert;
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
        $table->string('codigo')->nullable();
        $table->boolean('activa')->default(true);
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('organizacion_user', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('organizacion_id');
        $table->unsignedBigInteger('user_id');
        $table->string('rol')->default('viewer');
        $table->timestamps();
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
        $table->string('device_id')->unique();
        $table->string('nombre');
        $table->string('modelo')->nullable();
        $table->string('ip_local')->nullable();
        $table->string('firmware')->nullable();
        $table->boolean('activo')->default(true);
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
        $table->json('configuracion')->nullable();
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('lecturas', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('dispositivo_id');
        $table->timestamp('fecha_lectura');
        $table->decimal('potencia_total_w', 10, 2)->nullable();
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

it('lists all devices while in global panel mode', function () {
    $user = User::factory()->create([
        'rol_global' => 'tecnico',
    ]);

    $orgA = Organizacion::create(['nombre' => 'Org A', 'codigo' => 'org-a', 'activa' => true]);
    $orgB = Organizacion::create(['nombre' => 'Org B', 'codigo' => 'org-b', 'activa' => true]);

    $sitioA = Sitio::create([
        'organizacion_id' => $orgA->id,
        'nombre' => 'Sitio A',
        'codigo' => 'sitio-a',
        'activa' => true,
    ]);

    $sitioB = Sitio::create([
        'organizacion_id' => $orgB->id,
        'nombre' => 'Sitio B',
        'codigo' => 'sitio-b',
        'activa' => true,
    ]);

    $dispositivoA = Dispositivo::create([
        'sitio_id' => $sitioA->id,
        'device_id' => 'dev-a',
        'nombre' => 'Medidor A',
        'modelo' => 'Shelly EM3',
        'activo' => true,
    ]);

    $dispositivoB = Dispositivo::create([
        'sitio_id' => $sitioB->id,
        'device_id' => 'dev-b',
        'nombre' => 'Medidor B',
        'modelo' => 'Shelly EM3',
        'activo' => true,
    ]);

    Lectura::create([
        'dispositivo_id' => $dispositivoA->id,
        'fecha_lectura' => now()->subMinute(),
        'potencia_total_w' => 500,
    ]);

    Lectura::create([
        'dispositivo_id' => $dispositivoB->id,
        'fecha_lectura' => now()->subMinutes(10),
        'potencia_total_w' => 250,
    ]);

    $response = $this->actingAs($user)->get('/dispositivos');

    $response->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('Dispositivos/Index')
        ->where('panel_global_mode', true)
        ->has('dispositivos', 2)
        ->has('sitios', 2));

    $props = $response->viewData('page')['props'];
    $deviceIds = collect($props['dispositivos'])->pluck('device_id')->all();
    $siteLabels = collect($props['sitios'])->map(
        fn ($sitio) => $sitio['organizacion']['nombre'].' -> '.$sitio['nombre']
    )->all();

    expect($deviceIds)->toContain('dev-a', 'dev-b');
    expect($siteLabels)->toContain('Org A -> Sitio A', 'Org B -> Sitio B');
});

it('keeps regular users scoped to their organizations without context', function () {
    $user = User::factory()->create([
        'rol_global' => 'cliente',
    ]);

    $orgA = Organizacion::create(['nombre' => 'Org A', 'codigo' => 'org-a', 'activa' => true]);
    $orgB = Organizacion::create(['nombre' => 'Org B', 'codigo' => 'org-b', 'activa' => true]);

    $user->organizaciones()->attach($orgA->id, ['rol' => 'admin']);

    $sitioA = Sitio::create([
        'organizacion_id' => $orgA->id,
        'nombre' => 'Sitio A',
        'codigo' => 'sitio-a',
        'activa' => true,
    ]);

    $sitioB = Sitio::create([
        'organizacion_id' => $orgB->id,
        'nombre' => 'Sitio B',
        'codigo' => 'sitio-b',
        'activa' => true,
    ]);

    Dispositivo::create([
        'sitio_id' => $sitioA->id,
        'device_id' => 'dev-a',
        'nombre' => 'Medidor A',
        'modelo' => 'Shelly EM3',
        'activo' => true,
    ]);

    Dispositivo::create([
        'sitio_id' => $sitioB->id,
        'device_id' => 'dev-b',
        'nombre' => 'Medidor B',
        'modelo' => 'Shelly EM3',
        'activo' => true,
    ]);

    $response = $this->actingAs($user)->get('/dispositivos');

    $response->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('Dispositivos/Index')
        ->where('panel_global_mode', false)
        ->has('dispositivos', 1)
        ->has('sitios', 1));

    $props = $response->viewData('page')['props'];

    expect(collect($props['dispositivos'])->pluck('device_id')->all())->toBe(['dev-a']);
    expect(collect($props['sitios'])->pluck('nombre')->all())->toBe(['Sitio A']);
});

it('allows updating and syncing any device in global panel mode', function () {
    $user = User::factory()->create([
        'rol_global' => 'admin',
    ]);

    $organizacion = Organizacion::create([
        'nombre' => 'Org Soporte',
        'codigo' => 'org-soporte',
        'activa' => true,
    ]);

    $sitio = Sitio::create([
        'organizacion_id' => $organizacion->id,
        'nombre' => 'Sitio Soporte',
        'codigo' => 'sitio-soporte',
        'activa' => true,
    ]);

    $dispositivo = Dispositivo::create([
        'sitio_id' => $sitio->id,
        'device_id' => 'dev-soporte',
        'nombre' => 'Medidor Original',
        'modelo' => 'Shelly EM3',
        'activo' => true,
    ]);

    $this->actingAs($user)
        ->put("/dispositivos/{$dispositivo->id}", [
            'sitio_id' => $sitio->id,
            'device_id' => 'dev-soporte',
            'nombre' => 'Medidor Actualizado',
            'modelo' => 'Shelly Pro EM',
            'ip_local' => '192.168.1.25',
            'firmware' => '1.0.0',
            'activo' => true,
            'num_fases' => 3,
            'nombre_canal_1' => null,
            'nombre_canal_2' => null,
            'nombre_canal_3' => null,
            'color_canal_1' => '#ef4444',
            'color_canal_2' => '#22c55e',
            'color_canal_3' => '#eab308',
            'tipo_canal_1' => 'fotovoltaica',
            'tipo_canal_2' => 'red_electrica',
            'tipo_canal_3' => null,
        ])
        ->assertRedirect(route('dispositivos.index'));

    expect($dispositivo->fresh()->nombre)->toBe('Medidor Actualizado');
    expect($dispositivo->fresh()->tipo_canal_1)->toBe('fotovoltaica');

    Artisan::shouldReceive('call')
        ->once()
        ->with('shelly:obtener-lecturas', ['--dispositivo' => $dispositivo->id]);

    $this->actingAs($user)
        ->post("/dispositivos/{$dispositivo->id}/sincronizar")
        ->assertRedirect(route('dispositivos.index'));
});
