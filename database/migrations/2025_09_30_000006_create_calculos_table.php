<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('calculos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('nave_id')->constrained('naves')->onDelete('cascade');
            $table->timestamp('fecha_calculo')->index();
            
            // Balance energético instantáneo
            $table->decimal('produccion_solar_kw', 10, 3)->default(0);
            $table->decimal('consumo_nave_kw', 10, 3)->default(0);
            $table->decimal('vertido_red_kw', 10, 3)->default(0);
            $table->decimal('importacion_red_kw', 10, 3)->default(0);
            $table->decimal('autoconsumo_kw', 10, 3)->default(0);
            
            // Porcentajes
            $table->decimal('porcentaje_autoconsumo', 5, 2)->nullable();
            $table->decimal('porcentaje_autosuficiencia', 5, 2)->nullable();
            
            // Baterías (si aplica)
            $table->decimal('carga_bateria_kw', 10, 3)->nullable();
            $table->decimal('descarga_bateria_kw', 10, 3)->nullable();
            $table->decimal('soc_bateria_porcentaje', 5, 2)->nullable();
            
            // CO2 ahorrado (estimado)
            $table->decimal('co2_ahorrado_kg', 10, 3)->nullable();
            
            // Ahorro económico estimado
            $table->decimal('ahorro_estimado_euros', 10, 2)->nullable();
            
            $table->timestamps();
            
            $table->index(['nave_id', 'fecha_calculo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('calculos');
    }
};