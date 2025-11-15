<?php
// app/Http/Controllers/AuthController.php
namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Organization;
use App\Models\FinancialLedger;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string|min:6',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        Auth::login($user);
        $request->session()->regenerate();

        // Build safe response without risky relationships
        $responseData = [
            'id' => $user->id,
            'student_id' => $user->student_id,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'full_name' => $user->first_name . ' ' . $user->last_name,
            'email' => $user->email,
            'is_officer' => (bool) $user->is_officer,
            'qr_code' => $user->qr_code,
            'organization_id' => $user->organization_id,
        ];

        // Safely add organization
        if ($user->organization_id) {
            try {
                $organization = Organization::select('id', 'name', 'code', 'attendance_fine')
                    ->find($user->organization_id);
                if ($organization) {
                    $responseData['organization'] = $organization;
                }
            } catch (\Exception $e) {
                \Log::warning('Organization load failed in login: ' . $e->getMessage());
            }
        }

        return response()->json([
            'user' => $responseData,
            'message' => 'Login successful'
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Logged out successfully']);
    }

    public function user(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            
            if (!$user) {
                \Log::warning('User not authenticated for /api/me');
                return response()->json(['error' => 'Not authenticated'], 401);
            }

            \Log::info('User endpoint called for user: ' . $user->id);

            // Build basic user data
            $response = [
                'id' => $user->id,
                'student_id' => $user->student_id,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'full_name' => $user->first_name . ' ' . $user->last_name,
                'email' => $user->email,
                'is_officer' => (bool) $user->is_officer,
                'qr_code' => $user->qr_code,
                'organization_id' => $user->organization_id,
            ];

            // Safely add organization data
            if ($user->organization_id) {
                try {
                    $organization = Organization::select('id', 'name', 'code', 'attendance_fine')
                        ->find($user->organization_id);
                    if ($organization) {
                        $response['organization'] = $organization;
                    }
                } catch (\Exception $e) {
                    \Log::warning('Organization load failed: ' . $e->getMessage());
                }
            }

            // Safely calculate balance and cleared status
            try {
                $lastLedger = FinancialLedger::where('user_id', $user->id)
                    ->latest()
                    ->first();
                
                $currentBalance = $lastLedger ? (float) $lastLedger->balance_after : 0.00;
                $response['current_balance'] = $currentBalance;
                $response['is_cleared'] = $currentBalance <= 0;
            } catch (\Exception $e) {
                \Log::warning('Balance calculation failed: ' . $e->getMessage());
                $response['current_balance'] = 0.00;
                $response['is_cleared'] = true;
            }

            return response()->json(['user' => $response]);

        } catch (\Exception $e) {
            \Log::error('User endpoint completely failed: ' . $e->getMessage());
            
            // Final fallback - return minimal data
            $user = $request->user();
            return response()->json([
                'user' => [
                    'id' => $user->id,
                    'first_name' => $user->first_name,
                    'last_name' => $user->last_name,
                    'email' => $user->email,
                ]
            ]);
        }
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();
        
        $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $user->id,
        ]);

        $user->update($request->only(['first_name', 'last_name', 'email']));

        // Return safe response without relationships
        return response()->json([
            'user' => [
                'id' => $user->id,
                'student_id' => $user->student_id,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'email' => $user->email,
                'is_officer' => $user->is_officer,
            ],
            'message' => 'Profile updated successfully'
        ]);
    }
}