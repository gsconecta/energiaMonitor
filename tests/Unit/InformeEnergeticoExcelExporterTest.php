<?php

use App\Services\InformeEnergeticoExcelExporter;
use Tests\TestCase;

uses(TestCase::class);

test('genera un fichero excel compatible con el contenido del informe', function () {
    $payload = [
        'dispositivo' => [
            'id' => 10,
            'nombre' => 'Contador Principal',
            'tiene_fotovoltaica' => true,
            'num_fases' => 3,
        ],
        'datos' => [
            [
                'fecha' => '2026-03-20T10:00:00+01:00',
                'consumo_kwh' => 1.234,
                'generacion_kwh' => 0.876,
                'importacion_kwh' => 0.358,
                'exportacion_kwh' => 0.122,
                'potencia_promedio_kw' => 12.14,
                'potencia_maxima_kw' => 14.32,
                'voltaje_red_electrica' => 229.5,
                'voltaje_canal_1' => 229.2,
                'voltaje_canal_2' => 230.1,
                'voltaje_canal_3' => 229.8,
                'q1_var' => 120.5,
                'q2_var' => 118.2,
                'q3_var' => 121.1,
                'q_total_var' => 359.8,
            ],
            [
                'fecha' => '2026-03-20T11:00:00+01:00',
                'consumo_kwh' => 1.111,
                'generacion_kwh' => 0.654,
                'importacion_kwh' => 0.457,
                'exportacion_kwh' => 0.091,
                'potencia_promedio_kw' => 11.48,
                'potencia_maxima_kw' => 15.27,
                'voltaje_red_electrica' => 230.4,
                'voltaje_canal_1' => 230.0,
                'voltaje_canal_2' => 230.7,
                'voltaje_canal_3' => 230.5,
                'q1_var' => 119.2,
                'q2_var' => 117.8,
                'q3_var' => 120.4,
                'q_total_var' => 357.4,
            ],
        ],
        'organizacion_activa' => [
            'id' => 3,
            'nombre' => 'Planta Demo',
            'tipo_perfil' => 'industrial',
        ],
        'metricas' => [
            'potencia_maxima_kw' => 15.27,
            'potencia_promedio_kw' => 11.81,
        ],
        'filtros' => [
            'periodo' => 'personalizado',
            'intervalo' => '1h',
            'fecha_desde' => '2026-03-20',
            'fecha_hasta' => '2026-03-20',
            'dispositivo_id' => 10,
        ],
    ];

    $export = app(InformeEnergeticoExcelExporter::class)->make($payload);

    expect($export['filename'])
        ->toContain('informe-energetico-contador-principal-2026-03-20-2026-03-20')
        ->and($export['content'])->not->toBeEmpty();

    if (class_exists(ZipArchive::class)) {
        $tempFile = tempnam(sys_get_temp_dir(), 'informe_test_');
        file_put_contents($tempFile, $export['content']);

        $zip = new ZipArchive();
        expect($zip->open($tempFile))->toBeTrue();

        $sheet = $zip->getFromName('xl/worksheets/sheet1.xml');
        $workbook = $zip->getFromName('xl/workbook.xml');

        $zip->close();
        @unlink($tempFile);

        expect($export['filename'])->toEndWith('.xlsx')
            ->and($workbook)->toContain('sheet name="Informe"')
            ->and($sheet)->toContain('Planta Demo')
            ->and($sheet)->toContain('Contador Principal')
            ->and($sheet)->toContain('Consumo (kWh)')
            ->and($sheet)->toContain('Potencia maxima (kW)')
            ->and($sheet)->toContain('Potencia promedio (kW)')
            ->and($sheet)->toContain('Metodo potencia')
            ->and($sheet)->toContain('Suma trifasica de canales')
            ->and($sheet)->toContain('229.5');

        return;
    }

    expect($export['filename'])->toEndWith('.xml')
        ->and($export['content'])->toContain('<Workbook')
        ->and($export['content'])->toContain('Planta Demo')
        ->and($export['content'])->toContain('Contador Principal')
        ->and($export['content'])->toContain('Consumo (kWh)')
        ->and($export['content'])->toContain('Potencia maxima (kW)')
        ->and($export['content'])->toContain('Potencia promedio (kW)')
        ->and($export['content'])->toContain('Metodo potencia')
        ->and($export['content'])->toContain('Suma trifasica de canales');
});
