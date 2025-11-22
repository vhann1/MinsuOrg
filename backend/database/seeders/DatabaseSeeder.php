<?php

namespace Database\Seeders;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run()
    {
        // Create default organization
        $organization = Organization::create([
            'name' => 'MINSU Main Organization',
            'code' => 'MINSU_MAIN',
            'attendance_fine' => 100.00
        ]);

        // Create admin user only
        User::create([
            'student_id' => 'admin001',
            'first_name' => 'System',
            'last_name' => 'Admin',
            'email' => 'admin@gmail.com',
            'password' => Hash::make('12345678'),
            'is_officer' => true,
            'organization_member' => true,
            'can_scan' => true,
            'organization_id' => $organization->id
        ]);

        $this->command->info('Database seeded successfully!');
        $this->command->info('Admin Login: admin@gmail.com / 12345678');
        $this->command->info('Add your own test data through the application');
    }
}