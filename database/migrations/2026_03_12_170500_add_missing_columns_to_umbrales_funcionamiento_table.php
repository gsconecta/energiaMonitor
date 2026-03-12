<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('umbrales_funcionamiento')) {
            return;
        }

        Schema::table('umbrales_funcionamiento', function (Blueprint $table) {
            if (!Schema::hasColumn('umbrales_funcionamiento', 'notificar_app')) {
                $table->boolean('notificar_app')->default(false)->after('activo');
            }

            if (!Schema::hasColumn('umbrales_funcionamiento', 'notificar_email')) {
                $table->boolean('notificar_email')->default(false)->after('notificar_app');
            }

            if (!Schema::hasColumn('umbrales_funcionamiento', 'notificar_telegram')) {
                $table->boolean('notificar_telegram')->default(false)->after('notificar_email');
            }

            if (!Schema::hasColumn('umbrales_funcionamiento', 'destinatarios_email')) {
                $table->json('destinatarios_email')->nullable()->after('notificar_telegram');
            }

            if (!Schema::hasColumn('umbrales_funcionamiento', 'hora_inicio')) {
                $table->time('hora_inicio')->default('00:00')->after('destinatarios_email');
            }

            if (!Schema::hasColumn('umbrales_funcionamiento', 'hora_fin')) {
                $table->time('hora_fin')->default('23:59')->after('hora_inicio');
            }

            if (!Schema::hasColumn('umbrales_funcionamiento', 'dias_semana')) {
                $table->json('dias_semana')->nullable()->after('hora_fin');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('umbrales_funcionamiento')) {
            return;
        }

        $columnsToDrop = [];

        foreach ([
            'dias_semana',
            'hora_fin',
            'hora_inicio',
            'destinatarios_email',
            'notificar_telegram',
            'notificar_email',
            'notificar_app',
        ] as $column) {
            if (Schema::hasColumn('umbrales_funcionamiento', $column)) {
                $columnsToDrop[] = $column;
            }
        }

        if ($columnsToDrop !== []) {
            Schema::table('umbrales_funcionamiento', function (Blueprint $table) use ($columnsToDrop) {
                $table->dropColumn($columnsToDrop);
            });
        }
    }
};
