<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::rename('naves', 'sitios');
        Schema::table('sitios', function (Blueprint $table) {
            $table->foreignId('organizacion_id')->nullable()->after('id')->index()
                ->constrained('organizaciones')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('sitios', function (Blueprint $table) {
            $table->dropForeign(['organizacion_id']);
            $table->dropIndex(['organizacion_id']);
            $table->dropColumn('organizacion_id');
        });
        Schema::rename('sitios', 'naves');
    }
};
