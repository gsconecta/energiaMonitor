<?php

use App\Models\Lectura;
use App\Services\Energia\ContadoresEnergia;

uses(Tests\TestCase::class);

function contadorSintetico(float $valor, string $formato = 'em:0', int $minuto = 0): Lectura
{
    return new Lectura([
        'dispositivo_id' => 1,
        'fecha_lectura' => '2026-09-08 10:'.str_pad((string) $minuto, 2, '0', STR_PAD_LEFT).':00',
        'energia_total_kwh' => $valor,
        'datos_raw' => ['device_status' => [$formato => []]],
    ]);
}

it('convierte Wh independientemente de la magnitud', function (float $delta) {
    $result = (new ContadoresEnergia)->calcular(collect([
        contadorSintetico(100000), contadorSintetico(100000 + $delta, minuto: 3),
    ]), 'energia_total_kwh');
    expect($result['estado'])->toBe('valido');
    expect($result['kwh'])->toEqualWithDelta($delta / 1000, 0.000001);
})->with([499.71, 1000.0, 2387.63, 25946.59]);

it('mantiene kWh del formato antiguo incluso para consumos grandes', function () {
    $result = (new ContadoresEnergia)->calcular(collect([
        contadorSintetico(100, 'emeters'), contadorSintetico(2100, 'emeters', 3),
    ]), 'energia_total_kwh');
    expect($result['kwh'])->toBe(2000.0);
});

it('normaliza cada extremo antes de restar al cambiar de formato', function () {
    $result = (new ContadoresEnergia)->calcular(collect([
        contadorSintetico(100, 'emeters'), contadorSintetico(100500, 'em1:0', 3),
    ]), 'energia_total_kwh');
    expect($result['kwh'])->toBe(0.5);
});

it('no convierte un reinicio en consumo cero ni oculta reinicios intermedios', function () {
    $result = (new ContadoresEnergia)->calcular(collect([
        contadorSintetico(100), contadorSintetico(10, minuto: 3), contadorSintetico(200, minuto: 6),
    ]), 'energia_total_kwh');
    expect($result)->toBe(['kwh' => null, 'estado' => 'contador_reiniciado']);
});

it('rechaza unidades desconocidas y campos ausentes', function () {
    $a = contadorSintetico(100, 'desconocido');
    $b = contadorSintetico(200, minuto: 3);
    $service = new ContadoresEnergia;
    expect($service->calcular(collect([$a, $b]), 'energia_total_kwh')['kwh'])->toBeNull();
    $a = contadorSintetico(100);
    $a->energia_total_kwh = null;
    expect($service->calcular(collect([$a, $b]), 'energia_total_kwh')['estado'])->toBe('contador_invalido');
});

it('deduplica muestras identicas y rechaza valores contradictorios', function () {
    $service = new ContadoresEnergia;
    $a = contadorSintetico(100);
    $b = contadorSintetico(200, minuto: 3);
    expect($service->calcular(collect([$a, clone $a, $b]), 'energia_total_kwh')['kwh'])->toBe(0.1);
    expect($service->calcular(collect([$a, contadorSintetico(150), $b]), 'energia_total_kwh')['estado'])->toBe('duplicado_conflictivo');
});

it('no mezcla dispositivos ni acepta un formato ambiguo', function () {
    $a = contadorSintetico(100);
    $b = contadorSintetico(200, minuto: 3);
    $b->dispositivo_id = 2;
    $service = new ContadoresEnergia;
    expect($service->calcular(collect([$a, $b]), 'energia_total_kwh')['estado'])->toBe('dispositivos_distintos');
    $a->datos_raw = ['device_status' => ['em:0' => [], 'emeters' => []]];
    expect($service->unidad($a))->toBeNull();
});

it('no presenta una sola muestra ni dos duplicados como consumo medido', function () {
    $a = contadorSintetico(100);
    $service = new ContadoresEnergia;
    expect($service->calcular(collect([$a]), 'energia_total_kwh')['kwh'])->toBeNull();
    expect($service->calcular(collect([$a, clone $a]), 'energia_total_kwh')['kwh'])->toBeNull();
});
