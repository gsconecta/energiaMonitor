<?php

use App\Services\AemetService;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(function () {
    Cache::forget('aemet_prediccion_07043');
    Config::set('services.aemet.api_key', 'test-aemet-key');
});

afterEach(function () {
    Cache::forget('aemet_prediccion_07043');
});

it('retries transient AEMET connection errors and returns weather values', function () {
    Http::preventStrayRequests();

    $endpointAttempts = 0;
    $dataAttempts = 0;

    Http::fake(function ($request) use (&$endpointAttempts, &$dataAttempts) {
        $url = $request->url();

        if (str_contains($url, '/prediccion/especifica/municipio/diaria/07043')) {
            $endpointAttempts++;

            if ($endpointAttempts === 1) {
                throw new ConnectionException('temporary eof');
            }

            return Http::response([
                'descripcion' => 'exito',
                'datos' => 'https://datos.aemet.test/prediccion-07043.json',
            ]);
        }

        if ($url === 'https://datos.aemet.test/prediccion-07043.json') {
            $dataAttempts++;

            if ($dataAttempts === 1) {
                throw new ConnectionException('temporary eof');
            }

            return Http::response([
                [
                    'prediccion' => [
                        'dia' => [
                            [
                                'temperatura' => [
                                    'maxima' => 23,
                                    'minima' => 12,
                                ],
                                'viento' => [
                                    [
                                        'periodo' => '00-24',
                                        'direccion' => 'SO',
                                        'velocidad' => 20,
                                    ],
                                ],
                                'estadoCielo' => [
                                    [
                                        'descripcion' => 'Intervalos nubosos',
                                        'value' => '13',
                                    ],
                                ],
                                'uvMax' => 8,
                            ],
                        ],
                    ],
                ],
            ]);
        }
    });

    $datos = app(AemetService::class)->obtenerPrediccionMunicipio('07043');

    expect($endpointAttempts)->toBe(2)
        ->and($dataAttempts)->toBe(2)
        ->and($datos['temperatura_actual'])->toBe(23)
        ->and($datos['viento_velocidad'])->toBe(20)
        ->and($datos['viento_direccion'])->toBe('SO');
});
