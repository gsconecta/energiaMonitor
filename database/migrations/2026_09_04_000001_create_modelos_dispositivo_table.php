<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('modelos_dispositivo', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 60)->unique();
            $table->string('fabricante', 60);
            $table->string('familia', 60)->nullable();
            $table->string('nombre', 120);
            $table->string('driver', 30);
            $table->unsignedTinyInteger('num_canales');
            $table->string('modo_canales_por_defecto', 20);
            $table->boolean('modo_canales_configurable')->default(false);
            $table->json('magnitudes')->nullable();
            $table->boolean('activo')->default(true);
            $table->text('notas')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('modelos_dispositivo');
    }
};
