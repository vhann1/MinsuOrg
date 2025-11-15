<?php

namespace App\Http\Controllers;

use App\Models\FinancialLedger;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class FinancialController extends Controller
{
    public function getStudentLedger(Request $request, $userId): JsonResponse
    {
        $user = User::where('id', $userId)
            ->where('organization_id', $request->user()->organization_id)
            ->firstOrFail();

        $ledger = FinancialLedger::where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        $currentBalance = $ledger->first()->balance_after ?? 0;

        return response()->json([
            'user' => [
                'id' => $user->id,
                'student_id' => $user->student_id,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'email' => $user->email
            ],
            'ledger' => $ledger,
            'current_balance' => $currentBalance,
            'is_cleared' => $currentBalance <= 0,
            'total_entries' => $ledger->count()
        ]);
    }

    public function makePayment(Request $request): JsonResponse
    {
        // Only officers can record payments
        if (!$request->user()->is_officer) {
            return response()->json([
                'error' => 'Only organization officers can record payments.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'amount' => 'required|numeric|min:0.01|max:100000',
            'description' => 'nullable|string|max:500',
            'payment_date' => 'required|date'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        return DB::transaction(function () use ($request) {
            $user = User::where('id', $request->user_id)
                ->where('organization_id', $request->user()->organization_id)
                ->firstOrFail();

            $lastEntry = $user->financialLedgers()->latest()->first();
            $lastBalance = $lastEntry ? $lastEntry->balance_after : 0;
            
            if ($request->amount > $lastBalance) {
                return response()->json([
                    'error' => 'Payment amount (₱' . number_format($request->amount, 2) . ') exceeds current balance (₱' . number_format($lastBalance, 2) . ')'
                ], 400);
            }

            $newBalance = $lastBalance - $request->amount;

            $payment = FinancialLedger::create([
                'user_id' => $request->user_id,
                'type' => 'payment',
                'amount' => $request->amount,
                'description' => $request->description ?? 'Payment received',
                'balance_before' => $lastBalance,
                'balance_after' => $newBalance,
                'recorded_at' => $request->payment_date,
                'cleared' => $newBalance <= 0
            ]);

            return response()->json([
                'message' => 'Payment recorded successfully',
                'payment' => $payment,
                'new_balance' => $newBalance,
                'is_cleared' => $newBalance <= 0
            ]);
        });
    }

    public function getOrganizationFinancials(Request $request): JsonResponse
    {
        $organizationId = $request->user()->organization_id;
        
        // Get all organization members with their latest balance
        $financials = User::where('organization_id', $organizationId)
            ->where('organization_member', true)
            ->with(['financialLedgers' => function($query) {
                $query->orderBy('created_at', 'desc')->orderBy('id', 'desc');
            }])
            ->get()
            ->map(function($user) {
                $currentBalance = $user->financialLedgers->first()->balance_after ?? 0;
                
                return [
                    'id' => $user->id,
                    'student_id' => $user->student_id,
                    'first_name' => $user->first_name,
                    'last_name' => $user->last_name,
                    'email' => $user->email,
                    'is_officer' => $user->is_officer,
                    'current_balance' => $currentBalance,
                    'is_cleared' => $currentBalance <= 0,
                    'ledger_entries_count' => $user->financialLedgers->count(),
                    'last_transaction_date' => $user->financialLedgers->first()->created_at ?? null
                ];
            })
            ->sortByDesc('current_balance') // Sort by highest balance first
            ->values();

        // Calculate organization financial summary
        $summary = [
            'total_members' => $financials->count(),
            'total_balance' => $financials->sum('current_balance'),
            'members_with_balance' => $financials->where('current_balance', '>', 0)->count(),
            'cleared_members' => $financials->where('is_cleared', true)->count(),
            'total_pending' => $financials->where('current_balance', '>', 0)->sum('current_balance')
        ];

        return response()->json([
            'ledgers' => $financials,
            'summary' => $summary
        ]);
    }

    public function addManualEntry(Request $request): JsonResponse
    {
        // Only officers can add manual entries
        if (!$request->user()->is_officer) {
            return response()->json([
                'error' => 'Only organization officers can add manual ledger entries.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'type' => 'required|in:fine,payment,due,adjustment',
            'amount' => 'required|numeric|min:0.01|max:100000',
            'description' => 'required|string|max:500',
            'entry_date' => 'required|date'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        return DB::transaction(function () use ($request) {
            $user = User::where('id', $request->user_id)
                ->where('organization_id', $request->user()->organization_id)
                ->firstOrFail();

            $lastEntry = $user->financialLedgers()->latest()->first();
            $lastBalance = $lastEntry ? $lastEntry->balance_after : 0;
            
            // Calculate new balance based on entry type
            if ($request->type === 'payment') {
                $newBalance = $lastBalance - $request->amount;
            } else {
                $newBalance = $lastBalance + $request->amount;
            }

            $entry = FinancialLedger::create([
                'user_id' => $request->user_id,
                'type' => $request->type,
                'amount' => $request->amount,
                'description' => $request->description,
                'balance_before' => $lastBalance,
                'balance_after' => $newBalance,
                'recorded_at' => $request->entry_date,
                'cleared' => $newBalance <= 0
            ]);

            return response()->json([
                'message' => 'Manual entry added successfully',
                'entry' => $entry,
                'new_balance' => $newBalance,
                'is_cleared' => $newBalance <= 0
            ], 201);
        });
    }

    public function getMemberLedger(Request $request, $userId): JsonResponse
    {
        $user = User::where('id', $userId)
            ->where('organization_id', $request->user()->organization_id)
            ->firstOrFail();

        // Check if requester is officer or the user themselves
        if (!$request->user()->is_officer && $request->user()->id != $userId) {
            return response()->json([
                'error' => 'You can only view your own ledger.'
            ], 403);
        }

        $ledger = FinancialLedger::where('user_id', $userId)
            ->orderBy('recorded_at', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        $currentBalance = $ledger->first()->balance_after ?? 0;

        return response()->json([
            'user' => [
                'id' => $user->id,
                'student_id' => $user->student_id,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name
            ],
            'ledger' => $ledger,
            'current_balance' => $currentBalance,
            'is_cleared' => $currentBalance <= 0,
            'summary' => [
                'total_entries' => $ledger->count(),
                'total_fines' => $ledger->where('type', 'fine')->sum('amount'),
                'total_payments' => $ledger->where('type', 'payment')->sum('amount'),
                'last_transaction' => $ledger->first()->created_at ?? null
            ]
        ]);
    }

    public function getFinancialOverview(Request $request): JsonResponse
    {
        $organizationId = $request->user()->organization_id;

        $overview = [
            'total_balance' => FinancialLedger::whereHas('user', function($query) use ($organizationId) {
                $query->where('organization_id', $organizationId);
            })->latest()->first()->balance_after ?? 0,

            'pending_payments' => User::where('organization_id', $organizationId)
                ->where('organization_member', true)
                ->with(['financialLedgers' => function($query) {
                    $query->orderBy('created_at', 'desc');
                }])
                ->get()
                ->filter(function($user) {
                    $balance = $user->financialLedgers->first()->balance_after ?? 0;
                    return $balance > 0;
                })
                ->count(),

            'recent_transactions' => FinancialLedger::whereHas('user', function($query) use ($organizationId) {
                $query->where('organization_id', $organizationId);
            })
            ->with('user:id,first_name,last_name')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get(),

            'top_balances' => User::where('organization_id', $organizationId)
                ->where('organization_member', true)
                ->with(['financialLedgers' => function($query) {
                    $query->orderBy('created_at', 'desc');
                }])
                ->get()
                ->map(function($user) {
                    $balance = $user->financialLedgers->first()->balance_after ?? 0;
                    return [
                        'user' => $user->only(['id', 'first_name', 'last_name', 'student_id']),
                        'balance' => $balance
                    ];
                })
                ->where('balance', '>', 0)
                ->sortByDesc('balance')
                ->take(5)
                ->values()
        ];

        return response()->json($overview);
    }

    public function applyAbsenceFine(Request $request): JsonResponse
    {
        // Only officers can apply fines
        if (!$request->user()->is_officer) {
            return response()->json([
                'error' => 'Only organization officers can apply absence fines.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'event_name' => 'required|string|max:255',
            'fine_amount' => 'required|numeric|min:0|max:10000'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        return DB::transaction(function () use ($request) {
            $user = User::where('id', $request->user_id)
                ->where('organization_id', $request->user()->organization_id)
                ->firstOrFail();

            $lastEntry = $user->financialLedgers()->latest()->first();
            $lastBalance = $lastEntry ? $lastEntry->balance_after : 0;
            $newBalance = $lastBalance + $request->fine_amount;

            $fine = FinancialLedger::create([
                'user_id' => $request->user_id,
                'type' => 'fine',
                'amount' => $request->fine_amount,
                'description' => "Absence fine - {$request->event_name}",
                'balance_before' => $lastBalance,
                'balance_after' => $newBalance,
                'recorded_at' => now(),
                'cleared' => false
            ]);

            return response()->json([
                'message' => 'Absence fine applied successfully',
                'fine' => $fine,
                'new_balance' => $newBalance
            ], 201);
        });
    }
}