<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('dispositivos', function (Blueprint $table) {
            $table->boolean('invertir_sentido_canal_1')->default(false)->after('tipo_canal_1');
            $table->boolean('invertir_sentido_canal_2')->default(false)->after('tipo_canal_2');
            $table->boolean('invertir_sentido_canal_3')->default(false)->after('tipo_canal_3');
        });

        DB::table('dispositivos')
            ->where('tipo_canal_1', 'fotovoltaica')
            ->update(['invertir_sentido_canal_1' => true]);

        DB::table('dispositivos')
            ->where('tipo_canal_2', 'fotovoltaica')
            ->update(['invertir_sentido_canal_2' => true]);

        DB::table('dispositivos')
            ->where('tipo_canal_3', 'fotovoltaica')
            ->update(['invertir_sentido_canal_3' => true]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dispositivos', function (Blueprint $table) {
            $table->dropColumn([
                'invertir_sentido_canal_1',
                'invertir_sentido_canal_2',
                'invertir_sentido_canal_3',
            ]);
        });
    }
};
