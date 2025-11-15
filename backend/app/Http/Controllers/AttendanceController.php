<?php
// app/Http/Controllers/AttendanceController.php
namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\Event;
use App\Models\User;
use App\Models\FinancialLedger;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class AttendanceController extends Controller
{
    public function scanQR(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'qr_data' => 'required|json',
            'event_id' => 'required|exists:events,id'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            return DB::transaction(function () use ($request) {
                $qrData = json_decode($request->qr_data, true);
                
                if (!$this->validateQRData($qrData)) {
                    return response()->json(['error' => 'Invalid or expired QR code'], 400);
                }

                $student = User::where('student_id', $qrData['student_id'])
                    ->where('organization_id', $request->user()->organization_id)
                    ->first();

                if (!$student) {
                    return response()->json(['error' => 'Student not found in your organization'], 404);
                }

                $event = Event::where('id', $request->event_id)
                    ->where('organization_id', $request->user()->organization_id)
                    ->where('is_active', true)
                    ->first();

                if (!$event) {
                    return response()->json(['error' => 'Event not found or not active'], 404);
                }

                if (!$event->isActiveNow()) {
                    return response()->json(['error' => 'Event is not currently active'], 400);
                }

                $existingAttendance = Attendance::where('user_id', $student->id)
                    ->where('event_id', $event->id)
                    ->first();

                if ($existingAttendance) {
                    return response()->json(['error' => 'Attendance already recorded'], 409);
                }

                $attendance = Attendance::create([
                    'user_id' => $student->id,
                    'event_id' => $event->id,
                    'status' => 'present',
                    'scanned_at' => now()
                ]);

                return response()->json([
                    'message' => 'Attendance recorded successfully',
                    'attendance' => $attendance->load('user'),
                    'event' => $event->only(['id', 'title', 'start_time'])
                ], 201);
            });
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to process attendance: ' . $e->getMessage()], 500);
        }
    }

    private function validateQRData(array $qrData): bool
    {
        if (!isset($qrData['student_id']) || !isset($qrData['timestamp']) || !isset($qrData['hash'])) {
            return false;
        }

        // Check if QR code is expired (5 minutes)
        if (now()->timestamp - $qrData['timestamp'] > 300) {
            return false;
        }

        $expectedHash = md5($qrData['student_id'] . $qrData['organization_id'] . config('app.key'));
        return hash_equals($expectedHash, $qrData['hash']);
    }

    public function markAbsentStudents(Request $request, $eventId): JsonResponse
    {
        try {
            return DB::transaction(function () use ($eventId, $request) {
                $event = Event::where('id', $eventId)
                    ->where('organization_id', $request->user()->organization_id)
                    ->firstOrFail();

                $organization = $event->organization;
                $members = User::where('organization_id', $event->organization_id)->get();

                $absentCount = 0;
                $fineApplied = 0;

                foreach ($members as $member) {
                    $attendance = Attendance::firstOrCreate(
                        ['user_id' => $member->id, 'event_id' => $event->id],
                        ['status' => 'absent']
                    );

                    if ($attendance->status === 'absent' && $organization->attendance_fine > 0) {
                        $lastBalance = $member->financialLedgers()->latest()->first()->balance_after ?? 0;
                        $newBalance = $lastBalance + $organization->attendance_fine;

                        FinancialLedger::create([
                            'user_id' => $member->id,
                            'type' => 'fine',
                            'amount' => $organization->attendance_fine,
                            'description' => 'Absence fine for event: ' . $event->title,
                            'balance_after' => $newBalance,
                            'cleared' => $newBalance <= 0
                        ]);

                        $fineApplied++;
                    }

                    if ($attendance->status === 'absent') {
                        $absentCount++;
                    }
                }

                $event->update(['is_active' => false]);

                return response()->json([
                    'message' => 'Absent students processed successfully',
                    'absent_count' => $absentCount,
                    'fines_applied' => $fineApplied
                ]);
            });
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to mark absent students: ' . $e->getMessage()], 500);
        }
    }

    public function getEventAttendance(Request $request, $eventId): JsonResponse
    {
        $event = Event::where('id', $eventId)
            ->where('organization_id', $request->user()->organization_id)
            ->firstOrFail();

        $attendances = Attendance::with(['user:id,student_id,first_name,last_name,email'])
            ->where('event_id', $eventId)
            ->get()
            ->map(function ($attendance) {
                return [
                    'id' => $attendance->id,
                    'status' => $attendance->status,
                    'scanned_at' => $attendance->scanned_at,
                    'student' => $attendance->user,
                    'status_badge' => $attendance->status_badge
                ];
            });

        return response()->json([
            'event' => $event->only(['id', 'title', 'start_time', 'end_time']),
            'attendances' => $attendances,
            'summary' => [
                'total' => $attendances->count(),
                'present' => $attendances->where('status', 'present')->count(),
                'absent' => $attendances->where('status', 'absent')->count(),
                'late' => $attendances->where('status', 'late')->count(),
            ]
        ]);
    }

    public function manualAttendance(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'event_id' => 'required|exists:events,id',
            'status' => 'required|in:present,absent,late'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $attendance = Attendance::updateOrCreate(
                [
                    'user_id' => $request->user_id,
                    'event_id' => $request->event_id
                ],
                [
                    'status' => $request->status,
                    'scanned_at' => $request->status === 'present' ? now() : null
                ]
            );

            return response()->json([
                'message' => 'Attendance updated successfully',
                'attendance' => $attendance->load('user')
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to update attendance: ' . $e->getMessage()], 500);
        }
    }

    public function getUserAttendance(Request $request, $userId): JsonResponse
    {
        $user = User::where('id', $userId)
            ->where('organization_id', $request->user()->organization_id)
            ->firstOrFail();

        $attendances = Attendance::with(['event:id,title,start_time'])
            ->where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($attendance) {
                return [
                    'event' => $attendance->event,
                    'status' => $attendance->status,
                    'scanned_at' => $attendance->scanned_at,
                    'status_badge' => $attendance->status_badge
                ];
            });

        return response()->json([
            'user' => $user->only(['id', 'student_id', 'first_name', 'last_name']),
            'attendances' => $attendances,
            'summary' => [
                'total' => $attendances->count(),
                'present' => $attendances->where('status', 'present')->count(),
                'attendance_rate' => $attendances->count() > 0 ? 
                    round(($attendances->where('status', 'present')->count() / $attendances->count()) * 100, 2) : 0
            ]
        ]);
    }
}