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
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    /**
     * Generate unique QR code for user
     */
    private function generateQRCode($userId, $studentId, $organizationId = 1)
    {
        $qrData = json_encode([
            'user_id' => $userId,
            'student_id' => $studentId,
            'organization_id' => $organizationId,
            'timestamp' => now()->timestamp,
            'token' => Str::random(32)
        ]);
        
        return base64_encode($qrData);
    }


    public function login(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'email' => 'required|email',
                'password' => 'required|string|min:6',
            ]);

            \Log::info('Login attempt for email: ' . $request->email);

            $user = User::where('email', $validated['email'])->first();

            if (!$user) {
                \Log::warning('User not found for email: ' . $validated['email']);
                throw ValidationException::withMessages([
                    'email' => ['The provided credentials are incorrect.'],
                ]);
            }

            if (!Hash::check($validated['password'], $user->password)) {
                \Log::warning('Password mismatch for user: ' . $user->email);
                throw ValidationException::withMessages([
                    'email' => ['The provided credentials are incorrect.'],
                ]);
            }

            \Log::info('Login successful for user: ' . $user->email);

            Auth::login($user);
            $request->session()->regenerate();

            // Refresh user to ensure latest data is loaded from database
            $user = $user->fresh();

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
            ], 200);

        } catch (ValidationException $e) {
            \Log::error('Validation error: ' . json_encode($e->errors()));
            throw $e;
        } catch (\Exception $e) {
            \Log::error('Login error: ' . $e->getMessage());
            return response()->json([
                'message' => 'An error occurred during login. Please check the server logs.',
                'error' => $e->getMessage()
            ], 500);
        }
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

    // Add this method to your existing AuthController
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'student_id' => 'required|unique:users|string|max:50',
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|email|unique:users',
            'password' => 'required|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            // Generate QR code first
            $tempUser = new User();
            $tempUser->id = null; // Will be auto-generated
            
            // Create user with all fields including qr_code
            $user = User::create([
                'student_id' => $request->student_id,
                'first_name' => $request->first_name,
                'last_name' => $request->last_name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'is_officer' => false, // Students are not officers by default
                'organization_id' => 1, // Default organization
                'qr_code' => null, // Will be updated after user creation
            ]);

            // Generate unique QR code for the new user (after ID is generated)
            $qrCode = $this->generateQRCode($user->id, $user->student_id, 1);
            $user->update(['qr_code' => $qrCode]);

            // Create initial financial ledger entry (zero balance)
            FinancialLedger::create([
                'user_id' => $user->id,
                'description' => 'Account created',
                'amount' => 0,
                'balance_after' => 0,
                'type' => 'due',
                'cleared' => true,
            ]);

            // Build response
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

            return response()->json([
                'message' => 'Registration successful! Your QR code has been generated. You can now log in.',
                'user' => $responseData
            ], 201);

        } catch (\Exception $e) {
            \Log::error('Registration failed: ' . $e->getMessage());
            return response()->json([
                'error' => 'Registration failed. Please try again.',
                'details' => $e->getMessage()
            ], 500);
        }
    }
}