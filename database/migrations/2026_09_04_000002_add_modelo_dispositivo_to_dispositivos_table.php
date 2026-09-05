<?php

use App\Enums\ModoCanales;
use App\Services\Dispositivos\AsignadorModeloLegado;
use Database\Seeders\ModeloDispositivoSeeder;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dispositivos', function (Blueprint $table) {
            $table->foreignId('modelo_dispositivo_id')
                ->nullable()
                ->after('sitio_id')
                ->constrained('modelos_dispositivo')
                ->restrictOnDelete();
            $table->string('modo_canales', 20)->default(ModoCanales::Circuitos->value)->after('num_fases');
        });

        Schema::table('dispositivos', function (Blueprint $table) {
            $table->renameColumn('modelo', 'modelo_legacy');
        });

        // Se siembra y se asigna el legado reutilizando el seeder y AsignadorModeloLegado, en vez de con
        // DB::table literal como hace 2026_03_10_111358_add_credencial_shelly_id_to_organizaciones_table
        // ("para no depender de modelos Eloquent mutables"): aquí no aplica el riesgo que ese precedente
        // evita, que un replay del historial ejecute las clases de hoy contra el esquema de ayer, porque
        // el historial de este proyecto ya no es reproducible (2025_11_20_090702_create_organizaciones_table
        // crea `organizaciones` solo con id+timestamps, sin `nombre`/`shelly_api_key`/etc., y
        // 2025_11_20_091034_rename_naves_to_sitios_and_add_organizacion_id tiene el cuerpo vacío). A cambio,
        // el catálogo no se duplica y el mapeo del legado queda cubierto por tests.
        (new ModeloDispositivoSeeder)->run();

        $resultado = (new AsignadorModeloLegado)->asignarTodos();

        Log::info('Catálogo de modelos: asignación del legado terminada.', $resultado);
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
