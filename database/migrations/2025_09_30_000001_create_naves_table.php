<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('naves', function (Blueprint $table) {
            $table->id();
            $table->string('nombre');
            $table->string('ubicacion')->nullable();
            $table->string('codigo')->unique();
            $table->text('descripcion')->nullable();
            $table->boolean('activa')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('naves');
    }
};

// database/migrations/2025_09_30_000002_create_dispositivos_table.php

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dispositivos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('nave_id')->constrained('naves')->onDelete('cascade');
            $table->string('device_id')->unique(); // shellyem3-C8C9A33E6505
            $table->string('nombre');
            $table->enum('tipo', ['produccion', 'consumo', 'red', 'bateria', 'otro']);
            $table->string('modelo')->default('Shelly EM3');
            $table->string('ip_local')->nullable();
            $table->string('firmware')->nullable();
            $table->boolean('activo')->default(true);
            $table->json('configuracion')->nullable(); // Para guardar config específica
            $table->timestamps();
            $table->softDeletes();
            
            $table->index(['nave_id', 'tipo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dispositivos');
    }
};