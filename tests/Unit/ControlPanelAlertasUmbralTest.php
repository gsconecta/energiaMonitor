<?php

use App\Models\AlertaUmbral;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(function () {
    Schema::dropIfExists('alertas_umbral');
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

    Schema::create('alertas_umbral', function (Blueprint $table) {
        $table->id();
        $table->boolean('resuelta')->default(false);
        $table->timestamp('resuelta_at')->nullable();
        $table->timestamps();
    });
});

afterEach(function () {
    Schema::dropIfExists('alertas_umbral');
    Schema::dropIfExists('users');
});

it('resolves multiple threshold alerts at once', function () {
    $user = User::factory()->create(['rol_global' => 'tecnico']);

    $alertaA = AlertaUmbral::create([]);
    $alertaB = AlertaUmbral::create([]);
    $alertaYaResuelta = AlertaUmbral::create([
        'resuelta' => true,
        'resuelta_at' => now()->subMinute(),
    ]);

    $this->actingAs($user)
        ->post('/admin/alertas-umbral/resolver-multiple', [
            'alerta_ids' => [$alertaA->id, $alertaB->id, $alertaYaResuelta->id],
        ])
        ->assertRedirect();

    $alertaA->refresh();
    $alertaB->refresh();
    $alertaYaResuelta->refresh();

    expect($alertaA->resuelta)->toBeTrue()
        ->and($alertaA->resuelta_at)->not->toBeNull()
        ->and($alertaB->resuelta)->toBeTrue()
        ->and($alertaB->resuelta_at)->not->toBeNull()
        ->and($alertaYaResuelta->resuelta)->toBeTrue();
});

it('forbids bulk threshold alert resolution for client users', function () {
    $user = User::factory()->create(['rol_global' => 'cliente']);
    $alerta = AlertaUmbral::create([]);

    $this->actingAs($user)
        ->post('/admin/alertas-umbral/resolver-multiple', [
            'alerta_ids' => [$alerta->id],
        ])
        ->assertForbidden();

    expect($alerta->fresh()->resuelta)->toBeFalse();
});
