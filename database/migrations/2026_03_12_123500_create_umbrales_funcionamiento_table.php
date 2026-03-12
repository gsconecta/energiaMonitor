<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('umbrales_funcionamiento', function (Blueprint $table) {
            $table->id();
            $table->string('nombre');
            $table->enum('metrica', [
                'voltaje',
                'corriente',
                'potencia_activa',
                'potencia_reactiva',
                'factor_potencia',
                'energia_consumo',
                'generacion_fv',
            ]);
            $table->decimal('valor_minimo', 12, 2)->nullable();
            $table->decimal('valor_maximo', 12, 2)->nullable();
            $table->enum('severidad', ['info', 'warning', 'critical'])->default('warning');
            $table->boolean('activo')->default(true);
            $table->boolean('notificar_app')->default(false);
            $table->boolean('notificar_email')->default(false);
            $table->boolean('notificar_telegram')->default(false);
            $table->json('destinatarios_email')->nullable();
            $table->timestamps();
        });

        Schema::create('organizacion_umbral', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organizacion_id')->constrained('organizaciones')->cascadeOnDelete();
            $table->foreignId('umbral_funcionamiento_id')->constrained('umbrales_funcionamiento')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['organizacion_id', 'umbral_funcionamiento_id'], 'org_umbral_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organizacion_umbral');
        Schema::dropIfExists('umbrales_funcionamiento');
    }
};
