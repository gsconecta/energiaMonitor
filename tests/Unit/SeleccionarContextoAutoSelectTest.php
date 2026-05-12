<?php

use App\Models\Organizacion;
use App\Models\Sitio;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(function () {
    Schema::dropIfExists('organizacion_user');
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
        $table->string('tipo_perfil')->default('industrial');
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

    Schema::create('organizacion_user', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('organizacion_id');
        $table->unsignedBigInteger('user_id');
        $table->string('rol')->default('owner');
        $table->timestamps();
    });
});

afterEach(function () {
    Schema::dropIfExists('organizacion_user');
    Schema::dropIfExists('sitios');
    Schema::dropIfExists('organizaciones');
    Schema::dropIfExists('users');
});

it('auto-selects the only active site when storing an organization without a site id', function () {
    $user = User::factory()->create();

    $organizacion = Organizacion::create([
        'nombre' => 'Org Unica',
        'codigo' => 'org-unica',
        'activa' => true,
    ]);
    $organizacion->users()->attach($user->id, ['rol' => 'owner']);

    $sitio = Sitio::create([
        'organizacion_id' => $organizacion->id,
        'nombre' => 'Site Unico',
        'codigo' => 'site-unico',
        'activa' => true,
    ]);

    $response = $this->actingAs($user)->post(route('seleccionar-contexto.store'), [
        'organizacion_id' => $organizacion->id,
    ]);

    $response
        ->assertRedirect(route('dashboard', absolute: false))
        ->assertSessionHas('organizacion_actual_id', $organizacion->id)
        ->assertSessionHas('sitio_actual_id', $sitio->id);
});

it('keeps requiring a site when an organization has multiple active sites', function () {
    $user = User::factory()->create();

    $organizacion = Organizacion::create([
        'nombre' => 'Org Multi',
        'codigo' => 'org-multi',
        'activa' => true,
    ]);
    $organizacion->users()->attach($user->id, ['rol' => 'owner']);

    Sitio::create([
        'organizacion_id' => $organizacion->id,
        'nombre' => 'Site Uno',
        'codigo' => 'site-uno',
        'activa' => true,
    ]);
    Sitio::create([
        'organizacion_id' => $organizacion->id,
        'nombre' => 'Site Dos',
        'codigo' => 'site-dos',
        'activa' => true,
    ]);

    $this->actingAs($user)
        ->from(route('seleccionar-contexto'))
        ->post(route('seleccionar-contexto.store'), [
            'organizacion_id' => $organizacion->id,
        ])
        ->assertRedirect(route('seleccionar-contexto'))
        ->assertSessionHasErrors('sitio_id');
});
