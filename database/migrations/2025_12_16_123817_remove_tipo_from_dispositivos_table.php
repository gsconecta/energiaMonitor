<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Eliminar índices que incluyan 'tipo' si existen
        $indexes = DB::select("SHOW INDEX FROM dispositivos WHERE Column_name = 'tipo'");
        
        foreach ($indexes as $index) {
            $indexName = $index->Key_name;
            if ($indexName !== 'PRIMARY') {
                try {
                    DB::statement("ALTER TABLE dispositivos DROP INDEX `{$indexName}`");
                } catch (\Exception $e) {
                    // Continuar si el índice no existe
                }
            }
        }
        
        // Eliminar la columna tipo
        Schema::table('dispositivos', function (Blueprint $table) {
            $table->dropColumn('tipo');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dispositivos', function (Blueprint $table) {
            $table->enum('tipo', ['produccion', 'consumo', 'red', 'bateria', 'otro'])->after('nombre');
        });
        
        Schema::table('dispositivos', function (Blueprint $table) {
            // Recrear índice si es necesario
            if (Schema::hasColumn('dispositivos', 'sitio_id')) {
                $table->index(['sitio_id', 'tipo']);
            } elseif (Schema::hasColumn('dispositivos', 'nave_id')) {
                $table->index(['nave_id', 'tipo']);
            }
        });
    }
};
