<?php

use App\Models\CredencialShelly;
use App\Models\User;
use Illuminate\Support\Facades\Artisan;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Support\EnergyScenario;

it('impide que un tecnico se convierta en administrador', function () {
    $user = User::factory()->create(['rol_global' => 'tecnico']);
    $this->actingAs($user)->put(route('admin.usuarios.update', $user), [
        'name' => $user->name, 'email' => $user->email, 'rol_global' => 'admin',
    ])->assertForbidden();
    expect($user->fresh()->rol_global)->toBe('tecnico');
});

it('permite al administrador cambiar roles globales', function () {
    $admin = User::factory()->create(['rol_global' => 'admin']);
    $user = User::factory()->create(['rol_global' => 'cliente']);
    $this->actingAs($admin)->put(route('admin.usuarios.update', $user), [
        'name' => $user->name, 'email' => $user->email, 'rol_global' => 'tecnico',
    ])->assertRedirect();
    expect($user->fresh()->rol_global)->toBe('tecnico');
});

it('no entrega organizaciones ajenas al cliente', function () {
    $s = EnergyScenario::create();
    $this->actingAs($s['viewer'])->get(route('organizaciones.index'))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('organizaciones', 1)->has('todas_organizaciones', 1)
        ->where('todas_organizaciones.0.id', $s['client']->id));
    $this->get(route('organizaciones.create'))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('organizaciones', 1)
            ->where('organizaciones.0.id', $s['client']->id));
});

it('no serializa la clave shelly en el formulario de alta', function () {
    $user = User::factory()->create(['rol_global' => 'tecnico']);
    $credential = CredencialShelly::create(['nombre' => 'Sintetica', 'server' => 'https://example.test', 'api_key' => 'synthetic-secret']);
    expect($credential->api_key)->toBe('synthetic-secret');
    $this->actingAs($user)->get(route('organizaciones.create'))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('credenciales_shelly', 1)
            ->missing('credenciales_shelly.0.api_key'));
});

it('impide las escrituras de un viewer sobre un dispositivo', function (string $action) {
    $s = EnergyScenario::create();
    Artisan::shouldReceive('call')->never();
    $request = $this->actingAs($s['viewer']);
    if ($action === 'destroy') {
        $request->delete(route('dispositivos.destroy', $s['device']))->assertForbidden();
    } else {
        $request->post(route('dispositivos.'.$action, $s['device']))->assertForbidden();
    }
    expect($s['device']->fresh()->activo)->toBeTrue();
    expect($s['device']->fresh()->deleted_at)->toBeNull();
})->with(['toggle-activo', 'destroy', 'sincronizar']);

it('permite gestionar el dispositivo a un administrador de su organizacion', function () {
    $s = EnergyScenario::create();
    $s['client']->users()->updateExistingPivot($s['viewer']->id, ['rol' => 'admin']);
    $this->actingAs($s['viewer'])->post(route('dispositivos.toggle-activo', $s['device']))->assertRedirect();
    expect($s['device']->fresh()->activo)->toBeFalse();
});

it('impide a un tecnico modificar el correo o eliminar una cuenta privilegiada', function (string $role) {
    $technician = User::factory()->create(['rol_global' => 'tecnico']);
    $target = User::factory()->create(['rol_global' => $role]);
    $originalEmail = $target->email;
    $this->actingAs($technician)->put(route('admin.usuarios.update', $target), [
        'name' => $target->name, 'email' => 'takeover@example.test', 'rol_global' => $role,
    ])->assertForbidden();
    $this->delete(route('admin.usuarios.destroy', $target))->assertForbidden();
    expect($target->fresh()->email)->toBe($originalEmail);
})->with(['admin', 'tecnico']);

it('mantiene la edicion de datos de clientes por el tecnico sin promocion', function () {
    $technician = User::factory()->create(['rol_global' => 'tecnico']);
    $target = User::factory()->create(['rol_global' => 'cliente']);
    $this->actingAs($technician)->put(route('admin.usuarios.update', $target), [
        'name' => 'Nombre actualizado', 'email' => $target->email, 'rol_global' => 'cliente',
    ])->assertRedirect();
    expect($target->fresh()->name)->toBe('Nombre actualizado');
});

it('rechaza gestionar un dispositivo ajeno incluso siendo admin de otro cliente', function () {
    $s = EnergyScenario::create();
    $s['client']->users()->updateExistingPivot($s['viewer']->id, ['rol' => 'admin']);
    $this->actingAs($s['viewer'])->post(route('dispositivos.toggle-activo', $s['otherDevice']))->assertForbidden();
    expect($s['otherDevice']->fresh()->activo)->toBeTrue();
});
