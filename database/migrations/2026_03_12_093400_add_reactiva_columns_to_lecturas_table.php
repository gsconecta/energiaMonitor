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
        Schema::table('lecturas', function (Blueprint $table) {
            // Potencia Reactiva (VAR) - mismo tipo que potencia_canal_*_w
            $table->decimal('reactiva_canal_1_var', 10, 2)->nullable()->after('potencia_canal_3_w');
            $table->decimal('reactiva_canal_2_var', 10, 2)->nullable()->after('reactiva_canal_1_var');
            $table->decimal('reactiva_canal_3_var', 10, 2)->nullable()->after('reactiva_canal_2_var');
            $table->decimal('reactiva_total_var', 10, 2)->nullable()->after('reactiva_canal_3_var');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lecturas', function (Blueprint $table) {
            $table->dropColumn([
                'reactiva_canal_1_var',
                'reactiva_canal_2_var',
                'reactiva_canal_3_var',
                'reactiva_total_var',
            ]);
        });
    }
};
