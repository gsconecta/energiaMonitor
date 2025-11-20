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
        Schema::table('dispositivos', function (Blueprint $table) {
            $table->string('nombre_canal_1')->nullable()->after('num_fases');
            $table->string('nombre_canal_2')->nullable()->after('nombre_canal_1');
            $table->string('nombre_canal_3')->nullable()->after('nombre_canal_2');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dispositivos', function (Blueprint $table) {
            $table->dropColumn(['nombre_canal_1', 'nombre_canal_2', 'nombre_canal_3']);
        });
    }
};
