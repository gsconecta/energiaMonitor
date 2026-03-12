<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Programar obtención de lecturas de Shelly cada 3 minutos
// Solo se ejecuta en entornos que no sean local
if (!app()->environment('local')) {
    Schedule::command('shelly:obtener-lecturas')
        ->everyThreeMinutes()
        ->withoutOverlapping()
        ->runInBackground()
        ->onFailure(function () {
            \Log::error('Error al ejecutar comando shelly:obtener-lecturas');
        });

    Schedule::command('lecturas:compactar-15m --days=60')
        ->dailyAt('02:15')
        ->withoutOverlapping()
        ->runInBackground()
        ->onFailure(function () {
            \Log::error('Error al ejecutar comando lecturas:compactar-15m');
        });
}
