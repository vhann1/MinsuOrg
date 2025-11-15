<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use Illuminate\Http\Request; // Add this import

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Web routes apply session/cookie middleware which is required for Sanctum SPA.
|
*/

// Root route
Route::get('/', function () {
    return response()->json([
        'status' => 'success',
        'message' => 'MINSU OrgSuite API Server is running',
        'timestamp' => now()->toISOString(),
        'version' => '1.0.0',
        'endpoints' => [
            'API Health' => '/api/health',
            'API Login' => '/api/login', 
            'API Documentation' => 'Check API docs for all endpoints'
        ]
    ]);
});

// Session-based auth endpoints (used by the SPA)
// Note: they are prefixed with /api/* so your frontend can call /api/login etc.
Route::post('/api/login', [AuthController::class, 'login']);
Route::post('/api/logout', [AuthController::class, 'logout']);
Route::get('/api/me', [AuthController::class, 'user']);

// Debug route to check users and organizations data
Route::get('/debug/user-org-check', function () {
    try {
        // Check organizations data - use simple query to avoid SoftDeletes issue
        $organizations = \App\Models\Organization::get();
        $users = \App\Models\User::get();
        
        $usersWithData = $users->map(function ($user) {
            // Manually load organization to avoid relationship issues
            $organization = null;
            if ($user->organization_id) {
                $organization = \App\Models\Organization::find($user->organization_id);
            }
            
            return [
                'id' => $user->id,
                'email' => $user->email,
                'organization_id' => $user->organization_id,
                'has_organization' => !is_null($user->organization_id),
                'organization_exists' => $organization ? true : false,
                'organization_name' => $organization ? $organization->name : 'None'
            ];
        });

        return response()->json([
            'organizations_count' => $organizations->count(),
            'organizations' => $organizations->pluck('name', 'id'),
            'users_count' => $users->count(),
            'users_data' => $usersWithData,
            'users_with_null_org' => $users->whereNull('organization_id')->count(),
            'users_with_invalid_org' => $users->filter(function ($user) {
                if (!$user->organization_id) return false;
                $org = \App\Models\Organization::find($user->organization_id);
                return !$org;
            })->count()
        ]);
        
    } catch (\Exception $e) {
        return response()->json([
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ], 500);
    }
});

// Fixed debug route
Route::get('/debug/api-me-test', function (Request $request) {
    $response = [
        'authenticated' => auth()->check(),
        'user_id' => auth()->id(),
        'user' => auth()->user() ? [
            'id' => auth()->user()->id,
            'email' => auth()->user()->email,
            'name' => auth()->user()->first_name . ' ' . auth()->user()->last_name,
            'organization_id' => auth()->user()->organization_id
        ] : null,
        'session_id' => session()->getId(),
        'session_exists' => session()->has('_token'),
        'headers' => $request->headers->all(), // This should work now with Request import
        'cookies' => $request->cookies->all(),
        'ip' => $request->ip(),
        'user_agent' => $request->userAgent()
    ];
    
    \Log::info('API Me Debug', $response);
    
    return response()->json($response);
});

// Simple test route to verify basic authentication
Route::get('/debug/simple-auth-test', function () {
    return response()->json([
        'authenticated' => auth()->check(),
        'user_id' => auth()->id(),
        'session_working' => session()->isStarted(),
        'timestamp' => now()->toISOString()
    ]);
});

// Add this temporary route to create a test user
Route::get('/debug/create-test-user', function () {
    try {
        // Check if we have an organization
        $organization = \App\Models\Organization::first();
        if (!$organization) {
            $organization = \App\Models\Organization::create([
                'name' => 'MINSU Test Organization',
                'code' => 'MINSU_TEST',
                'attendance_fine' => 50.00,
                'description' => 'Test organization'
            ]);
        }

        // Check if test user exists
        $testUser = \App\Models\User::where('email', 'test@example.com')->first();
        if (!$testUser) {
            $testUser = \App\Models\User::create([
                'student_id' => '20240001',
                'first_name' => 'Test',
                'last_name' => 'User',
                'email' => 'test@example.com',
                'password' => \Illuminate\Support\Facades\Hash::make('password123'),
                'qr_code' => 'test_qr_001',
                'is_officer' => true,
                'organization_id' => $organization->id
            ]);
        }

        return response()->json([
            'message' => 'Test user created/verified',
            'user' => [
                'email' => 'test@example.com',
                'password' => 'password123',
                'organization_id' => $testUser->organization_id
            ]
        ]);
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
});

// Quick login test route
Route::get('/debug/quick-login', function () {
    $user = \App\Models\User::where('email', 'test@example.com')->first();
    
    if (!$user) {
        return response()->json(['error' => 'Test user not found. Run /debug/create-test-user first']);
    }

    \Illuminate\Support\Facades\Auth::login($user);
    session()->regenerate();

    return response()->json([
        'message' => 'Logged in successfully as test user',
        'user' => [
            'id' => $user->id,
            'email' => $user->email,
            'name' => $user->first_name . ' ' . $user->last_name
        ]
    ]);
});