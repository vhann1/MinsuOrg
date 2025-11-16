<?php
// database/migrations/xxxx_xx_xx_xxxxxx_add_organization_fields_to_users_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('users', function (Blueprint $table) {
            // Add missing columns
            if (!Schema::hasColumn('users', 'organization_member')) {
                $table->boolean('organization_member')->default(false)->after('is_officer');
            }
            
            if (!Schema::hasColumn('users', 'can_scan')) {
                $table->boolean('can_scan')->default(false)->after('organization_member');
            }
            
            if (!Schema::hasColumn('users', 'organization_id')) {
                $table->foreignId('organization_id')->nullable()->after('can_scan')->constrained()->onDelete('cascade');
            }
            
            if (!Schema::hasColumn('users', 'student_id')) {
                $table->string('student_id')->unique()->nullable()->after('id');
            }
            
            if (!Schema::hasColumn('users', 'qr_code')) {
                $table->string('qr_code')->nullable()->after('remember_token');
            }
        });
    }

    public function down()
    {
        Schema::table('users', function (Blueprint $table) {
            // Remove columns if rolling back
            $table->dropColumn(['organization_member', 'can_scan', 'organization_id', 'student_id', 'qr_code']);
        });
    }
};