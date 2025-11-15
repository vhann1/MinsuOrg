<?php
// app/Http/Controllers/DashboardController.php
namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Event;
use App\Models\Attendance;
use App\Models\FinancialLedger;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function getDashboardData(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $organizationId = $request->user()->organization_id;
        $isOfficer = $request->user()->is_officer;

        $data = Cache::remember("dashboard.{$userId}", 300, function () use ($organizationId, $isOfficer, $userId) {
            $baseData = [
                'stats' => $this->getStats($organizationId),
                'recent_events' => $this->getRecentEvents($organizationId),
                'financial_overview' => $this->getFinancialOverview($organizationId),
                'attendance_summary' => $this->getAttendanceSummary($organizationId),
            ];

            // Add officer-specific data
            if ($isOfficer) {
                $baseData['officer_data'] = $this->getOfficerData($organizationId);
            }

            // Add user-specific data
            $baseData['user_data'] = $this->getUserData($userId, $organizationId);

            return $baseData;
        });

        return response()->json($data);
    }

    private function getStats(int $organizationId): array
    {
        return [
            'total_members' => User::where('organization_id', $organizationId)
                ->where('organization_member', true)
                ->count(),
            'total_officers' => User::where('organization_id', $organizationId)
                ->where('is_officer', true)
                ->count(),
            'active_events' => Event::where('organization_id', $organizationId)
                ->where('is_active', true)
                ->where('end_time', '>', now())
                ->count(),
            'pending_clearances' => $this->getPendingClearancesCount($organizationId),
            'total_scanners' => User::where('organization_id', $organizationId)
                ->where('can_scan', true)
                ->where('organization_member', true)
                ->count(),
            'events_needing_processing' => Event::where('organization_id', $organizationId)
                ->where('end_time', '<', now())
                ->whereDoesntHave('attendances', function($query) {
                    $query->where('status', 'absent');
                })
                ->count(),
        ];
    }

    private function getPendingClearancesCount(int $organizationId): int
    {
        return User::where('organization_id', $organizationId)
            ->where('organization_member', true)
            ->get()
            ->filter(function($user) {
                $balance = $user->financialLedgers()->latest()->first()->balance_after ?? 0;
                return $balance > 0;
            })
            ->count();
    }

    private function getRecentEvents(int $organizationId)
    {
        return Event::where('organization_id', $organizationId)
            ->withCount(['attendances as present_count' => function ($query) {
                $query->where('status', 'present');
            }])
            ->withCount(['attendances as absent_count' => function ($query) {
                $query->where('status', 'absent');
            }])
            ->orderBy('start_time', 'desc')
            ->limit(5)
            ->get()
            ->map(function ($event) {
                $totalMembers = $event->organization->users()->where('organization_member', true)->count();
                $attendanceRate = $totalMembers > 0 ? ($event->present_count / $totalMembers) * 100 : 0;

                return [
                    'id' => $event->id,
                    'title' => $event->title,
                    'start_time' => $event->start_time->format('M j, Y g:i A'),
                    'end_time' => $event->end_time->format('M j, Y g:i A'),
                    'is_active' => $event->is_active,
                    'has_ended' => $event->end_time < now(),
                    'present_count' => $event->present_count,
                    'absent_count' => $event->absent_count,
                    'attendance_rate' => round($attendanceRate, 1),
                    'needs_absent_processing' => $event->end_time < now() && $event->absent_count == 0,
                ];
            });
    }

    private function getFinancialOverview(int $organizationId): array
    {
        // Get all organization members with their latest balance
        $members = User::where('organization_id', $organizationId)
            ->where('organization_member', true)
            ->with(['financialLedgers' => function($query) {
                $query->orderBy('created_at', 'desc');
            }])
            ->get();

        $totalBalance = 0;
        $membersWithBalance = 0;
        $pendingAmount = 0;

        foreach ($members as $member) {
            $balance = $member->financialLedgers->first()->balance_after ?? 0;
            $totalBalance += $balance;
            if ($balance > 0) {
                $membersWithBalance++;
                $pendingAmount += $balance;
            }
        }

        // Get recent transactions for activity feed
        $recentTransactions = FinancialLedger::whereHas('user', function ($query) use ($organizationId) {
            $query->where('organization_id', $organizationId);
        })
        ->with('user:id,first_name,last_name')
        ->orderBy('created_at', 'desc')
        ->limit(10)
        ->get()
        ->map(function ($transaction) {
            return [
                'id' => $transaction->id,
                'type' => $transaction->type,
                'amount' => $transaction->amount,
                'description' => $transaction->description,
                'created_at' => $transaction->created_at->format('M j, g:i A'),
                'user' => $transaction->user->only(['first_name', 'last_name']),
            ];
        });

        // Get top balances for dashboard
        $topBalances = $members
            ->map(function ($member) {
                $balance = $member->financialLedgers->first()->balance_after ?? 0;
                return [
                    'user' => $member->only(['id', 'first_name', 'last_name', 'student_id']),
                    'balance' => $balance,
                ];
            })
            ->where('balance', '>', 0)
            ->sortByDesc('balance')
            ->take(5)
            ->values();

        return [
            'total_balance' => (float) $totalBalance,
            'pending_amount' => (float) $pendingAmount,
            'members_with_balance' => $membersWithBalance,
            'cleared_members' => $members->count() - $membersWithBalance,
            'recent_transactions' => $recentTransactions,
            'top_balances' => $topBalances,
            'total_members' => $members->count(),
        ];
    }

    private function getAttendanceSummary(int $organizationId): array
    {
        $attendanceStats = Attendance::whereHas('event', function ($query) use ($organizationId) {
            $query->where('organization_id', $organizationId);
        })
        ->select(
            DB::raw('COUNT(*) as total_records'),
            DB::raw('SUM(CASE WHEN status = "present" THEN 1 ELSE 0 END) as present_count'),
            DB::raw('SUM(CASE WHEN status = "absent" THEN 1 ELSE 0 END) as absent_count'),
            DB::raw('SUM(CASE WHEN status = "late" THEN 1 ELSE 0 END) as late_count')
        )
        ->first();

        $total = $attendanceStats->total_records;
        $attendanceRate = $total > 0 ? ($attendanceStats->present_count / $total) * 100 : 0;

        // Get attendance by month for charts
        $monthlyAttendance = Attendance::whereHas('event', function ($query) use ($organizationId) {
            $query->where('organization_id', $organizationId);
        })
        ->select(
            DB::raw('YEAR(created_at) as year'),
            DB::raw('MONTH(created_at) as month'),
            DB::raw('COUNT(*) as total'),
            DB::raw('SUM(CASE WHEN status = "present" THEN 1 ELSE 0 END) as present')
        )
        ->groupBy('year', 'month')
        ->orderBy('year', 'desc')
        ->orderBy('month', 'desc')
        ->limit(6)
        ->get()
        ->map(function ($item) {
            $rate = $item->total > 0 ? ($item->present / $item->total) * 100 : 0;
            return [
                'month' => Carbon::create($item->year, $item->month)->format('M Y'),
                'total' => $item->total,
                'present' => $item->present,
                'rate' => round($rate, 1),
            ];
        })
        ->reverse()
        ->values();

        return [
            'total_records' => $total,
            'present_count' => $attendanceStats->present_count,
            'absent_count' => $attendanceStats->absent_count,
            'late_count' => $attendanceStats->late_count,
            'attendance_rate' => round($attendanceRate, 2),
            'monthly_trends' => $monthlyAttendance,
        ];
    }

    private function getOfficerData(int $organizationId): array
    {
        return [
            'unprocessed_events' => Event::where('organization_id', $organizationId)
                ->where('end_time', '<', now())
                ->whereDoesntHave('attendances', function($query) {
                    $query->where('status', 'absent');
                })
                ->count(),
            'pending_approvals' => User::where('organization_id', $organizationId)
                ->where('organization_member', false)
                ->count(),
            'recent_signups' => User::where('organization_id', $organizationId)
                ->where('created_at', '>=', now()->subDays(7))
                ->count(),
            'financial_alerts' => $this->getFinancialAlerts($organizationId),
        ];
    }

    private function getUserData(int $userId, int $organizationId): array
    {
        $user = User::find($userId);
        
        // Get user's current balance
        $currentBalance = $user->financialLedgers()->latest()->first()->balance_after ?? 0;

        // Get user's attendance stats
        $userAttendance = Attendance::where('user_id', $userId)
            ->whereHas('event', function($query) use ($organizationId) {
                $query->where('organization_id', $organizationId);
            })
            ->select(
                DB::raw('COUNT(*) as total_events'),
                DB::raw('SUM(CASE WHEN status = "present" THEN 1 ELSE 0 END) as attended'),
                DB::raw('SUM(CASE WHEN status = "absent" THEN 1 ELSE 0 END) as absent')
            )
            ->first();

        // Get upcoming events for the user
        $upcomingEvents = Event::where('organization_id', $organizationId)
            ->where('is_active', true)
            ->where('start_time', '>', now())
            ->orderBy('start_time', 'asc')
            ->limit(3)
            ->get()
            ->map(function ($event) use ($userId) {
                $hasAttended = $event->attendances()
                    ->where('user_id', $userId)
                    ->where('status', 'present')
                    ->exists();

                return [
                    'id' => $event->id,
                    'title' => $event->title,
                    'start_time' => $event->start_time->format('M j, g:i A'),
                    'has_attended' => $hasAttended,
                ];
            });

        return [
            'current_balance' => $currentBalance,
            'is_cleared' => $currentBalance <= 0,
            'attendance_stats' => [
                'total_events' => $userAttendance->total_events ?? 0,
                'attended' => $userAttendance->attended ?? 0,
                'absent' => $userAttendance->absent ?? 0,
                'attendance_rate' => $userAttendance->total_events > 0 ? 
                    round(($userAttendance->attended / $userAttendance->total_events) * 100, 1) : 0,
            ],
            'upcoming_events' => $upcomingEvents,
            'organization_member' => $user->organization_member,
            'can_scan' => $user->can_scan,
        ];
    }

    private function getFinancialAlerts(int $organizationId): array
    {
        $alerts = [];

        // Check for high balances
        $highBalances = User::where('organization_id', $organizationId)
            ->where('organization_member', true)
            ->get()
            ->filter(function($user) {
                $balance = $user->financialLedgers()->latest()->first()->balance_after ?? 0;
                return $balance > 500; // Alert for balances over 500
            })
            ->count();

        if ($highBalances > 0) {
            $alerts[] = [
                'type' => 'high_balance',
                'message' => "{$highBalances} members have balances over ₱500",
                'priority' => 'medium'
            ];
        }

        // Check for old unpaid balances
        $oldBalances = FinancialLedger::whereHas('user', function($query) use ($organizationId) {
            $query->where('organization_id', $organizationId);
        })
        ->where('balance_after', '>', 0)
        ->where('created_at', '<', now()->subDays(30))
        ->distinct('user_id')
        ->count('user_id');

        if ($oldBalances > 0) {
            $alerts[] = [
                'type' => 'old_balance',
                'message' => "{$oldBalances} members have unpaid balances over 30 days old",
                'priority' => 'high'
            ];
        }

        return $alerts;
    }

    public function clearCache(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        Cache::forget("dashboard.{$userId}");

        return response()->json([
            'message' => 'Dashboard cache cleared successfully',
            'data' => $this->getDashboardData($request)->getData()
        ]);
    }

    // New method for financial overview endpoint
    public function getFinancialOverviewData(Request $request): JsonResponse
    {
        $organizationId = $request->user()->organization_id;
        $overview = $this->getFinancialOverview($organizationId);

        return response()->json($overview);
    }

    // New method for user dashboard data
    public function getUserDashboardData(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $organizationId = $request->user()->organization_id;

        $data = $this->getUserData($userId, $organizationId);

        return response()->json($data);
    }
}