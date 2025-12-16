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
            $table->string('tipo_canal_1', 20)->nullable()->after('color_canal_1')->comment('fotovoltaica o red_electrica');
            $table->string('tipo_canal_2', 20)->nullable()->after('color_canal_2')->comment('fotovoltaica o red_electrica');
            $table->string('tipo_canal_3', 20)->nullable()->after('color_canal_3')->comment('fotovoltaica o red_electrica');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dispositivos', function (Blueprint $table) {
            $table->dropColumn(['tipo_canal_1', 'tipo_canal_2', 'tipo_canal_3']);
        });
    }
};
