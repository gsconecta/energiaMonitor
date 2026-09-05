<?php

use App\Enums\ModoCanales;
use App\Services\Dispositivos\AsignadorModeloLegado;
use Database\Seeders\ModeloDispositivoSeeder;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Cada paso de esquema va guardado por su propia condición (ver comentario de
        // re-entrancia más abajo, junto a la transacción de datos).
        if (! Schema::hasColumn('dispositivos', 'modelo_dispositivo_id')) {
            Schema::table('dispositivos', function (Blueprint $table) {
                $table->foreignId('modelo_dispositivo_id')
                    ->nullable()
                    ->after('sitio_id')
                    ->constrained('modelos_dispositivo')
                    ->restrictOnDelete();
            });
        }

        if (! Schema::hasColumn('dispositivos', 'modo_canales')) {
            Schema::table('dispositivos', function (Blueprint $table) {
                $table->string('modo_canales', 20)->default(ModoCanales::Circuitos->value)->after('num_fases');
            });
        }

        if (Schema::hasColumn('dispositivos', 'modelo')) {
            Schema::table('dispositivos', function (Blueprint $table) {
                $table->renameColumn('modelo', 'modelo_legacy');
            });
        }

        // Incondicional y fuera del if anterior a propósito: en un reintento, el rename ya se
        // habrá aplicado (hasColumn('modelo') sería false) y este `change()` es el único sitio
        // que sigue corrigiendo la columna. Sin él, `modelo_legacy` conserva NOT NULL DEFAULT
        // 'Shelly EM3' heredado de la columna original (2025_09_30_000002_create_dispositivos_table):
        // como `modelo` ya no está en $fillable, todo dispositivo nuevo nacería con ese texto fijo,
        // incluido un Circutor, y esa es justo la columna que publica /api/sql-dispositivos-activos.
        // Repetir este `change()` sobre una columna que ya quedó nullable/default null no falla:
        // MySQL vuelve a aplicar la misma definición.
        Schema::table('dispositivos', function (Blueprint $table) {
            $table->string('modelo_legacy')->nullable()->default(null)->change();
        });

        // Se siembra y se asigna el legado reutilizando el seeder y AsignadorModeloLegado, en vez de con
        // DB::table literal como hace 2026_03_10_111358_add_credencial_shelly_id_to_organizaciones_table
        // ("para no depender de modelos Eloquent mutables"): aquí no aplica el riesgo que ese precedente
        // evita, que un replay del historial ejecute las clases de hoy contra el esquema de ayer, porque
        // el historial de este proyecto ya no es reproducible (2025_11_20_090702_create_organizaciones_table
        // crea `organizaciones` solo con id+timestamps, sin `nombre`/`shelly_api_key`/etc., y
        // 2025_11_20_091034_rename_naves_to_sitios_and_add_organizacion_id tiene el cuerpo vacío). A cambio,
        // el catálogo no se duplica y el mapeo del legado queda cubierto por tests.
        //
        // Re-entrancia: en MySQL el DDL de arriba se auto-commitea columna a columna, así que si el
        // seeder o el asignador lanzan, Laravel no marca esta migración como ejecutada pero el esquema
        // ya está aplicado; sin las guardas de arriba, el siguiente `migrate` reventaría con "Duplicate
        // column name" al reintentar el mismo ALTER TABLE. La parte de datos va en su propia transacción
        // para que un fallo a mitad dentro de ella (seeder ok, asignador falla, o viceversa) no dañe el
        // esquema y el reintento la repita entera desde cero sobre datos limpios.
        DB::transaction(function () {
            (new ModeloDispositivoSeeder)->run();

            $resultado = (new AsignadorModeloLegado)->asignarTodos();

            Log::info('Catálogo de modelos: asignación del legado terminada.', $resultado);
        });
    }

    public function down(): void
    {
        Schema::table('dispositivos', function (Blueprint $table) {
            $table->renameColumn('modelo_legacy', 'modelo');
        });

        Schema::table('dispositivos', function (Blueprint $table) {
            $table->dropColumn('modo_canales');
            $table->dropConstrainedForeignId('modelo_dispositivo_id');
        });
    }
};
