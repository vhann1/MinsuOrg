<?php
// database/seeders/OrganizationSeeder.php
namespace Database\Seeders;

use App\Models\Organization;
use Illuminate\Database\Seeder;

class OrganizationSeeder extends Seeder
{
    public function run(): void
    {
        $organizations = [
            [
                'name' => 'Computer Science Club',
                'code' => 'COMPSCI_CLUB',
                'attendance_fine' => 50.00,
                'description' => 'Official organization for Computer Science students'
            ],
            [
                'name' => 'Student Council',
                'code' => 'STUDENT_COUNCIL',
                'attendance_fine' => 30.00,
                'description' => 'University Student Council'
            ],
            [
                'name' => 'Engineering Society',
                'code' => 'ENGINEERING_SOC',
                'attendance_fine' => 40.00,
                'description' => 'Engineering students organization'
            ]
        ];

        foreach ($organizations as $org) {
            Organization::firstOrCreate(
                ['code' => $org['code']],
                $org
            );
        }
    }
}