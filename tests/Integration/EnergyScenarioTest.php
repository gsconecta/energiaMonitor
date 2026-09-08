<?php

use App\Models\Lectura;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Support\EnergyScenario;

it('muestra el equipo de la instalación seleccionada con el esquema real', function () {
    $this->travelTo(now()->startOfDay()->addHours(12));
    $scenario = EnergyScenario::create();
    $this->actingAs($scenario['viewer'])->withSession([
        'organizacion_actual_id' => $scenario['client']->id,
        'sitio_actual_id' => $scenario['site']->id,
    ])->get(route('dashboard'))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('dispositivos', 1)
        ->where('dispositivos.0.id', $scenario['device']->id));
    expect(Lectura::count())->toBe(6);
});

it('rechaza un contexto de otra organización aunque la sesión lo solicite', function () {
    $scenario = EnergyScenario::create();
    $this->actingAs($scenario['viewer'])->withSession([
        'organizacion_actual_id' => $scenario['otherClient']->id,
        'sitio_actual_id' => $scenario['otherSite']->id,
    ])->get(route('dashboard'))->assertRedirect(route('seleccionar-contexto'))
        ->assertSessionMissing('organizacion_actual_id');
});

it('conserva precisión decimal y JSON al persistir una medida sintética', function () {
    $scenario = EnergyScenario::create();
    $reading = $scenario['device']->lecturas()->orderBy('fecha_lectura')->first();
    expect((string) $reading->energia_total_kwh)->toBe('100.125')
        ->and((float) $reading->voltaje_canal_1)->toBe(230.12)
        ->and($reading->datos_raw)->toBe(['fixture' => true, 'source' => 'synthetic']);
});

it('la base impide asignaciones duplicadas de un usuario al mismo cliente', function () {
    $scenario = EnergyScenario::create();
    $scenario['client']->users()->attach($scenario['viewer'], ['rol' => 'viewer']);
})->throws(QueryException::class);

it('la base impide medidas sin un dispositivo existente', function () {
    DB::table('lecturas')->insert([
        'dispositivo_id' => 99999999, 'fecha_lectura' => now(),
        'potencia_total_w' => 100, 'energia_total_kwh' => 1,
    ]);
})->throws(QueryException::class);
