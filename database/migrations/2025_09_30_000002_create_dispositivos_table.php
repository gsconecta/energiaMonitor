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

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dispositivos');
    }
};