<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('umbrales_funcionamiento')) {
            return;
        }

        Schema::table('umbrales_funcionamiento', function (Blueprint $table) {
            $table->enum('metrica', [
                'voltaje',
                'corriente',
                'potencia_activa',
                'potencia_fotovoltaica',
                'potencia_reactiva',
                'factor_potencia',
                'energia_consumo',
                'generacion_fv',
            ])->change();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('umbrales_funcionamiento')) {
            return;
        }

        Schema::table('umbrales_funcionamiento', function (Blueprint $table) {
            $table->enum('metrica', [
                'voltaje',
                'corriente',
                'potencia_activa',
                'potencia_reactiva',
                'factor_potencia',
                'energia_consumo',
                'generacion_fv',
            ])->change();
        });
    }
};
