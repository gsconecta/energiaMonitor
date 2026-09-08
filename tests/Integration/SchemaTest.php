<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\Support\SchemaContract;

it('reconstruye las tablas y columnas de producción mediante las migraciones', function () {
    expect(DB::getDriverName())->toBe(getenv('ENERGIAMONITOR_TEST_MARIADB') === '1' ? 'mariadb' : 'sqlite');
    $expected = json_decode(file_get_contents(base_path('tests/Fixtures/schema/production-2026-09-05.json')), true)['schema'];
    if (DB::getDriverName() === 'mariadb') {
        expect(SchemaContract::capture())->toEqual($expected);
    } else {
        foreach ($expected as $name => $table) {
            $columns = Schema::getColumnListing($name);
            sort($columns);
            expect($columns)->toBe(array_keys($table['columns']), $name);
        }
    }
    expect(Schema::hasTable('naves'))->toBeFalse();
});
