<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('alertas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dispositivo_id')->constrained('dispositivos')->onDelete('cascade');
            $table->enum('tipo', [
                'offline',
                'bajo_rendimiento',
                'alto_consumo',
                'voltaje_anormal',
                'factor_potencia_bajo',
                'otro'
            ]);
            $table->enum('nivel', ['info', 'warning', 'error', 'critical'])->default('warning');
            $table->string('titulo');
            $table->text('descripcion');
            $table->decimal('valor_medido', 10, 2)->nullable();
            $table->decimal('valor_umbral', 10, 2)->nullable();
            $table->timestamp('fecha_alerta');
            $table->timestamp('fecha_resolucion')->nullable();
            $table->boolean('resuelta')->default(false);
            $table->text('notas')->nullable();
            $table->timestamps();
            
            $table->index(['dispositivo_id', 'resuelta']);
            $table->index('fecha_alerta');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alertas');
    }
};
