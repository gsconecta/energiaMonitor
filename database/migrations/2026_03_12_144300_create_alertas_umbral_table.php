<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('alertas_umbral', function (Blueprint $table) {
            $table->id();
            $table->foreignId('umbral_funcionamiento_id')->constrained('umbrales_funcionamiento')->cascadeOnDelete();
            $table->foreignId('lectura_id')->constrained('lecturas')->cascadeOnDelete();
            $table->foreignId('dispositivo_id')->constrained('dispositivos')->cascadeOnDelete();
            $table->string('metrica');
            $table->string('canal')->nullable(); // canal_1, canal_2, canal_3, total
            $table->decimal('valor_leido', 12, 2);
            $table->decimal('valor_minimo', 12, 2)->nullable();
            $table->decimal('valor_maximo', 12, 2)->nullable();
            $table->enum('severidad', ['info', 'warning', 'critical'])->default('warning');
            $table->boolean('resuelta')->default(false);
            $table->timestamp('resuelta_at')->nullable();
            $table->timestamps();

            // Índice para búsqueda rápida de cooldown
            $table->index(['umbral_funcionamiento_id', 'dispositivo_id', 'canal', 'resuelta'], 'alerta_cooldown_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alertas_umbral');
    }
};
