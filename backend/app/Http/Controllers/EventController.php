<?php
// app/Http/Controllers/EventController.php
namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\User;
use App\Models\Attendance;
use App\Models\FinancialLedger;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class EventController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $events = Event::where('organization_id', $request->user()->organization_id)
            ->withCount(['attendances as present_count' => function($query) {
                $query->where('status', 'present');
            }])
            ->withCount(['attendances as absent_count' => function($query) {
                $query->where('status', 'absent');
            }])
            ->orderBy('start_time', 'desc')
            ->get();

        return response()->json([
            'data' => $events,
            'total' => $events->count()
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'start_time' => 'required|date|after:now',
            'end_time' => 'required|date|after:start_time',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $event = Event::create([
            'title' => $request->title,
            'description' => $request->description,
            'start_time' => Carbon::parse($request->start_time),
            'end_time' => Carbon::parse($request->end_time),
            'organization_id' => $request->user()->organization_id,
            'is_active' => true
        ]);

        return response()->json([
            'message' => 'Event created successfully',
            'event' => $event
        ], 201);
    }

    public function show(Request $request, $id): JsonResponse
    {
        $event = Event::where('id', $id)
            ->where('organization_id', $request->user()->organization_id)
            ->with(['attendances.user:id,student_id,first_name,last_name'])
            ->firstOrFail();

        return response()->json(['event' => $event]);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $event = Event::where('id', $id)
            ->where('organization_id', $request->user()->organization_id)
            ->firstOrFail();

        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'start_time' => 'required|date',
            'end_time' => 'required|date|after:start_time',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $event->update($request->only(['title', 'description', 'start_time', 'end_time']));

        return response()->json([
            'message' => 'Event updated successfully',
            'event' => $event->fresh()
        ]);
    }

    public function destroy(Request $request, $id): JsonResponse
    {
        $event = Event::where('id', $id)
            ->where('organization_id', $request->user()->organization_id)
            ->firstOrFail();

        // Check if event has attendance records
        if ($event->attendances()->exists()) {
            return response()->json([
                'error' => 'Cannot delete event with attendance records. Archive it instead.'
            ], 422);
        }

        $event->delete();

        return response()->json(['message' => 'Event deleted successfully']);
    }

    public function getActiveEvents(Request $request): JsonResponse
    {
        $events = Event::where('organization_id', $request->user()->organization_id)
            ->where('is_active', true)
            ->where('end_time', '>', now())
            ->orderBy('start_time', 'asc')
            ->get();

        return response()->json(['events' => $events]);
    }

    public function toggleActive(Request $request, $id): JsonResponse
    {
        $event = Event::where('id', $id)
            ->where('organization_id', $request->user()->organization_id)
            ->firstOrFail();

        $event->update(['is_active' => !$event->is_active]);

        return response()->json([
            'message' => 'Event status updated successfully',
            'event' => $event->fresh()
        ]);
    }

    public function getEventStats(Request $request, $id): JsonResponse
    {
        $event = Event::where('id', $id)
            ->where('organization_id', $request->user()->organization_id)
            ->firstOrFail();

        $stats = [
            'total_members' => $request->user()->organization->users()->where('organization_member', true)->count(),
            'present_count' => $event->attendances()->where('status', 'present')->count(),
            'absent_count' => $event->attendances()->where('status', 'absent')->count(),
            'late_count' => $event->attendances()->where('status', 'late')->count(),
            'attendance_rate' => $event->total_members > 0 ? 
                round(($event->attendances()->where('status', 'present')->count() / $event->total_members) * 100, 2) : 0
        ];

        return response()->json(['stats' => $stats]);
    }

    // NEW: Auto-mark absent students for expired events
    public function markAbsentStudents(Request $request, $eventId): JsonResponse
    {
        $event = Event::where('id', $eventId)
            ->where('organization_id', $request->user()->organization_id)
            ->firstOrFail();

        // Check if user is officer/admin
        if (!$request->user()->is_officer) {
            return response()->json([
                'error' => 'Only organization officers can mark absent students.'
            ], 403);
        }

        // Check if event has ended
        if (!$event->hasEnded()) {
            return response()->json([
                'error' => 'Cannot mark absent students for ongoing or future events.'
            ], 422);
        }

        $absentCount = $event->markAbsentStudents();

        return response()->json([
            'message' => "Successfully marked {$absentCount} students as absent",
            'absent_count' => $absentCount,
            'event' => $event->fresh()
        ]);
    }

    // NEW: Get events that need absent marking
    public function getEventsNeedingAbsentMarking(Request $request): JsonResponse
    {
        $events = Event::where('organization_id', $request->user()->organization_id)
            ->where('end_time', '<', now())
            ->whereDoesntHave('attendances', function($query) {
                $query->where('status', 'absent');
            })
            ->withCount(['attendances as present_count' => function($query) {
                $query->where('status', 'present');
            }])
            ->orderBy('end_time', 'desc')
            ->get();

        return response()->json([
            'events' => $events,
            'count' => $events->count()
        ]);
    }

    // NEW: Get event attendance details
    public function getEventAttendance(Request $request, $eventId): JsonResponse
    {
        $event = Event::where('id', $eventId)
            ->where('organization_id', $request->user()->organization_id)
            ->firstOrFail();

        $presentStudents = $event->attendances()
            ->where('status', 'present')
            ->with('user:id,student_id,first_name,last_name,email')
            ->get()
            ->map(function($attendance) {
                return [
                    'user' => $attendance->user,
                    'scanned_at' => $attendance->marked_at
                ];
            });

        $absentStudents = $event->attendances()
            ->where('status', 'absent')
            ->with('user:id,student_id,first_name,last_name,email')
            ->get()
            ->map(function($attendance) {
                return [
                    'user' => $attendance->user,
                    'marked_absent_at' => $attendance->marked_at
                ];
            });

        // Get organization members who haven't been marked at all
        $unmarkedStudents = User::where('organization_id', $request->user()->organization_id)
            ->where('organization_member', true)
            ->whereDoesntHave('attendances', function($query) use ($eventId) {
                $query->where('event_id', $eventId);
            })
            ->select('id', 'student_id', 'first_name', 'last_name', 'email')
            ->get();

        return response()->json([
            'event' => $event,
            'present_students' => $presentStudents,
            'absent_students' => $absentStudents,
            'unmarked_students' => $unmarkedStudents,
            'summary' => [
                'total_members' => $event->total_members,
                'present_count' => $presentStudents->count(),
                'absent_count' => $absentStudents->count(),
                'unmarked_count' => $unmarkedStudents->count(),
                'attendance_rate' => $event->attendance_rate
            ]
        ]);
    }

    // NEW: Process all expired events for absent marking
    public function processAllExpiredEvents(Request $request): JsonResponse
    {
        if (!$request->user()->is_officer) {
            return response()->json([
                'error' => 'Only organization officers can process expired events.'
            ], 403);
        }

        $expiredEvents = Event::where('organization_id', $request->user()->organization_id)
            ->where('end_time', '<', now())
            ->whereDoesntHave('attendances', function($query) {
                $query->where('status', 'absent');
            })
            ->get();

        $totalAbsentMarked = 0;
        $processedEvents = [];

        foreach ($expiredEvents as $event) {
            $absentCount = $event->markAbsentStudents();
            $totalAbsentMarked += $absentCount;
            $processedEvents[] = [
                'event_id' => $event->id,
                'event_title' => $event->title,
                'absent_marked' => $absentCount
            ];
        }

        return response()->json([
            'message' => "Processed {$expiredEvents->count()} events, marked {$totalAbsentMarked} total absences",
            'processed_events' => $processedEvents,
            'total_events_processed' => $expiredEvents->count(),
            'total_absences_marked' => $totalAbsentMarked
        ]);
    }

    // Get QR code for active event - used by students to scan
    public function getEventQR(Request $request, $id): JsonResponse
    {
        $event = Event::where('id', $id)
            ->where('organization_id', $request->user()->organization_id)
            ->firstOrFail();

        // Check if event is currently active
        if (!$event->isActiveNow()) {
            return response()->json([
                'error' => 'QR code is not available. Event is not currently active.',
                'event_status' => $event->hasEnded() ? 'ended' : 'not_started',
                'event' => $event->only(['id', 'title', 'start_time', 'end_time', 'is_active']),
                'current_time' => now()->toIso8601String()
            ], 400);
        }

        // Generate and return QR code for this event
        $qrData = $event->generateEventQRCode();

        return response()->json([
            'message' => 'QR code generated successfully',
            'event_id' => $event->id,
            'event_title' => $event->title,
            'qr_code' => $qrData,
            'valid_until' => $event->end_time->toIso8601String(),
            'is_active' => $event->isActiveNow()
        ], 200);
    }
}