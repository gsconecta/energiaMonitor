<?php

use App\Models\Dispositivo;
use App\Models\Lectura;
use App\Models\ModeloDispositivo;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

uses(TestCase::class, DatabaseMigrations::class);

it('actualiza desde antes del catálogo conservando relaciones y lecturas', function () {
    // Retroceder solo las dos últimas migraciones crea el esquema anterior al catálogo.
    expect(Artisan::call('migrate:rollback', ['--step' => 2, '--force' => true]))->toBe(0);
    expect(Schema::hasColumn('dispositivos', 'modelo_dispositivo_id'))->toBeFalse();

    // Las factories del estado actual requieren catálogo; aquí insertamos el legado explícitamente.
    $org = \App\Models\Organizacion::factory()->create();
    $site = \App\Models\Sitio::factory()->for($org, 'organizacion')->create();
    $id = DB::table('dispositivos')->insertGetId([
        'sitio_id' => $site->id, 'device_id' => 'upgrade-synthetic', 'nombre' => 'Medidor legado',
        'modelo' => 'Shelly EM3', 'num_fases' => 2, 'tipo_canal_1' => 'red_electrica',
        'invertir_sentido_canal_1' => true, 'configuracion' => json_encode(['nota' => 'synthetic']),
    ]);
    $otherIds = [];
    foreach (['SHEM-3' => 'shelly-3em', ' Shelly Pro 3EM ' => 'shelly-pro-3em', 'Shelly Pro EM 50' => 'shelly-pro-em-50', 'Desconocido' => null] as $text => $code) {
        $otherId = DB::table('dispositivos')->insertGetId([
            'sitio_id' => $site->id, 'device_id' => 'synthetic-'.count($otherIds),
            'nombre' => 'Legado sintético', 'modelo' => $text, 'deleted_at' => now(),
        ]);
        $otherIds[$otherId] = $code;
    }
    DB::table('lecturas')->insert([
        'dispositivo_id' => $id, 'fecha_lectura' => '2026-09-04 12:00:00',
        'potencia_total_w' => 1200, 'energia_total_kwh' => 100.125,
    ]);

    expect(Artisan::call('migrate', ['--force' => true]))->toBe(0);
    $device = Dispositivo::findOrFail($id);
    expect($device->modeloDispositivo->codigo)->toBe('shelly-3em')
        ->and($device->modelo_legacy)->toBe('Shelly EM3')
        ->and($device->modo_canales->value)->toBe('circuitos')
        ->and($device->num_fases)->toBe(2)
        ->and($device->invertir_sentido_canal_1)->toBeTrue()
        ->and($device->configuracion)->toBe(['nota' => 'synthetic'])
        ->and($device->sitio_id)->toBe($site->id)
        ->and((float) Lectura::first()->energia_total_kwh)->toBe(100.125);
    foreach ($otherIds as $otherId => $code) {
        expect(Dispositivo::withTrashed()->findOrFail($otherId)->modeloDispositivo?->codigo)->toBe($code);
    }
    $device->update(['modo_canales' => 'fases']);
    $device->modeloDispositivo->update(['activo' => false, 'notas' => 'Edición sintética']);
    // Simula un reintento tras DDL ya aplicado; no debe pisar catálogo ni equipos asignados.
    $migration = require database_path('migrations/2026_09_04_000002_add_modelo_dispositivo_to_dispositivos_table.php');
    $migration->up();
    expect($device->fresh()->modo_canales->value)->toBe('fases')
        ->and($device->modeloDispositivo->fresh()->notas)->toBe('Edición sintética')
        ->and($device->modeloDispositivo->fresh()->activo)->toBeFalse();
    expect(Artisan::call('migrate', ['--force' => true]))->toBe(0);
    expect(ModeloDispositivo::count())->toBe(5)->and(Lectura::count())->toBe(1);
});

it('permite revertir y repetir la retirada de tipo sin duplicar índices', function () {
    $migration = require database_path('migrations/2025_12_16_123817_remove_tipo_from_dispositivos_table.php');
    $migration->down();
    expect(Schema::hasColumn('dispositivos', 'tipo'))->toBeTrue();
    $migration->up();
    expect(Schema::hasColumn('dispositivos', 'tipo'))->toBeFalse();
    $indexes = array_filter(Schema::getIndexes('dispositivos'), fn ($index) => $index['name'] === 'dispositivos_sitio_lookup');
    expect($indexes)->toHaveCount(1);
});
