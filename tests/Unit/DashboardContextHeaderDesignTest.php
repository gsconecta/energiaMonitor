<?php

it('renders the connection status in the dashboard context row', function () {
    $source = file_get_contents(__DIR__ . '/../../resources/js/pages/Dashboard/Index.tsx');

    expect($source)
        ->toContain('function ConnectionStatusIndicator')
        ->toContain('<ConnectionStatusIndicator')
        ->toContain('estadoConexion={metricas?.estado_conexion}')
        ->toContain('ultimaActualizacionHuman')
        ->toContain('metricas?.ultima_actualizacion_human')
        ->toContain('{ultimaActualizacionHuman && (')
        ->not->toContain('<div className="mx-2 mb-2 flex items-center gap-2">');
});

it('subscribes to site realtime updates and reloads only dashboard data', function () {
    $source = file_get_contents(__DIR__ . '/../../resources/js/pages/Dashboard/Index.tsx');
    $appSource = file_get_contents(__DIR__ . '/../../resources/js/app.tsx');

    expect($source)
        ->toContain("import { useEcho } from '@laravel/echo-react';")
        ->toContain('type DashboardLecturaActualizadaEvent =')
        ->toContain('useEcho<DashboardLecturaActualizadaEvent>')
        ->toContain('`dashboard.site.${sitioActual.id}`')
        ->toContain("'.lectura.actualizada'")
        ->toContain('router.reload({')
        ->toContain("only: [")
        ->toContain("'metricas'")
        ->toContain("'datos_grafica'");

    expect($appSource)
        ->toContain("broadcaster: import.meta.env.VITE_REVERB_APP_KEY ? 'reverb' : 'null'");
});
