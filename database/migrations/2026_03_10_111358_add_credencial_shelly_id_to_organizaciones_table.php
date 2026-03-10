<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('organizaciones', function (Blueprint $table) {
            $table->foreignId('credencial_shelly_id')->nullable()->constrained('credencial_shellies')->nullOnDelete();
        });

        // Migrar datos existentes directamente usando DB facade para no depender de modelos Eloquent mutables
        $organizacionesConShelly = DB::table('organizaciones')
            ->whereNotNull('shelly_api_key')
            ->orWhereNotNull('shelly_server')
            ->get();

        foreach ($organizacionesConShelly as $org) {
            if (!$org->shelly_api_key && !$org->shelly_server) {
                continue;
            }

            // Crear registro en la nueva tabla
            $credencialId = DB::table('credencial_shellies')->insertGetId([
                'nombre' => 'Credencial heredada de ' . $org->nombre,
                'server' => $org->shelly_server,
                'api_key' => $org->shelly_api_key, // Ya está encriptado en bd, se copia tal cual
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Actualizar la organización con el id
            DB::table('organizaciones')
                ->where('id', $org->id)
                ->update(['credencial_shelly_id' => $credencialId]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('organizaciones', function (Blueprint $table) {
            $table->dropForeign(['credencial_shelly_id']);
            $table->dropColumn('credencial_shelly_id');
        });
    }
};
