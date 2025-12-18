<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('lecturas', function (Blueprint $table) {
            $table->dropColumn([
                'cloud_conectado',
                'canal_1_valido',
                'canal_2_valido',
                'canal_3_valido',
            ]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lecturas', function (Blueprint $table) {
            $table->boolean('cloud_conectado')->default(true)->after('wifi_rssi');
            $table->boolean('canal_1_valido')->default(true)->after('uptime_segundos');
            $table->boolean('canal_2_valido')->default(true)->after('canal_1_valido');
            $table->boolean('canal_3_valido')->default(true)->after('canal_2_valido');
        });
    }
};
