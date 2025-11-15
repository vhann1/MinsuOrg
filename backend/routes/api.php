<?php
// routes/api.php
use App\Http\Controllers\AuthController;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\FinancialController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\OrganizationController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Public routes
Route::get('/health', function () {
    return response()->json([
        'status' => 'success',
        'message' => 'MINSU OrgSuite API is running',
        'timestamp' => now()->toISOString(),
        'version' => '1.0.0'
    ]);
});

// CSRF token endpoint for API (with web middleware for sessions)
Route::middleware('web')->group(function () {
    Route::get('/csrf-token', function (Request $request) {
        return response()->json([
            'csrf_token' => csrf_token(),
            'session_id' => session()->getId(),
            'session_started' => session()->isStarted()
        ]);
    });
});

Route::post('/login', [AuthController::class, 'login']);

// Protected routes
Route::middleware(['auth:sanctum'])->group(function () {
    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'user']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);
    Route::get('/current-user', [UserController::class, 'getCurrentUser']);

    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'getDashboardData']);
    Route::post('/dashboard/clear-cache', [DashboardController::class, 'clearCache']);
    Route::get('/financial/overview', [FinancialController::class, 'getFinancialOverview']);

    // Users & Members Management
    Route::get('/users/organization-members', [UserController::class, 'getOrganizationMembers']);
    Route::get('/users/scanners', [UserController::class, 'getScanners']);
    Route::post('/users/{id}/add-to-organization', [UserController::class, 'addToOrganization']);
    Route::post('/users/{id}/remove-from-organization', [UserController::class, 'removeFromOrganization']);
    Route::put('/users/{id}/scan-permission', [UserController::class, 'updateScanPermission']);
    Route::post('/users/{id}/generate-qr', [UserController::class, 'generateNewQR']);
    Route::get('/users/{id}/attendance', [AttendanceController::class, 'getUserAttendance']);
    Route::apiResource('users', UserController::class);

    // Events with Auto-Absent Features
    Route::get('/events/active', [EventController::class, 'getActiveEvents']);
    Route::get('/events/needing-absent-marking', [EventController::class, 'getEventsNeedingAbsentMarking']);
    Route::post('/events/{id}/toggle-active', [EventController::class, 'toggleActive']);
    Route::post('/events/{id}/mark-absent', [EventController::class, 'markAbsentStudents']);
    Route::post('/events/process-expired', [EventController::class, 'processAllExpiredEvents']);
    Route::get('/events/{id}/stats', [EventController::class, 'getEventStats']);
    Route::get('/events/{id}/attendance-details', [EventController::class, 'getEventAttendance']);
    Route::apiResource('events', EventController::class);

    // Attendance
    Route::post('/attendance/scan', [AttendanceController::class, 'scanQR']);
    Route::get('/events/{eventId}/attendance', [AttendanceController::class, 'getEventAttendance']);
    Route::post('/attendance/manual', [AttendanceController::class, 'manualAttendance']);
    Route::get('/attendance/user/{userId}', [AttendanceController::class, 'getUserAttendanceHistory']);

    // Financial Ledger (Sorted by Balance)
    Route::get('/financial/student-ledger/{userId}', [FinancialController::class, 'getStudentLedger']);
    Route::get('/financial/member-ledger/{userId}', [FinancialController::class, 'getMemberLedger']);
    Route::get('/financial/organization', [FinancialController::class, 'getOrganizationFinancials']);
    Route::post('/financial/make-payment', [FinancialController::class, 'makePayment']);
    Route::post('/financial/manual-entry', [FinancialController::class, 'addManualEntry']);
    Route::post('/financial/apply-fine', [FinancialController::class, 'applyAbsenceFine']);

    // Organization
    Route::get('/organization', [OrganizationController::class, 'show']);
    Route::put('/organization', [OrganizationController::class, 'update']);
    Route::get('/organization/stats', [OrganizationController::class, 'getOrganizationStats']);
});

// Fallback
Route::fallback(function () {
    return response()->json([
        'status' => 'error',
        'message' => 'Endpoint not found',
        'available_endpoints' => [
            'GET /api/health',
            'POST /api/login',
            'GET /api/dashboard',
            'GET /api/events',
            'POST /api/attendance/scan',
            'GET /api/users/organization-members',
            'GET /api/financial/organization',
            'POST /api/events/{id}/mark-absent',
        ]
    ], 404);
});