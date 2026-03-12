<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('metricas_quince_minutos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dispositivo_id')->constrained('dispositivos')->onDelete('cascade');
            $table->timestamp('intervalo_inicio');
            $table->timestamp('intervalo_fin');
            $table->timestamp('primera_lectura_at')->nullable();
            $table->timestamp('ultima_lectura_at')->nullable();

            $table->decimal('energia_consumida_kwh', 12, 4)->default(0);
            $table->decimal('energia_generada_kwh', 12, 4)->default(0);
            $table->decimal('energia_importada_kwh', 12, 4)->default(0);
            $table->decimal('energia_exportada_kwh', 12, 4)->default(0);

            $table->decimal('potencia_promedio_w', 12, 2)->nullable();
            $table->decimal('potencia_max_w', 12, 2)->nullable();
            $table->timestamp('hora_potencia_max')->nullable();
            $table->decimal('potencia_min_w', 12, 2)->nullable();
            $table->timestamp('hora_potencia_min')->nullable();

            $table->decimal('voltaje_promedio', 8, 2)->nullable();
            $table->decimal('corriente_promedio_1', 10, 3)->nullable();
            $table->decimal('corriente_promedio_2', 10, 3)->nullable();
            $table->decimal('corriente_promedio_3', 10, 3)->nullable();
            $table->decimal('pf_promedio', 6, 4)->nullable();
            $table->decimal('reactiva_promedio_var', 12, 2)->nullable();

            $table->integer('numero_lecturas')->default(0);
            $table->integer('minutos_online')->default(0);
            $table->integer('minutos_offline')->default(0);
            $table->json('resumen')->nullable();
            $table->timestamps();

            $table->unique(['dispositivo_id', 'intervalo_inicio'], 'metricas_15m_dispositivo_intervalo_unique');
            $table->index(['intervalo_inicio', 'intervalo_fin'], 'metricas_15m_intervalo_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('metricas_quince_minutos');
    }
};
