<?php

use App\Models\Lectura;
use Tests\Support\EnergyScenario;

function dashboardEnergyFixture($test, string $case): array
{
    $test->travelTo(now()->startOfDay()->addHours(12));
    $s = EnergyScenario::create();
    $s['device']->lecturas()->delete();
    $s['device']->update(['tipo_canal_1' => 'red_electrica', 'tipo_canal_2' => 'red_electrica', 'tipo_canal_3' => 'red_electrica']);
    if ($case !== 'empty') {
        foreach ([0, 1] as $i) {
            Lectura::factory()->create([
                'dispositivo_id' => $s['device']->id,
                'fecha_lectura' => now()->subMinutes($i === 0 ? ($case === 'gap' ? 30 : 3) : 0),
                'datos_raw' => $case === 'unknown' || $case === 'gap' || $case === 'missing-power' ? [] : ['device_status' => ['em:0' => ['a_act_power' => 1000]]],
                'energia_total_kwh' => 100000 + $i * 28833.93,
                'energia_retornada_kwh' => 0,
                'energia_canal_1_kwh' => $case === 'reset' ? 1000 - $i * 900 : 100000 + $i * 2387.63,
                'energia_canal_2_kwh' => 100000 + $i * 25946.59,
                'energia_canal_3_kwh' => 100000 + $i * 499.71,
                'potencia_canal_1_w' => $case === 'missing-power' ? null : 1000,
                'potencia_canal_2_w' => 1000,
                'potencia_canal_3_w' => 1000,
            ]);
        }
    }

    return $test->actingAs($s['viewer'])->withSession([
        'organizacion_actual_id' => $s['client']->id,
        'sitio_actual_id' => $s['site']->id,
    ])->get(route('dashboard'))->assertOk()->viewData('page')['props']['metricas'];
}

it('concilia total y canales sin cambiar de escala segun el consumo', function () {
    $m = dashboardEnergyFixture($this, 'valid');
    expect($m['energia_total_kwh'])->toBe(28.83)
        ->and($m['energia_canal_3_kwh'])->toBe(0.5)
        ->and($m['importacion_red_kwh'])->toBe(28.83)
        ->and($m['calidad_energia']['estado'])->toBe('contadores');
});

it('etiqueta como estimacion la potencia continua con unidad desconocida o reinicio', function (string $case) {
    $m = dashboardEnergyFixture($this, $case);
    expect($m['importacion_red_kwh'])->toBe(0.15)
        ->and($m['calidad_energia']['estado'])->toBe('estimada');
    if ($case === 'unknown') {
        expect($m['energia_total_kwh'])->toBeNull();
    } else {
        expect($m['energia_canal_1_kwh'])->toBeNull();
    }
})->with(['unknown', 'reset']);

it('no presenta energia cero al faltar medidas suficientes para estimar', function (string $case) {
    $m = dashboardEnergyFixture($this, $case);
    expect($m['importacion_red_kwh'])->toBeNull()
        ->and($m['consumo_casa_kwh'])->toBeNull()
        ->and($m['independencia_energetica_pct'])->toBeNull()
        ->and($m['calidad_energia']['estado'])->toBe('no_disponible');
})->with(['empty', 'gap', 'missing-power']);
