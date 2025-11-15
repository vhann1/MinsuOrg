<?php
// database/seeders/UserSeeder.php
namespace Database\Seeders;

use App\Models\User;
use App\Models\Organization;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $organizations = Organization::all();

        if ($organizations->isEmpty()) {
            $this->command->warn('No organizations found. Please run OrganizationSeeder first.');
            return;
        }

        $mainOrg = $organizations->first();

        // Create admin/officer users only if they don't exist
        User::firstOrCreate(
            ['email' => 'admin@minsu.edu.ph'],
            [
                'student_id' => '2024-0001',
                'first_name' => 'Admin',
                'last_name' => 'User',
                'password' => Hash::make('password123'),
                'qr_code' => Str::uuid(),
                'is_officer' => true,
                'organization_id' => $mainOrg->id
            ]
        );

        User::firstOrCreate(
            ['email' => 'officer@minsu.edu.ph'],
            [
                'student_id' => '2024-0002',
                'first_name' => 'John',
                'last_name' => 'Officer',
                'password' => Hash::make('password123'),
                'qr_code' => Str::uuid(),
                'is_officer' => true,
                'organization_id' => $mainOrg->id
            ]
        );

        // Create regular members
        for ($i = 3; $i <= 10; $i++) {
            User::firstOrCreate(
                ['email' => "member{$i}@minsu.edu.ph"],
                [
                    'student_id' => '2024-' . str_pad($i, 4, '0', STR_PAD_LEFT),
                    'first_name' => 'Student',
                    'last_name' => 'Member' . $i,
                    'password' => Hash::make('password123'),
                    'qr_code' => Str::uuid(),
                    'is_officer' => false,
                    'organization_id' => $mainOrg->id
                ]
            );
        }

        $this->command->info('Users seeded successfully!');
    }
}