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
        Schema::table('organizaciones', function (Blueprint $table) {
            $table->string('shelly_server')->nullable()->after('shelly_api_key');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('organizaciones', function (Blueprint $table) {
            $table->dropColumn('shelly_server');
        });
    }
};
