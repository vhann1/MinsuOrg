<?php
// app/Http/Controllers/OrganizationController.php
namespace App\Http\Controllers;

use App\Models\Organization;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class OrganizationController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $organization = $request->user()->organization;
        
        return response()->json([
            'organization' => $organization->loadCount(['users', 'events', 'users as officers_count' => function($q) {
                $q->where('is_officer', true);
            }])
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $organization = $request->user()->organization;

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'attendance_fine' => 'sometimes|required|numeric|min:0|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $organization->update($request->only(['name', 'attendance_fine']));

        return response()->json([
            'message' => 'Organization updated successfully',
            'organization' => $organization->fresh()->loadCount(['users', 'events', 'users as officers_count' => function($q) {
                $q->where('is_officer', true);
            }])
        ]);
    }
}