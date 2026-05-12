<?php

use App\Models\Sitio;
use Tests\TestCase;

uses(TestCase::class);

it('requires an aemet municipality code for weather data', function () {
    $sitio = new Sitio([
        'latitud' => null,
        'longitud' => null,
        'codigo_municipio_aemet' => null,
    ]);

    expect($sitio->tieneConfiguracionMeteorologica())->toBeFalse()
        ->and($sitio->camposConfiguracionMeteorologicaFaltantes())->toBe([
            'codigo_municipio_aemet',
        ]);
});

it('keeps coordinates optional and does not use them as the minimum weather configuration', function () {
    $sitio = new Sitio([
        'latitud' => 41.3851,
        'longitud' => 2.1734,
        'codigo_municipio_aemet' => null,
    ]);

    expect($sitio->tieneConfiguracionMeteorologica())->toBeFalse()
        ->and($sitio->camposConfiguracionMeteorologicaFaltantes())->toBe([
            'codigo_municipio_aemet',
        ]);
});

it('accepts an aemet municipality code without coordinates', function () {
    $sitio = new Sitio([
        'latitud' => null,
        'longitud' => null,
        'codigo_municipio_aemet' => '08019',
    ]);

    expect($sitio->tieneConfiguracionMeteorologica())->toBeTrue()
        ->and($sitio->camposConfiguracionMeteorologicaFaltantes())->toBe([]);
});

it('only reports the missing aemet code when coordinates are incomplete', function () {
    $sitio = new Sitio([
        'latitud' => 41.3851,
        'longitud' => null,
        'codigo_municipio_aemet' => '',
    ]);

    expect($sitio->tieneConfiguracionMeteorologica())->toBeFalse()
        ->and($sitio->camposConfiguracionMeteorologicaFaltantes())->toBe([
            'codigo_municipio_aemet',
        ]);
});
