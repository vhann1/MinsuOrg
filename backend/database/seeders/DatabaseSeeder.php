<?php

namespace Database\Seeders;

use App\Models\Organization;
use App\Models\User;
use App\Models\Event;
use App\Models\Attendance;
use App\Models\FinancialLedger;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class DatabaseSeeder extends Seeder
{
    public function run()
    {
        // Create Organization
        $organization = Organization::create([
            'name' => 'Computer Science Club',
            'code' => 'COMPSCI_CLUB',
            'attendance_fine' => 50.00
        ]);

        // Create Officer
        $officer = User::create([
            'student_id' => '2024-OFF-001',
            'first_name' => 'Admin',
            'last_name' => 'Officer',
            'email' => 'officer@minsu.edu.ph',
            'password' => Hash::make('password123'),
            'qr_code' => 'OFFICER_QR_001',
            'is_officer' => true,
            'organization_id' => $organization->id
        ]);

        // Create Sample Members
        $members = [
            [
                'student_id' => '2024-001',
                'first_name' => 'Juan',
                'last_name' => 'Dela Cruz',
                'email' => 'juan.delacruz@minsu.edu.ph',
                'qr_code' => 'STUDENT_QR_001',
            ],
            [
                'student_id' => '2024-002',
                'first_name' => 'Maria',
                'last_name' => 'Santos',
                'email' => 'maria.santos@minsu.edu.ph',
                'qr_code' => 'STUDENT_QR_002',
            ],
            [
                'student_id' => '2024-003',
                'first_name' => 'Pedro',
                'last_name' => 'Reyes',
                'email' => 'pedro.reyes@minsu.edu.ph',
                'qr_code' => 'STUDENT_QR_003',
            ],
            [
                'student_id' => '2024-004',
                'first_name' => 'Ana',
                'last_name' => 'Lopez',
                'email' => 'ana.lopez@minsu.edu.ph',
                'qr_code' => 'STUDENT_QR_004',
            ],
            [
                'student_id' => '2024-005',
                'first_name' => 'Miguel',
                'last_name' => 'Garcia',
                'email' => 'miguel.garcia@minsu.edu.ph',
                'qr_code' => 'STUDENT_QR_005',
            ]
        ];

        foreach ($members as $member) {
            User::create([
                'student_id' => $member['student_id'],
                'first_name' => $member['first_name'],
                'last_name' => $member['last_name'],
                'email' => $member['email'],
                'password' => Hash::make('password123'),
                'qr_code' => $member['qr_code'],
                'is_officer' => false,
                'organization_id' => $organization->id
            ]);
        }

        // Create Sample Events
        $events = [
            [
                'title' => 'General Assembly Meeting',
                'description' => 'First general assembly for the semester',
                'start_time' => Carbon::now()->subDays(2)->setTime(14, 0),
                'end_time' => Carbon::now()->subDays(2)->setTime(16, 0),
                'is_active' => false,
            ],
            [
                'title' => 'Programming Workshop',
                'description' => 'Basic Python programming workshop',
                'start_time' => Carbon::now()->subDays(1)->setTime(10, 0),
                'end_time' => Carbon::now()->subDays(1)->setTime(12, 0),
                'is_active' => false,
            ],
            [
                'title' => 'Weekly Meeting',
                'description' => 'Regular weekly organization meeting',
                'start_time' => Carbon::now()->addDays(1)->setTime(15, 0),
                'end_time' => Carbon::now()->addDays(1)->setTime(17, 0),
                'is_active' => true,
            ],
            [
                'title' => 'Project Planning Session',
                'description' => 'Planning for upcoming projects',
                'start_time' => Carbon::now()->addDays(3)->setTime(13, 0),
                'end_time' => Carbon::now()->addDays(3)->setTime(15, 0),
                'is_active' => true,
            ]
        ];

        foreach ($events as $event) {
            Event::create(array_merge($event, [
                'organization_id' => $organization->id
            ]));
        }

        // Create Sample Attendances for past events
        $pastEvents = Event::where('is_active', false)->get();
        $allUsers = User::where('organization_id', $organization->id)->get();

        foreach ($pastEvents as $event) {
            foreach ($allUsers as $user) {
                // Randomly assign attendance status
                $status = rand(0, 1) ? 'present' : 'absent';
                
                Attendance::create([
                    'user_id' => $user->id,
                    'event_id' => $event->id,
                    'status' => $status,
                    'scanned_at' => $status === 'present' ? $event->start_time->addMinutes(rand(0, 30)) : null,
                ]);

                // Add fines for absent students
                if ($status === 'absent') {
                    FinancialLedger::create([
                        'user_id' => $user->id,
                        'type' => 'fine',
                        'amount' => $organization->attendance_fine,
                        'description' => 'Absence fine for event: ' . $event->title,
                        'balance_after' => $organization->attendance_fine,
                        'cleared' => false
                    ]);
                }
            }
        }

        // Create some sample payments
        $usersWithFines = User::whereHas('financialLedgers')->get();
        
        foreach ($usersWithFines->take(2) as $user) {
            FinancialLedger::create([
                'user_id' => $user->id,
                'type' => 'payment',
                'amount' => $organization->attendance_fine,
                'description' => 'Payment for absence fine',
                'balance_after' => 0,
                'cleared' => true
            ]);
        }

        $this->command->info('Database seeded successfully!');
        $this->command->info('Officer Login: officer@minsu.edu.ph / password123');
        $this->command->info('Sample student: juan.delacruz@minsu.edu.ph / password123');
    }
}