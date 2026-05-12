<?php

uses(Tests\TestCase::class);

it('renders branded error pages for expected HTTP failures', function (
    string $view,
    string $title,
    string $message,
    string $action,
) {
    $html = view($view)->render();

    expect($html)
        ->toContain('energiaMonitor')
        ->toContain($title)
        ->toContain($message)
        ->toContain($action);
})->with([
    'maintenance' => [
        'errors.503',
        'Mantenimiento programado',
        'Estamos actualizando la plataforma para mejorar la monitorizacion energetica.',
        'Volver a comprobar',
    ],
    'not found' => [
        'errors.404',
        'Pagina no encontrada',
        'La ruta solicitada no existe o se ha movido dentro de energiaMonitor.',
        'Volver al inicio',
    ],
    'forbidden' => [
        'errors.403',
        'Acceso restringido',
        'Tu usuario no tiene permisos para consultar esta zona de la plataforma.',
        'Ir al dashboard',
    ],
    'expired session' => [
        'errors.419',
        'Sesion expirada',
        'La sesion ha caducado por seguridad o por inactividad.',
        'Iniciar sesion',
    ],
    'server error' => [
        'errors.500',
        'Incidencia tecnica',
        'No hemos podido completar la solicitud en este momento.',
        'Volver al inicio',
    ],
]);
