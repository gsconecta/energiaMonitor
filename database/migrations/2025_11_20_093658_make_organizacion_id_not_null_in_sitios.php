<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Nunca atribuir instalaciones históricas a un cliente inventado.
        if (DB::table('sitios')->whereNull('organizacion_id')->exists()) {
            throw new RuntimeException('Asigne organizacion_id a los sitios heredados antes de continuar la migración.');
        }
        Schema::table('sitios', function (Blueprint $table) {
            $table->unsignedBigInteger('organizacion_id')->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('sitios', function (Blueprint $table) {
            $table->unsignedBigInteger('organizacion_id')->nullable()->change();
        });
    }
};
