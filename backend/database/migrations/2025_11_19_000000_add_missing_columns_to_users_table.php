<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('users', function (Blueprint $table) {
            // Add missing columns if they don't exist
            if (!Schema::hasColumn('users', 'organization_member')) {
                $table->boolean('organization_member')->default(false);
            }
            if (!Schema::hasColumn('users', 'can_scan')) {
                $table->boolean('can_scan')->default(false);
            }
        });
    }

    public function down()
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['organization_member', 'can_scan']);
        });
    }
};
