<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Organization;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run()
    {
        // Create default organization if not exists
        $organization = Organization::firstOrCreate(
            ['id' => 1],
            [
                'name' => 'MINSU Main Organization',
                'attendance_fine' => 100.00,
            ]
        );

        // Create admin user
        User::firstOrCreate(
            ['email' => 'admin@gmail.com'],
            [
                'student_id' => 'admin001',
                'first_name' => 'System',
                'last_name' => 'Admin',
                'password' => Hash::make('12345678'),
                'is_officer' => true,
                'organization_member' => true,
                'can_scan' => true,
                'organization_id' => $organization->id,
            ]
        );

        $this->command->info('Admin user created: admin@gmail.com / 12345678');
    }
}