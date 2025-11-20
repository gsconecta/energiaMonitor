<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    /**
     * Run the migrations.
     * 
     * Agrega el campo num_fases para identificar si un dispositivo es:
     * - 1: Monofásico (1 fase)
     * - 2: Bifásico (2 fases/canales)
     * - 3: Trifásico (3 fases)
     */
    public function up(): void
    {
        Schema::table('dispositivos', function (Blueprint $table) {
            $table->tinyInteger('num_fases')->nullable()->after('tipo')->comment('Número de fases: 1=monofásico, 2=bifásico, 3=trifásico');
            
            // Índice para consultas por número de fases
            $table->index('num_fases');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dispositivos', function (Blueprint $table) {
            $table->dropIndex(['num_fases']);
            $table->dropColumn('num_fases');
        });
    }
};
