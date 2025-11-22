<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $users = User::where('organization_id', $request->user()->organization_id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['users' => $users]);
    }

    public function getOrganizationMembers(Request $request): JsonResponse
    {
        // Get current organization members
        $members = User::where('organization_id', $request->user()->organization_id)
            ->where('organization_member', true)
            ->select('id', 'student_id', 'first_name', 'last_name', 'email', 'is_officer', 'organization_member', 'can_scan')
            ->orderBy('first_name')
            ->get();

        // Get users who are not yet organization members
        $nonMembers = User::where('organization_id', $request->user()->organization_id)
            ->where('organization_member', false)
            ->select('id', 'student_id', 'first_name', 'last_name', 'email', 'is_officer')
            ->orderBy('first_name')
            ->get();

        return response()->json([
            'members' => $members,
            'non_members' => $nonMembers,
            'total_members' => $members->count(),
            'total_non_members' => $nonMembers->count()
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        // Only officers can create users
        if (!$request->user()->is_officer) {
            return response()->json([
                'error' => 'Only organization officers can create users.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'student_id' => 'required|unique:users|string|max:50',
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|email|unique:users',
            'is_officer' => 'boolean',
            'organization_member' => 'boolean',
            'can_scan' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $qrCode = uniqid('QR_');

        $user = User::create([
            'student_id' => $request->student_id,
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            'email' => $request->email,
            'password' => Hash::make('password123'), // Default password
            'qr_code' => $qrCode,
            'is_officer' => $request->is_officer ?? false,
            'organization_member' => $request->organization_member ?? false,
            'can_scan' => $request->can_scan ?? false,
            'organization_id' => $request->user()->organization_id
        ]);

        // Generate QR code image
        $this->generateQRCode($user, $qrCode);

        return response()->json([
            'message' => 'User created successfully',
            'user' => $user
        ], 201);
    }

    public function show(Request $request, $id): JsonResponse
    {
        $user = User::where('id', $id)
            ->where('organization_id', $request->user()->organization_id)
            ->firstOrFail();

        return response()->json(['user' => $user]);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $user = User::where('id', $id)
            ->where('organization_id', $request->user()->organization_id)
            ->firstOrFail();

        // Only officers can update user roles
        if (!$request->user()->is_officer && ($request->has('is_officer') || $request->has('organization_member') || $request->has('can_scan'))) {
            return response()->json([
                'error' => 'Only organization officers can update user roles and permissions.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $id,
            'is_officer' => 'boolean',
            'organization_member' => 'boolean',
            'can_scan' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $updateData = $request->only(['first_name', 'last_name', 'email']);
        
        // Only include role fields if user is officer
        if ($request->user()->is_officer) {
            $updateData = array_merge($updateData, $request->only(['is_officer', 'organization_member', 'can_scan']));
        }

        $user->update($updateData);

        return response()->json([
            'message' => 'User updated successfully',
            'user' => $user->fresh()
        ]);
    }

    public function destroy(Request $request, $id): JsonResponse
    {
        // Only officers can delete users
        if (!$request->user()->is_officer) {
            return response()->json([
                'error' => 'Only organization officers can delete users.'
            ], 403);
        }

        $user = User::where('id', $id)
            ->where('organization_id', $request->user()->organization_id)
            ->firstOrFail();

        // Prevent users from deleting themselves
        if ($user->id === $request->user()->id) {
            return response()->json([
                'error' => 'You cannot delete your own account.'
            ], 422);
        }

        $user->delete();

        return response()->json(['message' => 'User deleted successfully']);
    }

    public function generateNewQR(Request $request, $id): JsonResponse
    {
        $user = User::where('id', $id)
            ->where('organization_id', $request->user()->organization_id)
            ->firstOrFail();

        $newQR = uniqid('QR_');
        
        $user->update(['qr_code' => $newQR]);
        $this->generateQRCode($user, $newQR);

        return response()->json([
            'message' => 'New QR code generated successfully',
            'qr_code' => $newQR
        ]);
    }

    public function addToOrganization(Request $request, $id): JsonResponse
    {
        // Only officers can add users to organization
        if (!$request->user()->is_officer) {
            return response()->json([
                'error' => 'Only organization officers can add users to the organization.'
            ], 403);
        }

        $user = User::where('id', $id)
            ->where('organization_id', $request->user()->organization_id)
            ->firstOrFail();

        $user->update([
            'organization_member' => true,
            'is_officer' => $request->is_officer ?? true,
            'can_scan' => $request->can_scan ?? true
        ]);

        return response()->json([
            'message' => 'User added to organization successfully',
            'user' => $user->fresh()
        ]);
    }

    public function removeFromOrganization(Request $request, $id): JsonResponse
    {
        // Only officers can remove users from organization
        if (!$request->user()->is_officer) {
            return response()->json([
                'error' => 'Only organization officers can remove users from the organization.'
            ], 403);
        }

        $user = User::where('id', $id)
            ->where('organization_id', $request->user()->organization_id)
            ->firstOrFail();

        // Prevent users from removing themselves
        if ($user->id === $request->user()->id) {
            return response()->json([
                'error' => 'You cannot remove yourself from the organization.'
            ], 422);
        }

        $user->update([
            'organization_member' => false,
            'can_scan' => false
        ]);

        return response()->json([
            'message' => 'User removed from organization successfully',
            'user' => $user->fresh()
        ]);
    }

    public function updateScanPermission(Request $request, $id): JsonResponse
    {
        // Only officers can update scan permissions
        if (!$request->user()->is_officer) {
            return response()->json([
                'error' => 'Only organization officers can update scan permissions.'
            ], 403);
        }

        $user = User::where('id', $id)
            ->where('organization_id', $request->user()->organization_id)
            ->where('organization_member', true)
            ->firstOrFail();

        $validator = Validator::make($request->all(), [
            'can_scan' => 'required|boolean'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user->update(['can_scan' => $request->can_scan]);

        return response()->json([
            'message' => 'Scan permission updated successfully',
            'user' => $user->fresh()
        ]);
    }

    public function getCurrentUser(Request $request): JsonResponse
    {
        $user = $request->user()->load('organization');
        
        return response()->json([
            'user' => $user,
            'permissions' => [
                'is_admin' => $user->isAdmin(),
                'can_scan' => $user->canScanQR(),
                'is_organization_member' => $user->organization_member
            ]
        ]);
    }

    // Helper method to generate QR code
    private function generateQRCode(User $user, string $qrCode): void
    {
        $qrData = $user->generateQRData();
        $qrCodePath = storage_path("app/public/qrcodes/{$qrCode}.svg");
        
        // Ensure directory exists
        if (!file_exists(dirname($qrCodePath))) {
            mkdir(dirname($qrCodePath), 0755, true);
        }
        
        QrCode::size(200)->generate($qrData, $qrCodePath);
    }

    // Get users with scanning privileges
    public function getScanners(Request $request): JsonResponse
    {
        $scanners = User::where('organization_id', $request->user()->organization_id)
            ->where('can_scan', true)
            ->where('organization_member', true)
            ->select('id', 'student_id', 'first_name', 'last_name', 'email')
            ->orderBy('first_name')
            ->get();

        return response()->json([
            'scanners' => $scanners,
            'total_scanners' => $scanners->count()
        ]);
    }
}