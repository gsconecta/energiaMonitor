<?php

use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(function () {
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
});

afterEach(function () {
    Schema::dropIfExists('users');
});

test('admin can update a user password from admin users', function () {
    $admin = User::factory()->create(['rol_global' => 'admin']);
    $user = User::factory()->create(['password' => Hash::make('old-password')]);

    $response = $this
        ->actingAs($admin)
        ->from('/admin/usuarios')
        ->put("/admin/usuarios/{$user->id}/password", [
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect('/admin/usuarios');

    expect(Hash::check('new-password', $user->refresh()->password))->toBeTrue();
});

test('technicians cannot update user passwords from admin users', function () {
    $technician = User::factory()->create(['rol_global' => 'tecnico']);
    $user = User::factory()->create(['password' => Hash::make('old-password')]);

    $response = $this
        ->actingAs($technician)
        ->put("/admin/usuarios/{$user->id}/password", [
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ]);

    $response->assertForbidden();

    expect(Hash::check('old-password', $user->refresh()->password))->toBeTrue();
});

test('admin password update requires confirmation', function () {
    $admin = User::factory()->create(['rol_global' => 'admin']);
    $user = User::factory()->create(['password' => Hash::make('old-password')]);

    $response = $this
        ->actingAs($admin)
        ->from('/admin/usuarios')
        ->put("/admin/usuarios/{$user->id}/password", [
            'password' => 'new-password',
            'password_confirmation' => 'different-password',
        ]);

    $response
        ->assertSessionHasErrors('password')
        ->assertRedirect('/admin/usuarios');

    expect(Hash::check('old-password', $user->refresh()->password))->toBeTrue();
});
