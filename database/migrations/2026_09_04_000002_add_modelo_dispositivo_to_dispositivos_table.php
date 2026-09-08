<?php

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
                $table->string('modo_canales', 20)->default('circuitos')->after('num_fases');
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

        // Datos históricos congelados: no ejecutar los modelos/seeders de una versión futura.
        // DDL guardado por columnas y datos en transacción para permitir reintentos en MariaDB.
        DB::transaction(function () {
            $catalogo = json_decode(file_get_contents(__DIR__.'/data/2026_09_04_modelos_dispositivo.json'), true, flags: JSON_THROW_ON_ERROR);
            foreach ($catalogo as $modelo) {
                if (! DB::table('modelos_dispositivo')->where('codigo', $modelo['codigo'])->exists()) {
                    $modelo['magnitudes'] = json_encode($modelo['magnitudes'], JSON_THROW_ON_ERROR);
                    DB::table('modelos_dispositivo')->insert($modelo + ['created_at' => now(), 'updated_at' => now()]);
                }
            }

            $codigos = [
                'shem-3' => 'shelly-3em',
                'shelly em3' => 'shelly-3em',
                'shelly pro 3em' => 'shelly-pro-3em',
                'shelly pro em 50' => 'shelly-pro-em-50',
            ];
            $ids = DB::table('modelos_dispositivo')->pluck('id', 'codigo');
            $resultado = ['asignados' => 0, 'sin_modelo' => 0];
            DB::table('dispositivos')->whereNull('modelo_dispositivo_id')
                ->select(['id', 'modelo_legacy'])->orderBy('id')
                ->chunkById(500, function ($filas) use ($codigos, $ids, &$resultado) {
                    foreach ($filas as $fila) {
                        $codigo = $codigos[mb_strtolower(trim((string) $fila->modelo_legacy))] ?? null;
                        $modeloId = $codigo === null ? null : $ids->get($codigo);
                        DB::table('dispositivos')->where('id', $fila->id)->update([
                            'modelo_dispositivo_id' => $modeloId, 'modo_canales' => 'circuitos',
                        ]);
                        $resultado[$modeloId === null ? 'sin_modelo' : 'asignados']++;
                    }
                });

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
