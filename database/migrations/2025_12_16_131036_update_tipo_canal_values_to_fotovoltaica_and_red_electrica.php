<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Actualizar valores existentes: generacion -> fotovoltaica, consumo -> red_electrica
        DB::table('dispositivos')
            ->where('tipo_canal_1', 'generacion')
            ->update(['tipo_canal_1' => 'fotovoltaica']);
        
        DB::table('dispositivos')
            ->where('tipo_canal_1', 'consumo')
            ->update(['tipo_canal_1' => 'red_electrica']);
        
        DB::table('dispositivos')
            ->where('tipo_canal_2', 'generacion')
            ->update(['tipo_canal_2' => 'fotovoltaica']);
        
        DB::table('dispositivos')
            ->where('tipo_canal_2', 'consumo')
            ->update(['tipo_canal_2' => 'red_electrica']);
        
        DB::table('dispositivos')
            ->where('tipo_canal_3', 'generacion')
            ->update(['tipo_canal_3' => 'fotovoltaica']);
        
        DB::table('dispositivos')
            ->where('tipo_canal_3', 'consumo')
            ->update(['tipo_canal_3' => 'red_electrica']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revertir: fotovoltaica -> generacion, red_electrica -> consumo
        DB::table('dispositivos')
            ->where('tipo_canal_1', 'fotovoltaica')
            ->update(['tipo_canal_1' => 'generacion']);
        
        DB::table('dispositivos')
            ->where('tipo_canal_1', 'red_electrica')
            ->update(['tipo_canal_1' => 'consumo']);
        
        DB::table('dispositivos')
            ->where('tipo_canal_2', 'fotovoltaica')
            ->update(['tipo_canal_2' => 'generacion']);
        
        DB::table('dispositivos')
            ->where('tipo_canal_2', 'red_electrica')
            ->update(['tipo_canal_2' => 'consumo']);
        
        DB::table('dispositivos')
            ->where('tipo_canal_3', 'fotovoltaica')
            ->update(['tipo_canal_3' => 'generacion']);
        
        DB::table('dispositivos')
            ->where('tipo_canal_3', 'red_electrica')
            ->update(['tipo_canal_3' => 'consumo']);
    }
};
