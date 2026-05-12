<?php

use Tests\TestCase;

uses(TestCase::class);

it('treats undefined weather widget values as missing values', function () {
    $source = file_get_contents(resource_path('js/components/DatosMeteorologicos.tsx'));

    expect($source)->toContain('temperatura_actual?: number | null')
        ->and($source)->toContain('viento_velocidad?: number | null')
        ->and($source)->toContain('datos.temperatura_actual != null')
        ->and($source)->toContain('datos.viento_velocidad != null')
        ->and($source)->not->toContain('datos.temperatura_actual !== null')
        ->and($source)->not->toContain('datos.viento_velocidad !== null');
});

it('normalizes partial weather payloads before sending them to the dashboard', function () {
    $source = file_get_contents(app_path('Http/Controllers/DashboardController.php'));

    expect($source)->toContain('$datosMeteorologicos = array_merge(')
        ->and($source)->toContain('$datosMeteorologicos ?: []')
        ->and($source)->toContain("'temperatura_actual' => null")
        ->and($source)->toContain("'viento_velocidad' => null")
        ->and($source)->toContain("'radiacion_solar' => null");
});
