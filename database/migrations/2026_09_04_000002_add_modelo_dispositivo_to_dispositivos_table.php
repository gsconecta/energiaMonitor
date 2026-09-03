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
