<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('dispositivo_umbral')) {
            return;
        }

        Schema::create('dispositivo_umbral', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dispositivo_id')->constrained('dispositivos')->cascadeOnDelete();
            $table->foreignId('umbral_funcionamiento_id')->constrained('umbrales_funcionamiento')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['dispositivo_id', 'umbral_funcionamiento_id'], 'dispositivo_umbral_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dispositivo_umbral');
    }
};
