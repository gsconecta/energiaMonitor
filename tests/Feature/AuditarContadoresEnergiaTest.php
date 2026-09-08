<?php

use App\Models\Dispositivo;
use App\Models\Lectura;

it('audita el dia seleccionado sin modificar contadores ni incluir otros equipos', function () {
    $device = Dispositivo::factory()->create();
    foreach ([0, 3] as $minute) {
        Lectura::factory()->create([
            'dispositivo_id' => $device->id,
            'fecha_lectura' => '2026-09-08 10:0'.$minute.':00',
            'energia_total_kwh' => 100000 + $minute * 100,
            'datos_raw' => ['device_status' => ['em:0' => ['a_act_power' => 1]]],
        ]);
    }
    Lectura::factory()->create(['dispositivo_id' => $device->id, 'fecha_lectura' => '2026-09-09 00:00:00']);
    Lectura::factory()->create(['fecha_lectura' => '2026-09-08 10:01:00']);
    $before = Lectura::orderBy('id')->get()->toArray();
    $this->artisan('energia:auditar-contadores', ['dispositivo' => $device->id, 'desde' => '2026-09-08'])
        ->expectsOutputToContain('"muestras": 2')
        ->assertSuccessful();
    expect(Lectura::orderBy('id')->get()->toArray())->toBe($before);
});

it('rechaza fechas y dispositivos invalidos', function (string $id, string $date) {
    $this->artisan('energia:auditar-contadores', ['dispositivo' => $id, 'desde' => $date])->assertFailed();
})->with([['1', '2026-02-30'], ['-1', '2026-09-08'], ['1', 'ayer']]);
