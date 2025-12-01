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
            $table->string('color_canal_1', 7)->nullable()->default('#ef4444')->after('nombre_canal_1');
            $table->string('color_canal_2', 7)->nullable()->default('#22c55e')->after('nombre_canal_2');
            $table->string('color_canal_3', 7)->nullable()->default('#eab308')->after('nombre_canal_3');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dispositivos', function (Blueprint $table) {
            $table->dropColumn(['color_canal_1', 'color_canal_2', 'color_canal_3']);
        });
    }
};
