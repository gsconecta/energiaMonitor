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
        // Conservar el índice que soporta la FK antes de quitar el compuesto con tipo.
        $sitioColumn = Schema::hasColumn('dispositivos', 'sitio_id') ? 'sitio_id' : 'nave_id';
        Schema::table('dispositivos', fn (Blueprint $table) => $table->index($sitioColumn, 'dispositivos_sitio_lookup'));

        foreach (Schema::getIndexes('dispositivos') as $index) {
            if (! $index['primary'] && in_array('tipo', $index['columns'], true)) {
                Schema::table('dispositivos', fn (Blueprint $table) => $table->dropIndex($index['name']));
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
        Schema::table('dispositivos', fn (Blueprint $table) => $table->dropIndex('dispositivos_sitio_lookup'));
    }
};
