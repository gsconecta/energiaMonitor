<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Programar obtención de lecturas de Shelly cada 5 minutos
Schedule::command('shelly:obtener-lecturas')
    ->everyThreeMinutes()
    ->withoutOverlapping()
    ->runInBackground()
    ->onFailure(function () {
        \Log::error('Error al ejecutar comando shelly:obtener-lecturas');
    });
