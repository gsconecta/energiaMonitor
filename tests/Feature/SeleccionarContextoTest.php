<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

it('clears the current context before entering the admin panel', function () {
    $user = User::factory()->create([
        'rol_global' => 'tecnico',
    ]);

    $response = $this->actingAs($user)
        ->withSession([
            'organizacion_actual_id' => 99,
            'sitio_actual_id' => 55,
            'is_impersonating' => true,
        ])
        ->post(route('seleccionar-contexto.enter-panel'));

    $response
        ->assertRedirect(route('admin.control-panel'))
        ->assertSessionMissing('organizacion_actual_id')
        ->assertSessionMissing('sitio_actual_id')
        ->assertSessionMissing('is_impersonating');

    $this->get(route('admin.control-panel'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/ControlPanel')
            ->where('organizacion_actual', null)
            ->where('sitio_actual', null));
});
