<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('metricas_diarias', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dispositivo_id')->constrained('dispositivos')->onDelete('cascade');
            $table->date('fecha')->index();
            
            // Energía del día
            $table->decimal('energia_generada_kwh', 10, 3)->nullable();
            $table->decimal('energia_consumida_kwh', 10, 3)->nullable();
            $table->decimal('energia_vertida_kwh', 10, 3)->nullable();
            $table->decimal('energia_importada_kwh', 10, 3)->nullable();
            
            // Potencias máximas del día
            $table->decimal('potencia_max_w', 10, 2)->nullable();
            $table->timestamp('hora_potencia_max')->nullable();
            $table->decimal('potencia_min_w', 10, 2)->nullable();
            $table->timestamp('hora_potencia_min')->nullable();
            $table->decimal('potencia_promedio_w', 10, 2)->nullable();
            
            // Voltajes del día
            $table->decimal('voltaje_max', 6, 2)->nullable();
            $table->decimal('voltaje_min', 6, 2)->nullable();
            $table->decimal('voltaje_promedio', 6, 2)->nullable();
            
            // Factor de potencia
            $table->decimal('pf_promedio', 4, 3)->nullable();
            $table->decimal('pf_min', 4, 3)->nullable();
            
            // Disponibilidad
            $table->integer('minutos_online')->default(0);
            $table->integer('minutos_offline')->default(0);
            $table->decimal('disponibilidad_porcentaje', 5, 2)->nullable();
            
            // Contadores
            $table->integer('numero_lecturas')->default(0);
            $table->integer('numero_alertas')->default(0);
            
            $table->timestamps();
            
            $table->unique(['dispositivo_id', 'fecha']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('metricas_diarias');
    }
};