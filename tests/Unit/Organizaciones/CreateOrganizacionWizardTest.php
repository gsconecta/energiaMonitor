<?php

use App\Models\Organizacion;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(function () {
    Schema::dropIfExists('organizacion_user');
    Schema::dropIfExists('credencial_shellies');
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

    Schema::create('credencial_shellies', function (Blueprint $table) {
        $table->id();
        $table->string('nombre');
        $table->string('server')->nullable();
        $table->text('api_key')->nullable();
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('organizaciones', function (Blueprint $table) {
        $table->id();
        $table->string('nombre');
        $table->string('codigo')->unique();
        $table->text('descripcion')->nullable();
        $table->enum('tipo_perfil', ['residencial', 'industrial'])->default('industrial');
        $table->boolean('activa')->default(true);
        $table->unsignedBigInteger('credencial_shelly_id')->nullable();
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('organizacion_user', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('organizacion_id');
        $table->unsignedBigInteger('user_id');
        $table->enum('rol', ['owner', 'admin', 'member', 'viewer']);
        $table->timestamps();
    });
});

afterEach(function () {
    Schema::dropIfExists('organizacion_user');
    Schema::dropIfExists('credencial_shellies');
    Schema::dropIfExists('organizaciones');
    Schema::dropIfExists('users');
});

it('stores initial status and shelly credential when creating an organization', function () {
    $user = User::factory()->create(['rol_global' => 'admin']);

    $credencialId = \DB::table('credencial_shellies')->insertGetId([
        'nombre' => 'Shelly principal',
        'server' => 'shelly-eu',
        'api_key' => 'demo-key',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $response = $this->actingAs($user)->post('/organizaciones', [
        'nombre' => 'Org Wizard',
        'codigo' => 'org-wizard',
        'descripcion' => 'Alta creada desde el wizard',
        'tipo_perfil' => 'industrial',
        'activa' => false,
        'credencial_shelly_id' => $credencialId,
    ]);

    $response->assertStatus(302);

    $organizacion = Organizacion::query()->first();

    expect($organizacion)->not->toBeNull();
    expect($organizacion->nombre)->toBe('Org Wizard');
    expect($organizacion->activa)->toBeFalse();
    expect($organizacion->credencial_shelly_id)->toBe($credencialId);

    $this->assertDatabaseHas('organizacion_user', [
        'organizacion_id' => $organizacion->id,
        'user_id' => $user->id,
        'rol' => 'owner',
    ]);
});
