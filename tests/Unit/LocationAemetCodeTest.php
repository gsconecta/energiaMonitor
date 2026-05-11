<?php

use App\Http\Controllers\LocationController;
use App\Services\AemetService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

uses(TestCase::class);

it('returns the aemet municipality code for coordinates', function () {
    $service = Mockery::mock(AemetService::class);
    $service->shouldReceive('obtenerCodigoMunicipioDesdeCoordenadas')
        ->once()
        ->with(41.3851, 2.1734)
        ->andReturn('08019');

    $request = Request::create('/api/location/aemet-code', 'GET', [
        'lat' => '41.3851',
        'lng' => '2.1734',
    ]);

    $response = app(LocationController::class)->aemetCode($request, $service);

    expect($response->getStatusCode())->toBe(200)
        ->and($response->getData(true))->toBe([
            'codigo_municipio_aemet' => '08019',
        ]);
});

it('validates coordinates before resolving the aemet municipality code', function () {
    $service = Mockery::mock(AemetService::class);
    $service->shouldNotReceive('obtenerCodigoMunicipioDesdeCoordenadas');

    $request = Request::create('/api/location/aemet-code', 'GET', [
        'lat' => '120',
        'lng' => '2.1734',
    ]);

    expect(fn () => app(LocationController::class)->aemetCode($request, $service))
        ->toThrow(ValidationException::class);
});
