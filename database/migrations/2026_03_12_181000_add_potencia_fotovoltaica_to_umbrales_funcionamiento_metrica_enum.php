<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('umbrales_funcionamiento')) {
            return;
        }

        DB::statement(
            "ALTER TABLE umbrales_funcionamiento MODIFY metrica ENUM(
                'voltaje',
                'corriente',
                'potencia_activa',
                'potencia_fotovoltaica',
                'potencia_reactiva',
                'factor_potencia',
                'energia_consumo',
                'generacion_fv'
            ) NOT NULL"
        );
    }

    public function down(): void
    {
        if (!Schema::hasTable('umbrales_funcionamiento')) {
            return;
        }

        DB::statement(
            "ALTER TABLE umbrales_funcionamiento MODIFY metrica ENUM(
                'voltaje',
                'corriente',
                'potencia_activa',
                'potencia_reactiva',
                'factor_potencia',
                'energia_consumo',
                'generacion_fv'
            ) NOT NULL"
        );
    }
};
