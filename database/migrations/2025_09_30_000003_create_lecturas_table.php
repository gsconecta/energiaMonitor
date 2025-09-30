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
        Schema::create('lecturas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dispositivo_id')->constrained('dispositivos')->onDelete('cascade');
            $table->timestamp('fecha_lectura');
            
            // Potencia instantánea (W)
            $table->decimal('potencia_total_w', 10, 2);
            $table->decimal('potencia_canal_1_w', 10, 2)->nullable();
            $table->decimal('potencia_canal_2_w', 10, 2)->nullable();
            $table->decimal('potencia_canal_3_w', 10, 2)->nullable();
            
            // Energía acumulada (kWh)
            $table->decimal('energia_total_kwh', 12, 3);
            $table->decimal('energia_retornada_kwh', 12, 3)->default(0);
            $table->decimal('energia_canal_1_kwh', 12, 3)->nullable();
            $table->decimal('energia_canal_2_kwh', 12, 3)->nullable();
            $table->decimal('energia_canal_3_kwh', 12, 3)->nullable();
            
            // Voltajes (V)
            $table->decimal('voltaje_canal_1', 6, 2)->nullable();
            $table->decimal('voltaje_canal_2', 6, 2)->nullable();
            $table->decimal('voltaje_canal_3', 6, 2)->nullable();
            $table->decimal('voltaje_promedio', 6, 2)->nullable();
            
            // Corrientes (A)
            $table->decimal('corriente_canal_1', 8, 3)->nullable();
            $table->decimal('corriente_canal_2', 8, 3)->nullable();
            $table->decimal('corriente_canal_3', 8, 3)->nullable();
            $table->decimal('corriente_neutro', 8, 3)->nullable();
            
            // Factor de potencia (0-1)
            $table->decimal('pf_canal_1', 4, 3)->nullable();
            $table->decimal('pf_canal_2', 4, 3)->nullable();
            $table->decimal('pf_canal_3', 4, 3)->nullable();
            
            // Estado del dispositivo
            $table->boolean('online')->default(true);
            $table->boolean('wifi_conectado')->default(true);
            $table->integer('wifi_rssi')->nullable();
            $table->boolean('cloud_conectado')->default(true);
            $table->integer('uptime_segundos')->nullable();
            
            // Validez de mediciones
            $table->boolean('canal_1_valido')->default(true);
            $table->boolean('canal_2_valido')->default(true);
            $table->boolean('canal_3_valido')->default(true);
            
            // Metadata
            $table->json('datos_raw')->nullable(); // Para guardar el JSON completo si lo necesitas
            
            $table->timestamps();
            
            // Índices para consultas rápidas (SIN DUPLICAR)
            $table->index(['dispositivo_id', 'fecha_lectura']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lecturas');
    }
};